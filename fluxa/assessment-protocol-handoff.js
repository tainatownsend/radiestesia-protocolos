import { requirePreparedSessionState } from './session-rules.js';

export const ORIENTING_ASSESSMENT_AREAS = Object.freeze([
  Object.freeze({ id:'finance', label:'Financeiro e prosperidade', protocolNames:['Vida Financeira','Prosperidade e Abundância'] }),
  Object.freeze({ id:'career', label:'Carreira e direção profissional', protocolNames:['Carreira / Profissional','Propósito e Caminho de Vida'] }),
  Object.freeze({ id:'relationship', label:'Relacionamento afetivo', protocolNames:['Casamento / Relacionamento'] }),
  Object.freeze({ id:'family', label:'Família e ancestralidade', protocolNames:['Relacionamentos Familiares'] }),
  Object.freeze({ id:'selfworth', label:'Autoestima e merecimento', protocolNames:['Autoestima, Amor-próprio e Merecimento'] }),
  Object.freeze({ id:'home', label:'Casa e ambiente', protocolNames:['Casa e Ambiente'] }),
  Object.freeze({ id:'body', label:'Relação com o corpo', protocolNames:['Relacionamento com o Próprio Corpo'] }),
  Object.freeze({ id:'purpose', label:'Propósito e caminho', protocolNames:['Propósito e Caminho de Vida'] }),
  Object.freeze({ id:'creativity', label:'Criatividade e projetos', protocolNames:['Criatividade e Projetos'] }),
  Object.freeze({ id:'social', label:'Vida social e pertencimento', protocolNames:['Vida Social e Pertencimento'] }),
  Object.freeze({ id:'parenting', label:'Parentalidade', protocolNames:['Parentalidade'] }),
  Object.freeze({ id:'patterns', label:'Padrões repetitivos', protocolNames:['Padrões Repetitivos','Protocolo Mestre de Causa Raiz'] }),
  Object.freeze({ id:'unclear', label:'Ainda não está claro', protocolNames:['Protocolo Mestre de Causa Raiz'] })
]);

const areaById = new Map(ORIENTING_ASSESSMENT_AREAS.map((area) => [area.id, area]));

export function suggestProtocolsForAreas(areaIds = [], catalog = [], limit = 3) {
  const selected = [...new Set(areaIds)].map((id) => areaById.get(id)).filter(Boolean);
  const names = [];
  if (!selected.length || selected.some((area) => area.id === 'unclear')) names.push('Protocolo Mestre de Causa Raiz');
  for (const area of selected.filter((item) => item.id !== 'unclear')) {
    for (const name of area.protocolNames) if (!names.includes(name)) names.push(name);
  }
  if (!names.length) names.push('Protocolo Mestre de Causa Raiz');
  const byName = new Map(catalog.map((protocol) => [protocol.name, protocol]));
  return names.map((name) => byName.get(name)).filter(Boolean).slice(0, Math.max(1, Number(limit) || 3)).map((protocol) => ({
    protocolId: protocol.id,
    protocolName: protocol.name,
    category: protocol.category || 'Investigação',
    reason: selected.find((area) => area.protocolNames.includes(protocol.name))?.label || 'Tema ainda não delimitado'
  }));
}

function addEvent(store, draft, input) {
  draft.events.push({
    id: store.makeId('evt'), eventType: input.eventType, entityType: input.entityType, entityId: input.entityId,
    sessionId: input.sessionId || null, assistedEntityId: input.assistedEntityId || null,
    occurredAt: store.nowIso(), createdAt: store.nowIso(), metadata: input.metadata || {}
  });
}

export function recordOrientingAssessment(store, input, catalog = []) {
  const state = store.getState();
  const session = requirePreparedSessionState(state, input.sessionId, 'Conclua a preparação da sessão antes de registrar a avaliação orientadora.');
  if (!session.currentAssistedEntityId) throw new Error('Escolha o Assistido antes de fazer a avaliação orientadora.');
  if (input.assistedEntityId && input.assistedEntityId !== session.currentAssistedEntityId) throw new Error('A avaliação deve pertencer ao Assistido atual da sessão.');
  const sourceAssessment = input.sourceAssessmentId ? (state.assessments || []).find((item) => item.id === input.sourceAssessmentId && item.sessionId === session.id && item.assistedEntityId === session.currentAssistedEntityId) : null;
  if (input.sourceAssessmentId && !sourceAssessment) throw new Error('A avaliação de origem não pertence ao atendimento atual.');
  const focusAreas = [...new Set((input.focusAreas || []).filter((id) => areaById.has(id)))];
  if (!focusAreas.length) throw new Error('Selecione pelo menos uma área ou marque que o tema ainda não está claro.');
  const focusAreaLabels = focusAreas.map((id) => areaById.get(id)?.label).filter(Boolean);
  const suggestions = suggestProtocolsForAreas(focusAreas, catalog, 3);
  if (!suggestions.length) throw new Error('A biblioteca terapêutica ainda não está disponível. Tente novamente em instantes.');
  const now = store.nowIso();
  const assessment = {
    id: store.makeId('assess'), kind:'ORIENTING', subject:'Avaliação orientadora', status:'COMPLETED',
    sessionId: session.id, assistedEntityId: session.currentAssistedEntityId,
    sourceAssessmentId: sourceAssessment?.id || null, focusAreas, focusAreaLabels,
    result: focusAreaLabels.join(', '), notes: String(input.notes || '').trim() || null,
    protocolSuggestions: structuredClone(suggestions),
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null, occurredAt:now, createdAt:now, updatedAt:now
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    if (!Array.isArray(draft.assessments)) draft.assessments = [];
    draft.assessments.push(assessment);
    if (assessment.sourceAssessmentId) {
      const source = draft.assessments.find((item) => item.id === assessment.sourceAssessmentId);
      if (source) { source.followUpAssessmentId = assessment.id; source.updatedAt = now; }
    }
    addEvent(store, draft, {
      eventType:'ORIENTING_ASSESSMENT_RECORDED', entityType:'Assessment', entityId:assessment.id,
      sessionId:assessment.sessionId, assistedEntityId:assessment.assistedEntityId,
      metadata:{ sourceAssessmentId:assessment.sourceAssessmentId, focusAreas:[...focusAreas], focusAreaLabels:[...focusAreaLabels], suggestedProtocolIds:suggestions.map((item) => item.protocolId) }
    });
    return draft;
  });
  return assessment;
}

export function linkOrientingAssessmentToProtocol(store, assessmentId, input) {
  let updated = null;
  store.setState((current) => {
    const draft = structuredClone(current);
    const assessment = (draft.assessments || []).find((item) => item.id === assessmentId && item.kind === 'ORIENTING');
    if (!assessment) return draft;
    assessment.selectedProtocolId = input.protocolId || null;
    assessment.selectedProtocolName = input.protocolName || null;
    assessment.linkedInvestigationId = input.investigationId || null;
    assessment.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType:'ASSESSMENT_PROTOCOL_SELECTED', entityType:'Assessment', entityId:assessment.id,
      sessionId:assessment.sessionId, assistedEntityId:assessment.assistedEntityId,
      metadata:{ protocolId:assessment.selectedProtocolId, protocolName:assessment.selectedProtocolName, investigationId:assessment.linkedInvestigationId }
    });
    updated = assessment;
    return draft;
  });
  return updated;
}
