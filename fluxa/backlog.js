import { EventType, TreatmentStatus, createAssistedEntity } from './domain.js';
import { validateFinalAssessmentInput } from './final-assessment-rules.js';
import { requirePreparedSessionState } from './session-rules.js';

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
  const state = store.getState(); if (input.sessionId) requireOpenSession(state, input.sessionId);
  const treatment = state.treatments.find((item) => item.id === input.treatmentId && item.status === TreatmentStatus.IN_PROGRESS);
  if (!treatment) throw new Error('Tratamento não disponível para adicionar componente.');
  const now = store.nowIso();
  const component = { id: store.makeId('cmp'), treatmentId: treatment.id, type: input.type || 'TOOL', name: input.name?.trim() || 'Componente terapêutico', instructions: input.instructions?.trim() || null, status: TreatmentStatus.IN_PROGRESS, startedAt: input.startedAt || now, durationValue: Number(input.durationValue) || null, durationUnit: input.durationUnit || null, expectedEndAt: addDuration(input.startedAt || now, input.durationValue, input.durationUnit), completedAt: null, interruptedAt: null, stoppedAt: null, replacedByComponentId: null, createdAt: now, updatedAt: now };
  store.setState((current) => { const draft = structuredClone(current); draft.treatmentComponents.push(component); addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_ADDED, entityType: 'TreatmentComponent', entityId: component.id, sessionId: input.sessionId || null, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, name: component.name, expectedEndAt: component.expectedEndAt } }); return draft; });
  return component;
}

export function stopTreatmentComponent(store, componentId, input = {}) {
  store.setState((state) => { const draft = structuredClone(state); const component = draft.treatmentComponents.find((item) => item.id === componentId); if (!component || ![TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(component.status)) return draft; const treatment = draft.treatments.find((item) => item.id === component.treatmentId); const now = store.nowIso(); component.status = 'STOPPED'; component.stoppedAt = now; component.updatedAt = now; addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_STOPPED, entityType: 'TreatmentComponent', entityId: component.id, sessionId: input.sessionId || null, assistedEntityId: treatment?.assistedEntityId || null, metadata: { treatmentId: component.treatmentId, name: component.name, reason: input.reason?.trim() || null } }); return draft; });
}

export function replaceTreatmentComponent(store, componentId, input) {
  const state = store.getState(); const old = state.treatmentComponents.find((item) => item.id === componentId);
  if (!old) throw new Error('Componente original não encontrado.');
  const replacement = addTreatmentComponent(store, { ...input, treatmentId: old.treatmentId });
  store.setState((current) => { const draft = structuredClone(current); const original = draft.treatmentComponents.find((item) => item.id === componentId); const treatment = draft.treatments.find((item) => item.id === original.treatmentId); const now = store.nowIso(); original.status = 'REPLACED'; original.stoppedAt = now; original.replacedByComponentId = replacement.id; original.updatedAt = now; addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_REPLACED, entityType: 'TreatmentComponent', entityId: original.id, sessionId: input.sessionId || null, assistedEntityId: treatment?.assistedEntityId || null, metadata: { treatmentId: original.treatmentId, replacementComponentId: replacement.id, originalName: original.name, replacementName: replacement.name } }); return draft; });
  return replacement;
}

