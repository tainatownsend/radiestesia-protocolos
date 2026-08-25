import { EventType } from './domain.js';
import { requirePreparedSessionState } from './session-rules.js';
import { requireHawkinsBaseline } from './hawkins-measurement.js';

function addEvent(store, draft, input) {
  draft.events.push({
    id: store.makeId('evt'), eventType: input.eventType, entityType: input.entityType, entityId: input.entityId,
    sessionId: input.sessionId || null, assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(), createdAt: store.nowIso(), metadata: input.metadata || {}
  });
}

function requireInvestigationAssistedContext(session, assistedEntityId, actionLabel, allowEmpty = false) {
  if (!session.currentAssistedEntityId) {
    if (allowEmpty) return session;
    throw new Error(`Selecione o Assistido da investigação antes de ${actionLabel}.`);
  }
  if (session.currentAssistedEntityId !== assistedEntityId) {
    throw new Error(`O Assistido atual não corresponde à investigação que você tentou ${actionLabel}.`);
  }
  return session;
}

export const PROTOCOL_LIBRARY = Object.freeze([
  Object.freeze({
    id: 'investigacao_inicial', versionId: 'investigacao_inicial_v1', version: 1, name: 'Investigação inicial', category: 'Investigação',
    description: 'Mapeia prioridade e direção antes de aprofundar.', startNodeId: 'q1',
    nodes: Object.freeze({
      q1: { id:'q1', type:'QUESTION', text:'Existe um tema prioritário para investigar agora?', yes:'q2', no:'end_clear' },
      q2: { id:'q2', type:'QUESTION', text:'É apropriado aprofundar a origem deste tema nesta sessão?', yes:'q3', no:'end_treat' },
      q3: { id:'q3', type:'QUESTION', text:'Há um fator principal sustentando o desequilíbrio?', yes:'end_find', no:'end_expand' },
      end_clear: { id:'end_clear', type:'END', title:'Sem prioridade identificada', summary:'Nenhum tema prioritário foi identificado neste momento.' },
      end_treat: { id:'end_treat', type:'END', title:'Seguir sem aprofundar', summary:'O tema pode seguir para tratamento ou registro sem aprofundamento nesta investigação.' },
      end_find: { id:'end_find', type:'END', title:'Fator principal identificado', summary:'Revise as respostas positivas e confirme somente os achados relevantes.' },
      end_expand: { id:'end_expand', type:'END', title:'Aprofundamento indicado', summary:'Considere uma investigação de causa raiz para ampliar a busca.' }
    })
  }),
  Object.freeze({
    id: 'investigacao_completa', versionId: 'investigacao_completa_v1', version: 1, name: 'Investigação completa', category: 'Investigação ampliada',
    description: 'Percorre prioridade, origem, manutenção, contexto e necessidade de aprofundamento.', startNodeId: 'q1',
    nodes: Object.freeze({
      q1: { id:'q1', type:'QUESTION', text:'Existe um tema prioritário adequado para uma investigação completa agora?', yes:'q2', no:'end_none' },
      q2: { id:'q2', type:'QUESTION', text:'A origem principal deste tema está acessível nesta sessão?', yes:'q3', no:'q6' },
      q3: { id:'q3', type:'QUESTION', text:'Existe um fator interno relevante relacionado à origem?', yes:'q4', no:'q5' },
      q4: { id:'q4', type:'QUESTION', text:'Esse fator interno atua como mantenedor do desequilíbrio atual?', yes:'q6', no:'q5' },
      q5: { id:'q5', type:'QUESTION', text:'Existe um fator externo, relacional, ambiental ou contextual relevante?', yes:'q6', no:'q7' },
      q6: { id:'q6', type:'QUESTION', text:'Há alguma consequência importante que também precisa ser considerada no tratamento?', yes:'q7', no:'q7' },
      q7: { id:'q7', type:'QUESTION', text:'Existe outro fator relevante associado que ainda precisa ser investigado?', yes:'q8', no:'end_consolidate' },
      q8: { id:'q8', type:'QUESTION', text:'É indicado aprofundar este tema com um protocolo específico ou causa raiz?', yes:'end_deepen', no:'end_consolidate' },
      end_none: { id:'end_none', type:'END', title:'Sem investigação completa indicada', summary:'Não foi identificada prioridade adequada para este nível de investigação agora.' },
      end_deepen: { id:'end_deepen', type:'END', title:'Aprofundamento adicional indicado', summary:'Revise os achados desta etapa e siga para um protocolo mais específico somente se necessário.' },
      end_consolidate: { id:'end_consolidate', type:'END', title:'Mapa pronto para consolidação', summary:'Revise as respostas positivas, classifique os achados e decida o que realmente deve orientar o tratamento.' }
    })
  }),
  Object.freeze({
    id: 'protocolo_especifico', versionId: 'protocolo_especifico_v1', version: 1, name: 'Protocolo específico', category: 'Aprofundamento específico',
    description: 'Estrutura neutra para registrar um aprofundamento específico sem editar protocolos no MVP.', startNodeId: 'q1',
    nodes: Object.freeze({
      q1: { id:'q1', type:'QUESTION', text:'Existe indicação para aplicar um protocolo específico a este tema agora?', yes:'q2', no:'end_not_indicated' },
      q2: { id:'q2', type:'QUESTION', text:'O foco específico está suficientemente definido para seguir?', yes:'q3', no:'end_define_focus' },
      q3: { id:'q3', type:'QUESTION', text:'Há algum achado relevante neste protocolo que deve orientar o tratamento?', yes:'end_findings', no:'end_without_finding' },
      end_not_indicated: { id:'end_not_indicated', type:'END', title:'Protocolo específico não indicado', summary:'Não há indicação para este aprofundamento específico neste momento.' },
      end_define_focus: { id:'end_define_focus', type:'END', title:'Definir melhor o foco', summary:'O aprofundamento específico deve aguardar até que o foco esteja suficientemente claro.' },
      end_findings: { id:'end_findings', type:'END', title:'Achados específicos a consolidar', summary:'Revise e classifique somente os achados que realmente devem orientar o tratamento.' },
      end_without_finding: { id:'end_without_finding', type:'END', title:'Protocolo concluído sem novo achado', summary:'A execução foi concluída sem necessidade de registrar um novo achado.' }
    })
  }),
  Object.freeze({
    id: 'causa_raiz', versionId: 'causa_raiz_v1', version: 1, name: 'Causa raiz', category: 'Investigação profunda',
    description: 'Aprofunda a origem sem transformar toda resposta positiva em causa.', startNodeId: 'q1',
    nodes: Object.freeze({
      q1: { id:'q1', type:'QUESTION', text:'Existe uma causa raiz prioritária acessível para investigação agora?', yes:'q2', no:'end_none' },
      q2: { id:'q2', type:'QUESTION', text:'Essa origem é predominantemente interna ao assistido?', yes:'q3', no:'q4' },
      q3: { id:'q3', type:'QUESTION', text:'Há uma crença, padrão ou memória relevante sustentando o tema?', yes:'end_internal', no:'q5' },
      q4: { id:'q4', type:'QUESTION', text:'Há um fator relacional, ambiental ou contextual relevante?', yes:'end_external', no:'q5' },
      q5: { id:'q5', type:'QUESTION', text:'É necessário aprofundar por outro protocolo específico?', yes:'end_specific', no:'end_factor' },
      end_none: { id:'end_none', type:'END', title:'Sem causa raiz acessível', summary:'Não foi indicada uma causa raiz acessível neste momento.' },
      end_internal: { id:'end_internal', type:'END', title:'Fator interno relevante', summary:'Classifique o resultado como causa, mantenedor, associação ou fator relevante antes de tratar.' },
      end_external: { id:'end_external', type:'END', title:'Fator contextual relevante', summary:'Revise o contexto identificado antes de definir tratamento.' },
      end_specific: { id:'end_specific', type:'END', title:'Protocolo específico indicado', summary:'A investigação aponta para um aprofundamento específico.' },
      end_factor: { id:'end_factor', type:'END', title:'Fator relevante identificado', summary:'Registre o que foi encontrado sem forçar a classificação como causa.' }
    })
  })
]);

