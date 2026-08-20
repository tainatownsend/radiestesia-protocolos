import { TreatmentStatus } from './domain.js';

function addEvent(store, draft, input) {
  draft.events.push({
    id: store.makeId('evt'),
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionId: input.sessionId || null,
    assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(),
    createdAt: store.nowIso(),
    metadata: input.metadata || {}
  });
}

export function latestTreatmentAssessment(state, treatmentId) {
  return [...(state.assessments || [])]
    .filter((item) => item.treatmentId === treatmentId)
    .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;
}

export function canPlanFollowUpTreatment(state, treatmentId) {
  const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.COMPLETED);
  if (!treatment) return false;
  const assessment = latestTreatmentAssessment(state, treatmentId);
  if (!assessment?.needsNewTreatment) return false;
  return !state.treatments.some((item) => item.previousTreatmentId === treatmentId && [TreatmentStatus.PLANNED,TreatmentStatus.IN_PROGRESS,TreatmentStatus.INTERRUPTED].includes(item.status));
}

export function createFollowUpTreatment(store, treatmentId, input = {}) {
  const state = store.getState();
  const previous = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.COMPLETED);
  if (!previous) throw new Error('O tratamento anterior precisa estar concluído.');
  const assessment = latestTreatmentAssessment(state, treatmentId);
  if (!assessment?.needsNewTreatment) throw new Error('A avaliação final não indicou um novo tratamento.');
  if (!canPlanFollowUpTreatment(state, treatmentId)) throw new Error('Já existe um próximo ciclo ativo ou planejado para este tratamento.');

  const now = store.nowIso();
  const title = input.title?.trim() || `${previous.title} · próximo ciclo`;
  const treatment = {
    id: store.makeId('trt'),
    assistedEntityId: previous.assistedEntityId,
    originSessionId: null,
    previousTreatmentId: previous.id,
    recommendedByAssessmentId: assessment.id,
    findingIds: [],
    title,
    status: TreatmentStatus.PLANNED,
    planningNotes: input.notes?.trim() || assessment.nextTreatmentWhen || null,
    plannedFor: input.plannedFor?.trim() || assessment.nextTreatmentWhen || null,
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
      eventType: 'FOLLOW_UP_TREATMENT_PLANNED',
      entityType: 'Treatment',
      entityId: treatment.id,
      assistedEntityId: treatment.assistedEntityId,
      metadata: {
        title: treatment.title,
        previousTreatmentId: previous.id,
        recommendedByAssessmentId: assessment.id,
        plannedFor: treatment.plannedFor
      }
    });
    return draft;
  });
  return treatment;
}