export function resumeTreatmentPreservingDuration(store, treatmentId, input = {}) {
  const state = store.getState(); const treatment = state.treatments.find((item) => item.id === treatmentId && item.status === TreatmentStatus.INTERRUPTED);
  if (!treatment) throw new Error('Tratamento não disponível para retomada.');
  const resumedAt = store.nowIso(); const interruptedAt = treatment.interruptedAt ? new Date(treatment.interruptedAt).getTime() : null; const pauseMs = interruptedAt ? Math.max(0, new Date(resumedAt).getTime() - interruptedAt) : 0;
  store.setState((current) => { const draft = structuredClone(current); const target = draft.treatments.find((item) => item.id === treatmentId); target.status = TreatmentStatus.IN_PROGRESS; target.resumedAt = resumedAt; target.updatedAt = resumedAt; draft.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.INTERRUPTED).forEach((item) => { item.status = TreatmentStatus.IN_PROGRESS; item.updatedAt = resumedAt; if (input.preserveRemainingDuration !== false && item.expectedEndAt && pauseMs) { item.expectedEndAt = new Date(new Date(item.expectedEndAt).getTime() + pauseMs).toISOString(); addEvent(store, draft, { eventType: BacklogEventType.COMPONENT_RESCHEDULED, entityType: 'TreatmentComponent', entityId: item.id, assistedEntityId: target.assistedEntityId, metadata: { treatmentId, expectedEndAt: item.expectedEndAt, pauseMs } }); } }); addEvent(store, draft, { eventType: EventType.TREATMENT_RESUMED, entityType: 'Treatment', entityId: target.id, assistedEntityId: target.assistedEntityId, metadata: { preserveRemainingDuration: input.preserveRemainingDuration !== false, pauseMs } }); return draft; });
}

export function recordStructuredFinalAssessment(store, input) {
  const state = store.getState();
  requirePreparedSessionState(state, input.sessionId, 'Conclua a preparação da sessão antes de registrar a avaliação final.');
  const treatment = state.treatments.find((item) => item.id === input.treatmentId); if (!treatment) throw new Error('Tratamento não encontrado.');
  const { frequency, imbalancePercent } = validateFinalAssessmentInput(input);
  const needsNewTreatment = Boolean(input.needsNewTreatment);
  const assessment = { id: store.makeId('assess'), treatmentId: treatment.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, frequency, imbalancePercent, needsNewTreatment, nextTreatmentWhen: input.nextTreatmentWhen?.trim() || null, notes: input.notes?.trim() || null, occurredAt: store.nowIso(), createdAt: store.nowIso() };
  store.setState((current) => { const draft = structuredClone(current); if (!Array.isArray(draft.assessments)) draft.assessments = []; draft.assessments.push(assessment); addEvent(store, draft, { eventType: BacklogEventType.TREATMENT_FINAL_ASSESSMENT, entityType: 'Assessment', entityId: assessment.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, frequency, imbalancePercent, needsNewTreatment, nextTreatmentWhen: assessment.nextTreatmentWhen } }); return draft; });
  return assessment;
}

export function validateAssistedInput(input) {
  const type = input.type; const name = input.displayName?.trim(); if (!name) throw new Error('Nome ou identificação é obrigatório.');
  if (type === 'PERSON' && !input.birthDate) throw new Error('Data de nascimento é obrigatória para pessoa.');
  if (type === 'ENVIRONMENT' && !input.address?.trim()) throw new Error('Endereço completo é obrigatório para ambiente/propriedade.');
  if (type === 'SITUATION') { if (!input.identifier?.trim()) throw new Error('Número/identificação do processo é obrigatório.'); if (!input.relatedPerson?.trim()) throw new Error('Pessoa envolvida/solicitante é obrigatória para situação/processo.'); }
  if (type === 'GROUP') { const members = Array.isArray(input.members) ? input.members : []; if (!members.length) throw new Error('Adicione pelo menos uma pessoa ao grupo.'); if (members.some((m) => !m.fullName?.trim() || !m.birthDate)) throw new Error('Cada integrante do grupo precisa de nome completo e data de nascimento.'); }
  return true;
}

export function createValidatedAssistedEntity(store, input) {
  validateAssistedInput(input);
  const entity = createAssistedEntity(store, input);
  const relatedPerson = input.relatedPerson?.trim() || null;
  if (entity.relatedPerson === relatedPerson) return entity;
  store.setState((state) => {
    const draft = structuredClone(state);
    const target = draft.assistedEntities.find((item) => item.id === entity.id);
    if (target) { target.relatedPerson = relatedPerson; target.updatedAt = store.nowIso(); }
    return draft;
  });
  entity.relatedPerson = relatedPerson;
  return entity;
}
