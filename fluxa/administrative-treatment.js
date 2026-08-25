import { EventType, TreatmentStatus } from './domain.js';
import { treatmentComponentResolution } from './remaining.js';
import { hawkinsFinalForTreatment, validateHawkinsHertz } from './hawkins-measurement.js';

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

function validFinalHawkins(state, treatment) {
  const assessment = hawkinsFinalForTreatment(state, treatment.id);
  if (!assessment || assessment.assistedEntityId !== treatment.assistedEntityId) return null;
  try {
    return { assessment, hertz: validateHawkinsHertz(assessment.hertz ?? assessment.frequency) };
  } catch (_) {
    return null;
  }
}

export function canCompleteTreatmentAdministratively(state, treatmentId) {
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  if (!treatment || ![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(treatment.status)) return false;
  if (!treatmentComponentResolution(state, treatmentId).readyForFinalAssessment) return false;
  return Boolean(validFinalHawkins(state, treatment));
}

export function completeTreatmentAdministratively(store, treatmentId, input = {}) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId && [TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  if (!treatment) throw new Error('Tratamento não disponível para conclusão administrativa.');
  if (!treatmentComponentResolution(state, treatmentId).readyForFinalAssessment) {
    throw new Error('Resolva todos os componentes antes de concluir administrativamente o tratamento.');
  }
  const finalHawkins = validFinalHawkins(state, treatment);
  if (!finalHawkins) {
    throw new Error('Uma medição final de Hawkins válida do Assistido é obrigatória antes da conclusão administrativa.');
  }
  if (!input.confirmNoMeasurement) {
    throw new Error('Confirme que nenhuma nova medição está sendo realizada neste registro administrativo.');
  }

  const now = store.nowIso();
  const { assessment: latestAssessment, hertz } = finalHawkins;

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    target.status = TreatmentStatus.COMPLETED;
    target.completedAt = now;
    target.updatedAt = now;
    target.completedAdministratively = true;
    target.hawkinsFinalAssessmentId = latestAssessment.id;
    target.hawkinsFinalHertz = hertz;
    target.hawkinsFinalRecordedAt = latestAssessment.occurredAt || latestAssessment.createdAt || now;
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_COMPLETED,
      entityType: 'Treatment',
      entityId: target.id,
      assistedEntityId: target.assistedEntityId,
      occurredAt: now,
      metadata: {
        administrative: true,
        measurementPerformedNow: false,
        finalAssessmentId: latestAssessment.id,
        hawkinsHertz: hertz,
        notes: input.notes?.trim() || null
      }
    });
    return draft;
  });
  return store.getState().treatments.find((item) => item.id === treatmentId);
}