export function protocolById(protocolId) {
  return PROTOCOL_LIBRARY.find((item) => item.id === protocolId) || null;
}

export function currentProtocolNode(investigation) {
  return investigation?.protocolSnapshot?.nodes?.[investigation.currentNodeId] || null;
}

export function startBranchingInvestigation(store, sessionId, assistedEntityId, protocolId) {
  const state = store.getState();
  const session = requirePreparedSessionState(state, sessionId, 'Conclua a preparação da sessão antes de iniciar uma investigação.');
  const assisted = state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Selecione um assistido válido.');
  requireInvestigationAssistedContext(session, assistedEntityId, 'iniciar', true);
  requireHawkinsBaseline(state, { sessionId, assistedEntityId });
  const protocol = protocolById(protocolId);
  if (!protocol) throw new Error('Protocolo não encontrado.');
  const investigation = {
    id: store.makeId('inv'), kind:'BRANCHING', originSessionId:sessionId, currentSessionId:sessionId, assistedEntityId,
    protocolId:protocol.id, protocolVersionId:protocol.versionId, protocolSnapshot:structuredClone(protocol),
    status:'IN_PROGRESS', currentNodeId:protocol.startNodeId, answers:[], path:[protocol.startNodeId], startedAt:store.nowIso(), completedAt:null, endNodeId:null, updatedAt:store.nowIso()
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.investigations.push(investigation);
    const activeSession = draft.sessions.find((item) => item.id === session.id);
    if (activeSession) activeSession.currentAssistedEntityId = assistedEntityId;
    addEvent(store, draft, { eventType:EventType.INVESTIGATION_STARTED, entityType:'Investigation', entityId:investigation.id,
      sessionId, assistedEntityId, metadata:{ protocolName:protocol.name, protocolVersionId:protocol.versionId, branching:true } });
    return draft;
  });
  return investigation;
}

