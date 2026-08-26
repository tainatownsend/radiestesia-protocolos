import { EventType, TreatmentStatus, createAssistedEntity, validateAssistedEntityInput } from './domain.js';
import { validateFinalAssessmentInput } from './final-assessment-rules.js';
import { requirePreparedSessionState } from './session-rules.js';
import { requireHawkinsBaseline } from './hawkins-measurement.js';

function addEvent(store, draft, input) {
  const event = {
    id: store.makeId('evt'), eventType: input.eventType, entityType: input.entityType, entityId: input.entityId,
    sessionId: input.sessionId || null, assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(), createdAt: store.nowIso(), metadata: input.metadata || {}
  };
  draft.events.push(event); return event;
}
function requireOpenSession(state, sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Esta ação exige uma sessão aberta.');
  return session;
}
function addDuration(startedAt, value, unit) {
  const date = new Date(startedAt); const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'MINUTE') date.setMinutes(date.getMinutes() + n);
  if (unit === 'HOUR') date.setHours(date.getHours() + n);
  if (unit === 'DAY') date.setDate(date.getDate() + n);
  if (unit === 'WEEK') date.setDate(date.getDate() + n * 7);
  if (unit === 'MONTH') date.setMonth(date.getMonth() + n);
  return date.toISOString();
}
function shiftTreatmentItemGraphDeadlines(component, pauseMs) {
  if (!pauseMs) return 0;
  const commands = Array.isArray(component?.commands) ? component.commands : component?.treatmentItem?.commands;
  if (!Array.isArray(commands)) return 0;
  let shifted = 0;
  for (const command of commands) {
    for (const graph of command.graphApplications || []) {
      if (graph.noDuration || !graph.expectedEndAt) continue;
      const end = new Date(graph.expectedEndAt);
      if (Number.isNaN(end.getTime())) continue;
      graph.expectedEndAt = new Date(end.getTime() + pauseMs).toISOString();
      shifted += 1;
    }
  }
  return shifted;
}

export const BacklogEventType = Object.freeze({
  SESSION_CLOSE_CORRECTED: 'SESSION_CLOSE_CORRECTED', COMPONENT_ADDED: 'COMPONENT_ADDED',
  COMPONENT_STOPPED: 'COMPONENT_STOPPED', COMPONENT_REPLACED: 'COMPONENT_REPLACED',
  COMPONENT_RESCHEDULED: 'COMPONENT_RESCHEDULED', TREATMENT_FINAL_ASSESSMENT: 'TREATMENT_FINAL_ASSESSMENT'
});

export function isPossiblyForgottenOpenSession(session, now = Date.now()) {
  if (!session || session.status !== 'OPEN') return false;
  const ageMs = now - new Date(session.startedAt).getTime();
  const startedDate = new Date(session.startedAt).toDateString();
  const today = new Date(now).toDateString();
  return startedDate !== today || ageMs >= 12 * 60 * 60 * 1000;
}

export function correctForgottenSessionClose(store, sessionId, endedAt, confirmation = 'Encerramento corrigido posteriormente') {
  const state = store.getState(); const session = requireOpenSession(state, sessionId); const end = new Date(endedAt);
  if (Number.isNaN(end.getTime())) throw new Error('Informe um horário de encerramento válido.');
  if (end.getTime() <= new Date(session.startedAt).getTime()) throw new Error('O encerramento deve ser posterior ao início da sessão.');
  if (end.getTime() > Date.now()) throw new Error('O encerramento não pode estar no futuro.');
  const activeReiki = state.reikiApplications.find((item) => item.sessionId === sessionId && ['RUNNING','PAUSED'].includes(item.status));
  if (activeReiki) throw new Error('Conclua a aplicação de Reiki antes de corrigir o encerramento.');
  store.setState((current) => {
    const draft = structuredClone(current); const target = draft.sessions.find((item) => item.id === sessionId); const recordedAt = store.nowIso();
    target.status = 'CLOSED'; target.endedAt = end.toISOString(); target.closedRecordedAt = recordedAt; target.updatedAt = recordedAt;
    const run = { id: store.makeId('close'), sessionId, status: 'COMPLETED', startedAt: recordedAt, completedAt: recordedAt, confirmationSnapshot: confirmation, correction: true, actualEndedAt: end.toISOString(), recordedAt };
    draft.closingRuns.push(run);
    addEvent(store, draft, { eventType: EventType.CLOSING_COMPLETED, entityType: 'ClosingRun', entityId: run.id, sessionId, occurredAt: end.toISOString(), metadata: { correction: true, recordedAt } });
    addEvent(store, draft, { eventType: EventType.SESSION_CLOSED, entityType: 'Session', entityId: target.id, sessionId, occurredAt: end.toISOString(), metadata: { correction: true, recordedAt } });
    addEvent(store, draft, { eventType: BacklogEventType.SESSION_CLOSE_CORRECTED, entityType: 'Session', entityId: target.id, sessionId, occurredAt: recordedAt, metadata: { actualEndedAt: end.toISOString(), recordedAt } });
    return draft;
  });
}

