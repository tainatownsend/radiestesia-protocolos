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

function protocolNameKey(value='') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[-‐‑‒–—−/]+/g,' ')
    .replace(/[.,;:()[\]{}]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function usableProtocolId(value) {
  if (typeof value === 'string') return value.trim() !== '';
  return typeof value === 'number' && Number.isFinite(value);
}

function orderedSuggestionNames(selected) {
  if (!selected.length || selected.some((area) => area.id === 'unclear')) return ['Protocolo Mestre de Causa Raiz'];
  const names = [];
  if (selected.length <= 2) {
    for (const area of selected) for (const name of area.protocolNames) if (!names.includes(name)) names.push(name);
    return names.length ? names : ['Protocolo Mestre de Causa Raiz'];
  }
  const maxDepth = Math.max(0, ...selected.map((area) => area.protocolNames.length));
  for (let depth = 0; depth < maxDepth; depth += 1) {
    for (const area of selected) {
      const name = area.protocolNames[depth];
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names.length ? names : ['Protocolo Mestre de Causa Raiz'];
}

export function suggestProtocolsForAreas(areaIds = [], catalog = [], limit = 3) {
  const safeAreaIds = Array.isArray(areaIds) ? areaIds : [];
  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const selected = [...new Set(safeAreaIds)].map((id) => areaById.get(id)).filter(Boolean);
  const names = orderedSuggestionNames(selected);
  const byName = new Map();
  for (const protocol of safeCatalog) {
    const key = protocolNameKey(protocol?.name);
    if (!usableProtocolId(protocol?.id) || !key || byName.has(key)) continue;
    byName.set(key, protocol);
  }
  return names.map((name) => byName.get(protocolNameKey(name))).filter(Boolean).slice(0, Math.max(1, Number(limit) || 3)).map((protocol) => ({
    protocolId: protocol.id,
    protocolName: protocol.name,
    category: protocol.category || 'Investigação',
    reason: selected.find((area) => area.protocolNames.some((name) => protocolNameKey(name) === protocolNameKey(protocol.name)))?.label || 'Tema ainda não delimitado'
  }));
}

function addEvent(store, draft, input) {
  if (!Array.isArray(draft.events)) draft.events = [];
  draft.events.push({
    id: store.makeId('evt'), eventType: input.eventType, entityType: input.entityType, entityId: input.entityId,
    sessionId: input.sessionId || null, assistedEntityId: input.assistedEntityId || null,
    occurredAt: store.nowIso(), createdAt: store.nowIso(), metadata: input.metadata || {}
  });
}

export function recordOrientingAssessment(store, input, catalog = []) {
  const state = store.getState();
  const safeInput = input && typeof input === 'object' ? input : {};
  const session = requirePreparedSessionState(state, safeInput.sessionId, 'Conclua a preparação da sessão antes de registrar a avaliação orientadora.');
  if (!session.currentAssistedEntityId) throw new Error('Escolha o Assistido antes de fazer a avaliação orientadora.');
  if (safeInput.assistedEntityId && safeInput.assistedEntityId !== session.currentAssistedEntityId) throw new Error('A avaliação deve pertencer ao Assistido atual da sessão.');
  const assessments = Array.isArray(state?.assessments) ? state.assessments : [];
  const sourceAssessment = safeInput.sourceAssessmentId ? assessments.find((item) => item?.id === safeInput.sourceAssessmentId && item.sessionId === session.id && item.assistedEntityId === session.currentAssistedEntityId) : null;
  if (safeInput.sourceAssessmentId && !sourceAssessment) throw new Error('A avaliação de origem não pertence ao atendimento atual.');
  if (sourceAssessment?.followUpAssessmentId) throw new Error('Esta avaliação de origem já possui um próximo passo registrado.');
  const rawFocusAreas = Array.isArray(safeInput.focusAreas) ? safeInput.focusAreas : [];
  const focusAreas = [...new Set(rawFocusAreas.filter((id) => areaById.has(id)))];
  if (!focusAreas.length) throw new Error('Selecione pelo menos uma área ou marque que o tema ainda não está claro.');
  if (focusAreas.includes('unclear') && focusAreas.length > 1) throw new Error('“Ainda não está claro” deve ser usado sozinho, sem outras áreas selecionadas.');
  const focusAreaLabels = focusAreas.map((id) => areaById.get(id)?.label).filter(Boolean);
  const suggestionLimit = focusAreas.includes('unclear') ? 1 : Math.min(6, Math.max(3, focusAreas.length));
  const suggestions = suggestProtocolsForAreas(focusAreas, catalog, suggestionLimit);
  if (!suggestions.length) throw new Error('A biblioteca terapêutica ainda não está disponível. Tente novamente em instantes.');
  const now = store.nowIso();
  const assessment = {
    id: store.makeId('assess'), kind:'ORIENTING', subject:'Avaliação orientadora', status:'COMPLETED',
    sessionId: session.id, assistedEntityId: session.currentAssistedEntityId,
    sourceAssessmentId: sourceAssessment?.id || null, focusAreas, focusAreaLabels,
    result: focusAreaLabels.join(', '), notes: String(safeInput.notes || '').trim() || null,
    protocolSuggestions: structuredClone(suggestions),
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null, occurredAt:now, createdAt:now, updatedAt:now
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    if (!Array.isArray(draft.assessments)) draft.assessments = [];
    draft.assessments.push(assessment);
    if (assessment.sourceAssessmentId) {
      const source = draft.assessments.find((item) => item?.id === assessment.sourceAssessmentId);
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
  const state = store.getState();
  const safeInput = input && typeof input === 'object' ? input : {};
  const assessments = Array.isArray(state?.assessments) ? state.assessments : [];
  const assessment = assessments.find((item) => item?.id === assessmentId && item.kind === 'ORIENTING');
  if (!assessment) throw new Error('Avaliação orientadora não encontrada.');
  const session = requirePreparedSessionState(state, assessment.sessionId, 'Conclua a preparação da sessão antes de vincular a avaliação a um protocolo.');
  if (session.currentAssistedEntityId !== assessment.assistedEntityId) throw new Error('A avaliação deve permanecer vinculada ao Assistido atual da sessão.');

  const suggestions = Array.isArray(assessment.protocolSuggestions) ? assessment.protocolSuggestions : [];
  const suggestion = suggestions.find((item) => usableProtocolId(item?.protocolId) && item.protocolId === safeInput.protocolId);
  if (!suggestion) throw new Error('O protocolo selecionado não pertence às sugestões desta avaliação.');
  if (!safeInput.investigationId) throw new Error('Inicie ou retome a investigação antes de registrar o vínculo com a avaliação.');
  const investigations = Array.isArray(state?.investigations) ? state.investigations : [];
  const investigation = investigations.find((item) => item?.id === safeInput.investigationId);
  if (!investigation || investigation.kind !== 'ROOT_PROTOCOL') throw new Error('A investigação vinculada não é um protocolo terapêutico válido.');
  if (investigation.protocolId !== suggestion.protocolId) throw new Error('A investigação vinculada não corresponde ao protocolo selecionado.');
  if (investigation.assistedEntityId !== assessment.assistedEntityId) throw new Error('A investigação vinculada pertence a outro Assistido.');
  if (investigation.currentSessionId !== assessment.sessionId) throw new Error('A investigação vinculada não pertence à sessão atual da avaliação.');

  if (assessment.linkedInvestigationId) {
    if (assessment.linkedInvestigationId === investigation.id && assessment.selectedProtocolId === suggestion.protocolId) return assessment;
    throw new Error('Esta avaliação já está vinculada a outra investigação.');
  }

  let updated = null;
  store.setState((current) => {
    const draft = structuredClone(current);
    const draftAssessments = Array.isArray(draft?.assessments) ? draft.assessments : [];
    const target = draftAssessments.find((item) => item?.id === assessmentId && item.kind === 'ORIENTING');
    if (!target) return draft;
    target.selectedProtocolId = suggestion.protocolId;
    target.selectedProtocolName = suggestion.protocolName;
    target.linkedInvestigationId = investigation.id;
    target.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType:'ASSESSMENT_PROTOCOL_SELECTED', entityType:'Assessment', entityId:target.id,
      sessionId:target.sessionId, assistedEntityId:target.assistedEntityId,
      metadata:{ protocolId:target.selectedProtocolId, protocolName:target.selectedProtocolName, investigationId:target.linkedInvestigationId }
    });
    updated = target;
    return draft;
  });
  return updated;
}
