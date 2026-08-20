export const SessionStatus = Object.freeze({ OPEN: 'OPEN', CLOSED: 'CLOSED' });
export const AssistedType = Object.freeze({
  PERSON: 'PERSON',
  PET: 'PET',
  ENVIRONMENT: 'ENVIRONMENT',
  GROUP: 'GROUP',
  SITUATION: 'SITUATION',
  OTHER: 'OTHER'
});

export const EventType = Object.freeze({
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_CLOSED: 'SESSION_CLOSED',
  PREPARATION_STARTED: 'PREPARATION_STARTED',
  PREPARATION_COMPLETED: 'PREPARATION_COMPLETED',
  ASSISTED_CREATED: 'ASSISTED_CREATED',
  SESSION_ASSISTED_SELECTED: 'SESSION_ASSISTED_SELECTED',
  NOTE_CREATED: 'NOTE_CREATED'
});

export const PREPARATION_STEPS = Object.freeze([
  { key: 'breathing', label: 'Respiração e presença' },
  { key: 'frequency', label: 'Medir frequência vibracional' },
  { key: 'protection', label: 'Selecionar proteção' },
  { key: 'permission', label: 'Mantra de proteção e permissão' }
]);

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

export function getOpenSession(state) {
  return state.sessions.find((session) => session.status === SessionStatus.OPEN) || null;
}

export function startSession(store) {
  const current = store.getState();
  const existing = getOpenSession(current);
  if (existing) return existing;

  const session = {
    id: store.makeId('ses'),
    status: SessionStatus.OPEN,
    startedAt: store.nowIso(),
    endedAt: null,
    closedRecordedAt: null,
    currentAssistedEntityId: null,
    createdAt: store.nowIso(),
    updatedAt: store.nowIso()
  };

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.sessions.push(session);
    addEvent(store, draft, {
      eventType: EventType.SESSION_STARTED,
      entityType: 'Session',
      entityId: session.id,
      sessionId: session.id
    });
    return draft;
  });
  return session;
}

export function closeSession(store, sessionId, endedAt = store.nowIso()) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const session = draft.sessions.find((item) => item.id === sessionId);
    if (!session || session.status !== SessionStatus.OPEN) return draft;
    session.status = SessionStatus.CLOSED;
    session.endedAt = endedAt;
    session.closedRecordedAt = store.nowIso();
    session.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.SESSION_CLOSED,
      entityType: 'Session',
      entityId: session.id,
      sessionId: session.id,
      occurredAt: endedAt
    });
    return draft;
  });
}

export function startPreparation(store, sessionId) {
  const run = {
    id: store.makeId('prep'),
    sessionId,
    status: 'IN_PROGRESS',
    startedAt: store.nowIso(),
    completedAt: null,
    steps: PREPARATION_STEPS.map((step) => ({
      ...step,
      completed: false,
      completedAt: null
    }))
  };
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.preparationRuns.push(run);
    addEvent(store, draft, {
      eventType: EventType.PREPARATION_STARTED,
      entityType: 'PreparationRun',
      entityId: run.id,
      sessionId
    });
    return draft;
  });
  return run;
}

export function latestPreparation(state, sessionId) {
  return [...state.preparationRuns]
    .filter((run) => run.sessionId === sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null;
}

export function togglePreparationStep(store, runId, stepKey) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const run = draft.preparationRuns.find((item) => item.id === runId);
    if (!run || run.status === 'COMPLETED') return draft;
    const step = run.steps.find((item) => item.key === stepKey);
    if (!step) return draft;
    step.completed = !step.completed;
    step.completedAt = step.completed ? store.nowIso() : null;
    return draft;
  });
}

export function completePreparation(store, runId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const run = draft.preparationRuns.find((item) => item.id === runId);
    if (!run || !run.steps.every((step) => step.completed)) return draft;
    run.status = 'COMPLETED';
    run.completedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.PREPARATION_COMPLETED,
      entityType: 'PreparationRun',
      entityId: run.id,
      sessionId: run.sessionId
    });
    return draft;
  });
}

export function createAssistedEntity(store, input) {
  const entity = {
    id: store.makeId('ast'),
    type: input.type,
    displayName: input.displayName.trim(),
    birthDate: input.birthDate || null,
    address: input.address?.trim() || null,
    identifier: input.identifier?.trim() || null,
    details: input.details?.trim() || null,
    members: Array.isArray(input.members) ? input.members : [],
    createdAt: store.nowIso(),
    updatedAt: store.nowIso(),
    archivedAt: null
  };
  if (!entity.displayName) throw new Error('Nome do assistido é obrigatório.');

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.assistedEntities.push(entity);
    addEvent(store, draft, {
      eventType: EventType.ASSISTED_CREATED,
      entityType: 'AssistedEntity',
      entityId: entity.id,
      assistedEntityId: entity.id
    });
    return draft;
  });
  return entity;
}

export function selectAssistedForSession(store, sessionId, assistedEntityId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const session = draft.sessions.find((item) => item.id === sessionId);
    const assisted = draft.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
    if (!session || session.status !== SessionStatus.OPEN || !assisted) return draft;
    session.currentAssistedEntityId = assistedEntityId;
    session.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.SESSION_ASSISTED_SELECTED,
      entityType: 'Session',
      entityId: session.id,
      sessionId,
      assistedEntityId
    });
    return draft;
  });
}

export function addSessionNote(store, sessionId, assistedEntityId, body) {
  const text = body.trim();
  if (!text) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    addEvent(store, draft, {
      eventType: EventType.NOTE_CREATED,
      entityType: 'Note',
      entityId: store.makeId('note'),
      sessionId,
      assistedEntityId,
      metadata: { body: text }
    });
    return draft;
  });
}