export function addTreatmentComponent(store, input) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === input.treatmentId && item.status === TreatmentStatus.IN_PROGRESS);
  if (!treatment) throw new Error('Tratamento não disponível para adicionar componente.');
  if (input.sessionId) {
    const session = requirePreparedSessionState(state, input.sessionId, 'Conclua a preparação da sessão antes de alterar componentes do tratamento.');
    if (!session.currentAssistedEntityId) throw new Error('Selecione o Assistido do tratamento antes de alterar seus componentes.');
    if (session.currentAssistedEntityId !== treatment.assistedEntityId) throw new Error('O Assistido atual não corresponde ao tratamento que você tentou alterar.');
  }
  const now = store.nowIso();
  const component = { id: store.makeId('cmp'), treatmentId: treatment.id, type: input.type || 'TOOL', name: input.name?.trim() || 'Componente terapêutico', instructions: input.instructions?.trim() || null, status: TreatmentStatus.IN_PROGRESS, startedAt: input.startedAt || now, durationValue: Number(input.durationValue) || null, durationUnit: input.durationUnit || null, expectedEndAt: addDuration(input.startedAt || now, input.durationValue, input.durationUnit), completedAt: null, interruptedAt: null, stoppedAt: null, replacedByComponentId: null, createdAt: now, updatedAt: now };
  store.setState((current) => { const draft = structuredClone(current); draft.treatmentComponents.push(component); addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_ADDED, entityType: 'TreatmentComponent', entityId: component.id, sessionId: input.sessionId || null, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, name: component.name, expectedEndAt: component.expectedEndAt } }); return draft; });
  return component;
}

export function stopTreatmentComponent(store, componentId, input = {}) {
  const state = store.getState();
  const component = state.treatmentComponents.find((item) => item.id === componentId && [TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  if (!component) return;
  const treatment = state.treatments.find((item) => item.id === component.treatmentId);
  if (input.sessionId) {
    const session = requirePreparedSessionState(state, input.sessionId, 'Conclua a preparação da sessão antes de alterar componentes do tratamento.');
    if (!session.currentAssistedEntityId) throw new Error('Selecione o Assistido do tratamento antes de alterar seus componentes.');
    if (!treatment || session.currentAssistedEntityId !== treatment.assistedEntityId) throw new Error('O Assistido atual não corresponde ao tratamento que você tentou alterar.');
  }
  store.setState((current) => { const draft = structuredClone(current); const target = draft.treatmentComponents.find((item) => item.id === componentId); if (!target || ![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(target.status)) return draft; const targetTreatment = draft.treatments.find((item) => item.id === target.treatmentId); const now = store.nowIso(); target.status = 'STOPPED'; target.stoppedAt = now; target.updatedAt = now; addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_STOPPED, entityType: 'TreatmentComponent', entityId: target.id, sessionId: input.sessionId || null, assistedEntityId: targetTreatment?.assistedEntityId || null, metadata: { treatmentId: target.treatmentId, name: target.name, reason: input.reason?.trim() || null } }); return draft; });
}

export function replaceTreatmentComponent(store, componentId, input) {
  const state = store.getState(); const old = state.treatmentComponents.find((item) => item.id === componentId);
  if (!old) throw new Error('Componente original não encontrado.');
  if (![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(old.status)) throw new Error('Componente não disponível para substituição; selecione um componente ativo.');
  const replacement = addTreatmentComponent(store, { ...input, treatmentId: old.treatmentId });
  store.setState((current) => { const draft = structuredClone(current); const original = draft.treatmentComponents.find((item) => item.id === componentId); const treatment = draft.treatments.find((item) => item.id === original.treatmentId); const now = store.nowIso(); original.status = 'REPLACED'; original.stoppedAt = now; original.replacedByComponentId = replacement.id; original.updatedAt = now; addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_REPLACED, entityType: 'TreatmentComponent', entityId: original.id, sessionId: input.sessionId || null, assistedEntityId: treatment?.assistedEntityId || null, metadata: { treatmentId: original.treatmentId, replacementComponentId: replacement.id, originalName: original.name, replacementName: replacement.name } }); return draft; });
  return replacement;
}

