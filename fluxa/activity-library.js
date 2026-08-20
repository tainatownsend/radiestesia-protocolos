export const ToolType = Object.freeze({
  GRAPH: 'GRAPH',
  BIOMETER: 'BIOMETER',
  OTHER: 'OTHER'
});

export const ActivityLibraryEventType = Object.freeze({
  ASSESSMENT_RECORDED: 'ASSESSMENT_RECORDED',
  TOOL_CREATED: 'TOOL_CREATED',
  TOOL_ARCHIVED: 'TOOL_ARCHIVED'
});

function addEvent(store, draft, input) {
  const event = {
    id: store.makeId('evt'),
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionId: input.sessionId || null,
    assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(),
    createdAt: store.nowIso(),
    metadata: input.metadata || {}
  };
  draft.events.push(event);
  return event;
}

function requireOpenSession(state, sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Esta ação exige uma sessão aberta.');
  return session;
}

function requireAssisted(state, assistedEntityId) {
  const assisted = state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Selecione um assistido válido.');
  return assisted;
}

export function recordGeneralAssessment(store, input) {
  const state = store.getState();
  const session = requireOpenSession(state, input.sessionId);
  const assistedId = input.assistedEntityId || session.currentAssistedEntityId;
  requireAssisted(state, assistedId);

  const subject = input.subject?.trim();
  const result = input.result?.trim();
  if (!subject) throw new Error('Informe o que está sendo avaliado.');
  if (!result) throw new Error('Informe o resultado da avaliação.');

  const now = store.nowIso();
  const assessment = {
    id: store.makeId('assess'),
    kind: 'GENERAL',
    sessionId: session.id,
    assistedEntityId: assistedId,
    subject,
    result,
    scale: input.scale?.trim() || null,
    notes: input.notes?.trim() || null,
    occurredAt: input.occurredAt || now,
    createdAt: now,
    updatedAt: now
  };

  store.setState((current) => {
    const draft = structuredClone(current);
    draft.assessments.push(assessment);
    addEvent(store, draft, {
      eventType: ActivityLibraryEventType.ASSESSMENT_RECORDED,
      entityType: 'Assessment',
      entityId: assessment.id,
      sessionId: session.id,
      assistedEntityId: assistedId,
      occurredAt: assessment.occurredAt,
      metadata: { subject, result, scale: assessment.scale }
    });
    return draft;
  });
  return assessment;
}

export function createTool(store, input) {
  const name = input.name?.trim();
  if (!name) throw new Error('Nome do recurso é obrigatório.');
  const type = Object.values(ToolType).includes(input.type) ? input.type : ToolType.OTHER;
  const now = store.nowIso();
  const tool = {
    id: store.makeId('tool'),
    type,
    name,
    purpose: input.purpose?.trim() || null,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null
  };
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.tools.push(tool);
    addEvent(store, draft, {
      eventType: ActivityLibraryEventType.TOOL_CREATED,
      entityType: 'Tool',
      entityId: tool.id,
      metadata: { name: tool.name, type: tool.type }
    });
    return draft;
  });
  return tool;
}

export function archiveTool(store, toolId) {
  const state = store.getState();
  const existing = state.tools.find((item) => item.id === toolId && !item.archivedAt);
  if (!existing) throw new Error('Recurso não encontrado.');
  store.setState((current) => {
    const draft = structuredClone(current);
    const tool = draft.tools.find((item) => item.id === toolId);
    tool.archivedAt = store.nowIso();
    tool.updatedAt = tool.archivedAt;
    addEvent(store, draft, {
      eventType: ActivityLibraryEventType.TOOL_ARCHIVED,
      entityType: 'Tool',
      entityId: tool.id,
      metadata: { name: tool.name, type: tool.type }
    });
    return draft;
  });
}

export function activeTools(state) {
  return (state.tools || []).filter((item) => !item.archivedAt).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
