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

function addDuration(startIso, value, unit) {
  const numeric = Number(value);
  if (!startIso || !numeric || numeric <= 0 || !unit) return null;
  const date = new Date(startIso);
  const multipliers = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
  };
  if (unit === 'MONTH') {
    date.setMonth(date.getMonth() + numeric);
    return date.toISOString();
  }
  const multiplier = multipliers[unit];
  return multiplier ? new Date(date.getTime() + numeric * multiplier).toISOString() : null;
}

function normalizePlannedComponent(store, treatmentId, input = {}) {
  const name = input.name?.trim();
  if (!name) throw new Error('Informe o nome de cada componente planejado.');
  const now = store.nowIso();
  return {
    id: store.makeId('cmp'),
    treatmentId,
    toolId: input.toolId || null,
    type: input.type || 'TOOL',
    name,
    instructions: input.instructions?.trim() || null,
    status: TreatmentStatus.PLANNED,
    startedAt: null,
    durationValue: Number(input.durationValue) > 0 ? Number(input.durationValue) : null,
    durationUnit: Number(input.durationValue) > 0 ? (input.durationUnit || null) : null,
    expectedEndAt: null,
    completedAt: null,
    interruptedAt: null,
    stoppedAt: null,
    replacedByComponentId: null,
    createdAt: now,
    updatedAt: now
  };
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
  const components = (input.components || []).map((component) => normalizePlannedComponent(store, treatment.id, component));

  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatments.push(treatment);
    draft.treatmentComponents.push(...components);
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_CREATED,
      entityType: 'Treatment',
      entityId: treatment.id,
      assistedEntityId: assisted.id,
      metadata: { title: treatment.title, planned: true, componentCount: components.length }
    });
    for (const component of components) {
      addEvent(store, draft, {
        eventType: 'COMPONENT_PLANNED',
        entityType: 'TreatmentComponent',
        entityId: component.id,
        assistedEntityId: assisted.id,
        metadata: { treatmentId: treatment.id, name: component.name, toolId: component.toolId }
      });
    }
    return draft;
  });
  return treatment;
}

export function startPlannedTreatment(store, treatmentId, sessionId) {
  const state = store.getState();
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Abra uma sessão antes de iniciar o tratamento planejado.');
  const prepared = state.preparationRuns.some((run) => run.sessionId === sessionId && run.status === 'COMPLETED');
  if (!prepared) throw new Error('Conclua a preparação da sessão antes de iniciar o tratamento planejado.');
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

    const components = draft.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.PLANNED);
    for (const component of components) {
      component.status = TreatmentStatus.IN_PROGRESS;
      component.startedAt = now;
      component.expectedEndAt = addDuration(now, component.durationValue, component.durationUnit);
      component.updatedAt = now;
      addEvent(store, draft, {
        eventType: EventType.COMPONENT_STARTED,
        entityType: 'TreatmentComponent',
        entityId: component.id,
        sessionId,
        assistedEntityId: target.assistedEntityId,
        metadata: { treatmentId: target.id, name: component.name, expectedEndAt: component.expectedEndAt, toolId: component.toolId, fromPlanned: true }
      });
    }

    addEvent(store, draft, {
      eventType: EventType.TREATMENT_STARTED,
      entityType: 'Treatment',
      entityId: target.id,
      sessionId,
      assistedEntityId: target.assistedEntityId,
      metadata: { title: target.title, fromPlanned: true, componentCount: components.length }
    });
    return draft;
  });
}
