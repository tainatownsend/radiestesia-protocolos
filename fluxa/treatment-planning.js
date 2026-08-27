import { EventType, TreatmentStatus } from './domain.js';
import { requireHawkinsBaseline } from './hawkins-measurement.js';

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
  const multipliers = { MINUTE:60*1000, HOUR:60*60*1000, DAY:24*60*60*1000, WEEK:7*24*60*60*1000 };
  if (unit === 'MONTH') { date.setMonth(date.getMonth() + numeric); return date.toISOString(); }
  const multiplier = multipliers[unit];
  return multiplier ? new Date(date.getTime() + numeric * multiplier).toISOString() : null;
}

function normalizePlannedComponent(store, treatmentId, input = {}) {
  const name = input.name?.trim();
  if (!name) throw new Error('Informe o nome de cada componente planejado.');
  const now = store.nowIso();
  const tool = input.toolId ? (store.getState().tools || []).find((item) => item.id === input.toolId && !item.archivedAt) : null;
  if (input.toolId && !tool) throw new Error('O recurso selecionado da Biblioteca não está disponível.');
  return {
    id: store.makeId('cmp'), treatmentId,
    toolId: tool?.id || null,
    toolSnapshot: tool ? { id:tool.id, type:tool.type, name:tool.name } : null,
    type: input.type || 'TOOL', name, instructions: input.instructions?.trim() || null,
    status: TreatmentStatus.PLANNED, startedAt: null,
    durationValue: Number(input.durationValue) > 0 ? Number(input.durationValue) : null,
    durationUnit: Number(input.durationValue) > 0 ? (input.durationUnit || null) : null,
    expectedEndAt: null, completedAt: null, interruptedAt: null, stoppedAt: null, replacedByComponentId: null,
    createdAt: now, updatedAt: now
  };
}

function recordPlannedComponentEvent(store, draft, component, assistedEntityId) {
  addEvent(store, draft, {
    eventType: 'COMPONENT_PLANNED', entityType: 'TreatmentComponent', entityId: component.id,
    assistedEntityId,
    metadata: { treatmentId: component.treatmentId, name: component.name, toolId: component.toolId, toolName: component.toolSnapshot?.name || null }
  });
}

export function createPlannedTreatment(store, input) {
  const state = store.getState();
  const assisted = state.assistedEntities.find((item) => item.id === input.assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Selecione um assistido válido.');
  const title = input.title?.trim();
  if (!title) throw new Error('Informe o objetivo ou nome do tratamento.');
  if (!Array.isArray(input.components) || input.components.length === 0) throw new Error('Adicione pelo menos um componente ao tratamento planejado.');
  const now = store.nowIso();
  const treatment = {
    id: store.makeId('trt'), assistedEntityId: assisted.id, originSessionId: null, findingIds: [], title,
    status: TreatmentStatus.PLANNED, planningNotes: input.notes?.trim() || null, plannedAt: now,
    startedAt: null, completedAt: null, interruptedAt: null, resumedAt: null, createdAt: now, updatedAt: now
  };
  const components = input.components.map((component) => normalizePlannedComponent(store, treatment.id, component));

  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatments.push(treatment);
    draft.treatmentComponents.push(...components);
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_CREATED, entityType: 'Treatment', entityId: treatment.id,
      assistedEntityId: assisted.id, metadata: { title: treatment.title, planned: true, componentCount: components.length }
    });
    for (const component of components) recordPlannedComponentEvent(store, draft, component, assisted.id);
    return draft;
  });
  return treatment;
}

export function addPlannedTreatmentComponent(store, treatmentId, input) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.PLANNED);
  if (!treatment) throw new Error('Tratamento planejado não encontrado.');
  const assisted = state.assistedEntities.find((item) => item.id === treatment.assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('O assistido deste tratamento não está disponível.');
  const component = normalizePlannedComponent(store, treatment.id, input);
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatmentComponents.push(component);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    target.updatedAt = store.nowIso();
    recordPlannedComponentEvent(store, draft, component, treatment.assistedEntityId);
    return draft;
  });
  return component;
}

export function startPlannedTreatment(store, treatmentId, sessionId) {
  const state = store.getState();
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Abra uma sessão antes de iniciar o tratamento planejado.');
  const prepared = state.preparationRuns.some((run) => run.sessionId === sessionId && run.status === 'COMPLETED');
  if (!prepared) throw new Error('Conclua a preparação da sessão antes de iniciar o tratamento planejado.');
  const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.PLANNED);
  if (!treatment) throw new Error('Tratamento planejado não encontrado.');
  const assisted = state.assistedEntities.find((item) => item.id === treatment.assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('O assistido deste tratamento não está disponível.');
  if (!session.currentAssistedEntityId) {
    throw new Error('Selecione o Assistido do tratamento planejado antes de iniciá-lo.');
  }
  if (session.currentAssistedEntityId !== treatment.assistedEntityId) {
    throw new Error('O Assistido atual não corresponde ao tratamento planejado que você tentou iniciar.');
  }
  const baseline = requireHawkinsBaseline(state, { sessionId, assistedEntityId:treatment.assistedEntityId });
  const plannedComponents = state.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.PLANNED);
  if (!plannedComponents.length) throw new Error('Adicione ao menos um componente antes de iniciar o tratamento planejado.');
  const now = store.nowIso();

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    const activeSession = draft.sessions.find((item) => item.id === sessionId);
    target.status = TreatmentStatus.IN_PROGRESS;
    target.originSessionId = target.originSessionId || sessionId;
    target.startedAt = now;
    target.hawkinsBaselineAssessmentId = baseline.id;
    target.hawkinsBaselineHertz = baseline.hertz;
    target.hawkinsBaselineRecordedAt = baseline.occurredAt;
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
        eventType: EventType.COMPONENT_STARTED, entityType: 'TreatmentComponent', entityId: component.id,
        sessionId, assistedEntityId: target.assistedEntityId,
        metadata: { treatmentId: target.id, name: component.name, expectedEndAt: component.expectedEndAt, toolId: component.toolId, toolName: component.toolSnapshot?.name || null, fromPlanned: true }
      });
    }

    addEvent(store, draft, {
      eventType: EventType.TREATMENT_STARTED, entityType: 'Treatment', entityId: target.id,
      sessionId, assistedEntityId: target.assistedEntityId,
      metadata: { title: target.title, fromPlanned: true, componentCount: components.length, hawkinsBaselineAssessmentId:baseline.id, hawkinsBaselineHertz:baseline.hertz }
    });
    return draft;
  });
}