export function answerBranchingInvestigation(store, investigationId, answer) {
  if (!['YES','NO'].includes(answer)) throw new Error('Resposta inválida.');
  store.setState((state) => {
    const draft = structuredClone(state);
    const investigation = draft.investigations.find((item) => item.id === investigationId && item.kind === 'BRANCHING' && item.status === 'IN_PROGRESS');
    if (!investigation) return draft;
    const session = requirePreparedSessionState(draft, investigation.currentSessionId, 'Conclua a preparação da sessão antes de continuar a investigação.');
    requireInvestigationAssistedContext(session, investigation.assistedEntityId, 'responder');
    requireHawkinsBaseline(draft, { sessionId:investigation.currentSessionId, assistedEntityId:investigation.assistedEntityId });
    const node = currentProtocolNode(investigation);
    if (!node || node.type !== 'QUESTION') return draft;
    const nextId = answer === 'YES' ? node.yes : node.no;
    const existing = investigation.answers.find((item) => item.nodeId === node.id);
    const payload = { nodeId:node.id, questionTextSnapshot:node.text, answer, answeredAt:store.nowIso() };
    if (existing) Object.assign(existing, payload); else investigation.answers.push(payload);
    investigation.currentNodeId = nextId;
    investigation.path.push(nextId);
    const next = currentProtocolNode(investigation);
    if (!next) throw new Error('O protocolo contém um caminho inválido.');
    if (next.type === 'END') {
      investigation.status = 'COMPLETED';
      investigation.completedAt = store.nowIso();
      investigation.endNodeId = next.id;
      addEvent(store, draft, { eventType:EventType.INVESTIGATION_COMPLETED, entityType:'Investigation', entityId:investigation.id,
        sessionId:investigation.currentSessionId, assistedEntityId:investigation.assistedEntityId,
        metadata:{ protocolName:investigation.protocolSnapshot.name, endTitle:next.title, branching:true } });
    }
    investigation.updatedAt = store.nowIso();
    return draft;
  });
}

export function resumeBranchingInvestigation(store, investigationId, sessionId) {
  const state = store.getState();
  const session = requirePreparedSessionState(state, sessionId, 'Conclua a preparação da sessão antes de retomar a investigação.');
  const investigation = state.investigations.find((item) => item.id === investigationId && item.kind === 'BRANCHING' && item.status === 'IN_PROGRESS');
  if (!investigation) throw new Error('Investigação não disponível para retomada.');
  requireInvestigationAssistedContext(session, investigation.assistedEntityId, 'retomar', true);
  const baseline = requireHawkinsBaseline(state, { sessionId, assistedEntityId:investigation.assistedEntityId });
  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.investigations.find((item) => item.id === investigationId);
    if (target.currentSessionId !== sessionId) {
      target.currentSessionId = sessionId;
      target.updatedAt = store.nowIso();
      addEvent(store, draft, { eventType:EventType.INVESTIGATION_RESUMED, entityType:'Investigation', entityId:target.id,
        sessionId, assistedEntityId:target.assistedEntityId, metadata:{ originSessionId:target.originSessionId, branching:true,
          hawkinsBaselineAssessmentId:baseline.id, hawkinsBaselineHertz:baseline.hertz } });
    }
    const activeSession = draft.sessions.find((item) => item.id === sessionId);
    if (activeSession) activeSession.currentAssistedEntityId = target.assistedEntityId;
    return draft;
  });
}

export function confirmBranchingFindings(store, investigationId, nodeIds, classification = 'FACTOR_RELEVANT') {
  const allowed = new Set(['CAUSE','MAINTAINER','CONSEQUENCE','ASSOCIATION','FACTOR_RELEVANT','DEEPEN']);
  if (!allowed.has(classification)) throw new Error('Classificação de achado inválida.');
  const created = [];
  store.setState((state) => {
    const draft = structuredClone(state);
    const investigation = draft.investigations.find((item) => item.id === investigationId && item.kind === 'BRANCHING' && item.status === 'COMPLETED');
    if (!investigation) return draft;
    const session = requirePreparedSessionState(draft, investigation.currentSessionId, 'Conclua a preparação da sessão antes de consolidar achados.');
    requireInvestigationAssistedContext(session, investigation.assistedEntityId, 'consolidar os achados');
    for (const nodeId of nodeIds) {
      const answer = investigation.answers.find((item) => item.nodeId === nodeId && item.answer === 'YES');
      if (!answer) continue;
      const duplicate = draft.findings.find((item) => item.investigationId === investigationId && item.sourceQuestionId === nodeId && item.status !== 'DISMISSED');
      if (duplicate) { created.push(duplicate); continue; }
      const finding = {
        id:store.makeId('find'), assistedEntityId:investigation.assistedEntityId, investigationId,
        sourceQuestionId:nodeId, classification, title:answer.questionTextSnapshot, status:'IDENTIFIED', createdAt:store.nowIso()
      };
      draft.findings.push(finding);
      created.push(finding);
      addEvent(store, draft, { eventType:EventType.FINDING_IDENTIFIED, entityType:'Finding', entityId:finding.id,
        sessionId:investigation.currentSessionId, assistedEntityId:investigation.assistedEntityId,
        metadata:{ title:finding.title, classification } });
    }
    return draft;
  });
  return created;
}
