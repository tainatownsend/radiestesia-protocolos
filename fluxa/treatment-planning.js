import { EventType, TreatmentStatus } from './domain.js';

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

export function createPlannedTreatment(store, input) {
  const state = store.getState();
  const assisted = state.assistedEntities.find((item) => item.id === input.assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Selecione um assistido válido.');
  const title = input.title?.trim();
  if (!title) throw new Error('Informe o objetivo ou nome do tratamento.');
  const now = store.nowIso();
  const treatment = {
    id: store.makeId('trt'),
    assistedEntityId: assisted.id,
    originSessionId: null,
    findingIds: [],
    title,
    status: TreatmentStatus.PLANNED,
    planningNotes: input.notes?.trim() || null,
    plannedAt: now,
    startedAt: null,
    completedAt: null,
    interruptedAt: null,
    resumedAt: null,
    createdAt: now,
    updatedAt: now
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatments.push(treatment);
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_CREATED,
      entityType: 'Treatment',
      entityId: treatment.id,
      assistedEntityId: assisted.id,
      metadata: { title: treatment.title, planned: true }
    });
    return draft;
  });
  return treatment;
}

export function startPlannedTreatment(store, treatmentId, sessionId) {
  const state = store.getState();
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Abra uma sessão antes de iniciar o tratamento planejado.');
  const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.PLANNED);
  if (!treatment) throw new Error('Tratamento planejado não encontrado.');
  const now = store.nowIso();
  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    const activeSession = draft.sessions.find((item) => item.id === sessionId);
    target.status = TreatmentStatus.IN_PROGRESS;
    target.originSessionId = target.originSessionId || sessionId;
    target.startedAt = now;
    target.updatedAt = now;
    activeSession.currentAssistedEntityId = target.assistedEntityId;
    activeSession.updatedAt = now;
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_STARTED,
      entityType: 'Treatment',
      entityId: target.id,
      sessionId,
      assistedEntityId: target.assistedEntityId,
      metadata: { title: target.title, fromPlanned: true }
    });
    return draft;
  });
}