export function resumeTreatmentPreservingDuration(store, treatmentId, input = {}) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.INTERRUPTED);
  if (!treatment) throw new Error('Tratamento não disponível para retomada.');
  const session = state.sessions.find((item) => item.status === 'OPEN');
  if (!session) throw new Error('Abra e prepare uma sessão antes de retomar o tratamento.');
  requirePreparedSessionState(state, session.id, 'Conclua a preparação da sessão antes de retomar o tratamento.');
  if (!session.currentAssistedEntityId) throw new Error('Selecione o Assistido do tratamento antes de retomá-lo.');
  if (session.currentAssistedEntityId !== treatment.assistedEntityId) throw new Error('O Assistido atual não corresponde ao tratamento que você tentou retomar.');
  const baseline = requireHawkinsBaseline(state, { sessionId: session.id, assistedEntityId: treatment.assistedEntityId });

  const resumedAt = store.nowIso();
  const interruptedAt = treatment.interruptedAt ? new Date(treatment.interruptedAt).getTime() : null;
  const pauseMs = interruptedAt ? Math.max(0, new Date(resumedAt).getTime() - interruptedAt) : 0;
  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    target.status = TreatmentStatus.IN_PROGRESS; target.resumedAt = resumedAt; target.updatedAt = resumedAt;
    draft.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.INTERRUPTED).forEach((item) => {
      item.status = TreatmentStatus.IN_PROGRESS; item.updatedAt = resumedAt;
      if (input.preserveRemainingDuration !== false && pauseMs) {
        const graphDeadlinesShifted = shiftTreatmentItemGraphDeadlines(item, pauseMs);
        if (item.expectedEndAt) item.expectedEndAt = new Date(new Date(item.expectedEndAt).getTime() + pauseMs).toISOString();
        if (item.expectedEndAt || graphDeadlinesShifted) addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_RESCHEDULED, entityType: 'TreatmentComponent', entityId: item.id, sessionId: session.id, assistedEntityId: target.assistedEntityId, metadata: { treatmentId, expectedEndAt: item.expectedEndAt || null, pauseMs, graphDeadlinesShifted } });
      }
    });
    addEvent(store, draft, { eventType: EventType.TREATMENT_RESUMED, entityType: 'Treatment', entityId: target.id, sessionId: session.id, assistedEntityId: target.assistedEntityId, metadata: { preserveRemainingDuration: input.preserveRemainingDuration !== false, pauseMs, hawkinsBaselineAssessmentId: baseline.id, hawkinsBaselineHertz: baseline.hertz } });
    return draft;
  });
}

export function recordStructuredFinalAssessment(store, input) {
  const state = store.getState();
  const session = requirePreparedSessionState(state, input.sessionId, 'Conclua a preparação da sessão antes de registrar a avaliação final.');
  const treatment = state.treatments.find((item) => item.id === input.treatmentId); if (!treatment) throw new Error('Tratamento não encontrado.');
  if (![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(treatment.status)) throw new Error('A avaliação final só pode ser registrada para tratamento em andamento ou interrompido.');
  if (!session.currentAssistedEntityId) throw new Error('Selecione o Assistido do tratamento antes de registrar a avaliação final.');
  if (session.currentAssistedEntityId !== treatment.assistedEntityId) throw new Error('O Assistido atual não corresponde ao tratamento que está sendo avaliado.');
  const components = state.treatmentComponents.filter((item) => item.treatmentId === treatment.id);
  const unresolved = components.filter((item) => [TreatmentStatus.PLANNED, TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  if (!components.length || unresolved.length) throw new Error('Resolva todos os componentes antes de registrar a avaliação final.');
  const { frequency, imbalancePercent } = validateFinalAssessmentInput(input);
  const needsNewTreatment = Boolean(input.needsNewTreatment);
  const assessment = { id: store.makeId('assess'), treatmentId: treatment.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, frequency, imbalancePercent, needsNewTreatment, nextTreatmentWhen: input.nextTreatmentWhen?.trim() || null, notes: input.notes?.trim() || null, occurredAt: store.nowIso(), createdAt: store.nowIso() };
  store.setState((current) => { const draft = structuredClone(current); if (!Array.isArray(draft.assessments)) draft.assessments = []; draft.assessments.push(assessment); addEvent(store, draft, { eventType: BacklogEventType.TREATMENT_FINAL_ASSESSMENT, entityType: 'Assessment', entityId: assessment.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, frequency, imbalancePercent, needsNewTreatment, nextTreatmentWhen: assessment.nextTreatmentWhen } }); return draft; });
  return assessment;
}

export function validateAssistedInput(input) {
  return validateAssistedEntityInput(input);
}

export function createValidatedAssistedEntity(store, input) {
  return createAssistedEntity(store, input);
}
