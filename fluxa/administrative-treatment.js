import { EventType, TreatmentStatus } from './domain.js';
import { treatmentComponentResolution } from './remaining.js';

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

export function canCompleteTreatmentAdministratively(state, treatmentId) {
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  if (!treatment || ![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(treatment.status)) return false;
  return treatmentComponentResolution(state, treatmentId).readyForFinalAssessment;
}

export function completeTreatmentAdministratively(store, treatmentId, input = {}) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId && [TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  if (!treatment) throw new Error('Tratamento não disponível para conclusão administrativa.');
  if (!treatmentComponentResolution(state, treatmentId).readyForFinalAssessment) {
    throw new Error('Resolva todos os componentes antes de concluir administrativamente o tratamento.');
  }
  if (!input.confirmNoMeasurement) {
    throw new Error('Confirme que nenhuma nova medição está sendo realizada neste registro administrativo.');
  }

  const now = store.nowIso();
  const assessments = (state.assessments || []).filter((item) => item.treatmentId === treatmentId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const latestAssessment = assessments[0] || null;

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    target.status = TreatmentStatus.COMPLETED;
    target.completedAt = now;
    target.updatedAt = now;
    target.completedAdministratively = true;
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_COMPLETED,
      entityType: 'Treatment',
      entityId: target.id,
      assistedEntityId: target.assistedEntityId,
      occurredAt: now,
      metadata: {
        administrative: true,
        measurementPerformedNow: false,
        finalAssessmentId: latestAssessment?.id || null,
        notes: input.notes?.trim() || null
      }
    });
    return draft;
  });
  return store.getState().treatments.find((item) => item.id === treatmentId);
}
