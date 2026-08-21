export const SessionStatus = Object.freeze({ OPEN: 'OPEN', CLOSED: 'CLOSED' });
export const TreatmentStatus = Object.freeze({ PLANNED: 'PLANNED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', INTERRUPTED: 'INTERRUPTED' });
export const AssistedType = Object.freeze({
  PERSON: 'PERSON', PET: 'PET', ENVIRONMENT: 'ENVIRONMENT', GROUP: 'GROUP', SITUATION: 'SITUATION', OTHER: 'OTHER'
});

export const EventType = Object.freeze({
  SESSION_STARTED: 'SESSION_STARTED', SESSION_CLOSED: 'SESSION_CLOSED', PREPARATION_STARTED: 'PREPARATION_STARTED', PREPARATION_COMPLETED: 'PREPARATION_COMPLETED',
  CLOSING_COMPLETED: 'CLOSING_COMPLETED', ASSISTED_CREATED: 'ASSISTED_CREATED', SESSION_ASSISTED_SELECTED: 'SESSION_ASSISTED_SELECTED',
  INVESTIGATION_STARTED: 'INVESTIGATION_STARTED', INVESTIGATION_RESUMED: 'INVESTIGATION_RESUMED', INVESTIGATION_COMPLETED: 'INVESTIGATION_COMPLETED', FINDING_IDENTIFIED: 'FINDING_IDENTIFIED',
  TREATMENT_CREATED: 'TREATMENT_CREATED', TREATMENT_STARTED: 'TREATMENT_STARTED', TREATMENT_INTERRUPTED: 'TREATMENT_INTERRUPTED', TREATMENT_RESUMED: 'TREATMENT_RESUMED', TREATMENT_REVIEWED: 'TREATMENT_REVIEWED', TREATMENT_COMPLETED: 'TREATMENT_COMPLETED',
  COMPONENT_STARTED: 'COMPONENT_STARTED', COMPONENT_COMPLETED: 'COMPONENT_COMPLETED',
  REIKI_STARTED: 'REIKI_STARTED', REIKI_PAUSED: 'REIKI_PAUSED', REIKI_RESUMED: 'REIKI_RESUMED', REIKI_COMPLETED: 'REIKI_COMPLETED', NOTE_CREATED: 'NOTE_CREATED'
});

export const PREPARATION_STEPS = Object.freeze([
  { key: 'breathing', label: 'Respiração e presença' }, { key: 'frequency', label: 'Medir frequência vibracional' },
  { key: 'protection', label: 'Selecionar proteção' }, { key: 'permission', label: 'Mantra de proteção e permissão' }
]);

export const MVP_PROTOCOL = Object.freeze({
  id: 'protocol_triagem_rapida', versionId: 'protocol_triagem_rapida_v1', version: 1, name: 'Triagem rápida',
  questions: [
    { id: 'q1', text: 'Existe algo prioritário que precisa ser investigado neste momento?' },
    { id: 'q2', text: 'Há algum fator relevante que esteja mantendo este desequilíbrio?' },
    { id: 'q3', text: 'É apropriado iniciar um tratamento para este tema agora?' }
  ]
});

function addEvent(store, draft, input) {
  const event = { id: store.makeId('evt'), eventType: input.eventType, entityType: input.entityType, entityId: input.entityId,
    sessionId: input.sessionId || null, assistedEntityId: input.assistedEntityId || null, occurredAt: input.occurredAt || store.nowIso(),
    createdAt: store.nowIso(), metadata: input.metadata || {} };
  draft.events.push(event); return event;
}
function requireOpenSession(state, sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId && item.status === SessionStatus.OPEN);
  if (!session) throw new Error('Esta ação exige uma sessão aberta.'); return session;
}
function requirePreparedSession(state, sessionId) {
  const session = requireOpenSession(state, sessionId);
  const prepared = (state.preparationRuns || []).some((run) => run.sessionId === sessionId && run.status === 'COMPLETED');
  if (!prepared) throw new Error('Conclua a preparação da sessão antes de continuar.'); return session;
}
function getAssisted(state, assistedEntityId) { return state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt) || null; }

export function validateAssistedEntityInput(input = {}) {
  const type = input.type; const displayName = String(input.displayName || '').trim();
  if (!Object.values(AssistedType).includes(type)) throw new Error('Selecione um tipo de assistido válido.');
  if (!displayName) throw new Error('Nome ou identificação é obrigatório.');
  if (type === AssistedType.PERSON && !input.birthDate) throw new Error('Data de nascimento é obrigatória para pessoa.');
  if (type === AssistedType.ENVIRONMENT && !String(input.address || '').trim()) throw new Error('Endereço completo é obrigatório para ambiente/propriedade.');
  if (type === AssistedType.SITUATION) {
    if (!String(input.identifier || '').trim()) throw new Error('Número/identificação do processo é obrigatório.');
    if (!String(input.relatedPerson || '').trim()) throw new Error('Pessoa envolvida/solicitante é obrigatória para situação/processo.');
  }
  if (type === AssistedType.GROUP) {
    const members = Array.isArray(input.members) ? input.members : [];
    if (!members.length) throw new Error('Adicione pelo menos uma pessoa ao grupo.');
    if (members.some((member) => !String(member?.fullName || '').trim() || !member?.birthDate)) throw new Error('Cada integrante do grupo precisa de nome completo e data de nascimento.');
  }
  return true;
}

export function getOpenSession(state) { return state.sessions.find((session) => session.status === SessionStatus.OPEN) || null; }
export function startSession(store) {
  const existing = getOpenSession(store.getState()); if (existing) return existing;
  const session = { id: store.makeId('ses'), status: SessionStatus.OPEN, startedAt: store.nowIso(), endedAt: null, closedRecordedAt: null, currentAssistedEntityId: null, createdAt: store.nowIso(), updatedAt: store.nowIso() };
  store.setState((state) => { const draft = structuredClone(state); draft.sessions.push(session); addEvent(store, draft, { eventType: EventType.SESSION_STARTED, entityType: 'Session', entityId: session.id, sessionId: session.id }); return draft; });
  return session;
}
export function closeSession(store, sessionId, input = {}) {
  const state = store.getState(); const session = requireOpenSession(state, sessionId);
  const activeReiki = state.reikiApplications.find((item) => item.sessionId === sessionId && ['RUNNING', 'PAUSED'].includes(item.status));
  if (activeReiki) throw new Error('Conclua ou cancele a aplicação de Reiki antes de encerrar a sessão.');
  const endedAt = input.endedAt || store.nowIso();
  store.setState((current) => { const draft = structuredClone(current); const target = draft.sessions.find((item) => item.id === session.id); target.status = SessionStatus.CLOSED; target.endedAt = endedAt; target.closedRecordedAt = store.nowIso(); target.updatedAt = store.nowIso();
    const run = { id: store.makeId('close'), sessionId, status: 'COMPLETED', startedAt: store.nowIso(), completedAt: store.nowIso(), confirmationSnapshot: input.confirmation || 'Procedimento de encerramento concluído' };
    draft.closingRuns.push(run); addEvent(store, draft, { eventType: EventType.CLOSING_COMPLETED, entityType: 'ClosingRun', entityId: run.id, sessionId }); addEvent(store, draft, { eventType: EventType.SESSION_CLOSED, entityType: 'Session', entityId: session.id, sessionId, occurredAt: endedAt }); return draft; });
}
export function startPreparation(store, sessionId) {
  requireOpenSession(store.getState(), sessionId);
  const run = { id: store.makeId('prep'), sessionId, status: 'IN_PROGRESS', startedAt: store.nowIso(), completedAt: null, steps: PREPARATION_STEPS.map((step) => ({ ...step, completed: false, completedAt: null })) };
  store.setState((state) => { const draft = structuredClone(state); draft.preparationRuns.push(run); addEvent(store, draft, { eventType: EventType.PREPARATION_STARTED, entityType: 'PreparationRun', entityId: run.id, sessionId }); return draft; }); return run;
}
export function latestPreparation(state, sessionId) { return [...state.preparationRuns].filter((run) => run.sessionId === sessionId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null; }
export function togglePreparationStep(store, runId, stepKey) {
  store.setState((state) => { const draft = structuredClone(state); const run = draft.preparationRuns.find((item) => item.id === runId); if (!run || run.status === 'COMPLETED') return draft; const step = run.steps.find((item) => item.key === stepKey); if (!step) return draft; step.completed = !step.completed; step.completedAt = step.completed ? store.nowIso() : null; return draft; });
}
export function completePreparation(store, runId) {
  store.setState((state) => { const draft = structuredClone(state); const run = draft.preparationRuns.find((item) => item.id === runId); if (!run || !run.steps.every((step) => step.completed)) return draft; run.status = 'COMPLETED'; run.completedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.PREPARATION_COMPLETED, entityType: 'PreparationRun', entityId: run.id, sessionId: run.sessionId }); return draft; });
}

export function createAssistedEntity(store, input) {
  validateAssistedEntityInput(input);
  const entity = { id: store.makeId('ast'), type: input.type, displayName: input.displayName.trim(), birthDate: input.birthDate || null,
    address: input.address?.trim() || null, identifier: input.identifier?.trim() || null, relatedPerson: input.relatedPerson?.trim() || null, details: input.details?.trim() || null,
    members: Array.isArray(input.members) ? structuredClone(input.members) : [], createdAt: store.nowIso(), updatedAt: store.nowIso(), archivedAt: null };
  store.setState((state) => { const draft = structuredClone(state); draft.assistedEntities.push(entity); addEvent(store, draft, { eventType: EventType.ASSISTED_CREATED, entityType: 'AssistedEntity', entityId: entity.id, assistedEntityId: entity.id }); return draft; }); return entity;
}
export function selectAssistedForSession(store, sessionId, assistedEntityId) {
  store.setState((state) => { const draft = structuredClone(state); const session = draft.sessions.find((item) => item.id === sessionId); const assisted = getAssisted(draft, assistedEntityId); if (!session || session.status !== SessionStatus.OPEN || !assisted) return draft; session.currentAssistedEntityId = assistedEntityId; session.updatedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.SESSION_ASSISTED_SELECTED, entityType: 'Session', entityId: session.id, sessionId, assistedEntityId }); return draft; });
}

export function startInvestigation(store, sessionId, assistedEntityId) {
  const state = store.getState(); requirePreparedSession(state, sessionId); if (!getAssisted(state, assistedEntityId)) throw new Error('Selecione um assistido válido.');
  const sameSession = state.investigations.find((item) => item.currentSessionId === sessionId && item.assistedEntityId === assistedEntityId && item.status === 'IN_PROGRESS'); if (sameSession) return sameSession;
  const investigation = { id: store.makeId('inv'), originSessionId: sessionId, currentSessionId: sessionId, assistedEntityId, protocolId: MVP_PROTOCOL.id, protocolVersionId: MVP_PROTOCOL.versionId, protocolSnapshot: structuredClone(MVP_PROTOCOL), status: 'IN_PROGRESS', currentIndex: 0, answers: [], startedAt: store.nowIso(), completedAt: null, updatedAt: store.nowIso() };
  store.setState((current) => { const draft = structuredClone(current); draft.investigations.push(investigation); addEvent(store, draft, { eventType: EventType.INVESTIGATION_STARTED, entityType: 'Investigation', entityId: investigation.id, sessionId, assistedEntityId, metadata: { protocolName: MVP_PROTOCOL.name, protocolVersionId: MVP_PROTOCOL.versionId } }); return draft; }); return investigation;
}
export function resumeInvestigation(store, investigationId, sessionId) {
  const state = store.getState(); requirePreparedSession(state, sessionId); const investigation = state.investigations.find((item) => item.id === investigationId && item.status === 'IN_PROGRESS'); if (!investigation) throw new Error('Investigação não disponível para retomada.');
  store.setState((current) => { const draft = structuredClone(current); const target = draft.investigations.find((item) => item.id === investigationId); if (target.currentSessionId !== sessionId) { target.currentSessionId = sessionId; target.updatedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.INVESTIGATION_RESUMED, entityType: 'Investigation', entityId: target.id, sessionId, assistedEntityId: target.assistedEntityId, metadata: { originSessionId: target.originSessionId } }); } const session = draft.sessions.find((item) => item.id === sessionId); if (session) session.currentAssistedEntityId = target.assistedEntityId; return draft; });
}
export function answerInvestigation(store, investigationId, answer) {
  if (!['YES', 'NO'].includes(answer)) return; const state = store.getState(); const current = state.investigations.find((item) => item.id === investigationId && item.status === 'IN_PROGRESS'); if (!current) return; requirePreparedSession(state, current.currentSessionId);
  store.setState((source) => { const draft = structuredClone(source); const investigation = draft.investigations.find((item) => item.id === investigationId); if (!investigation || investigation.status !== 'IN_PROGRESS') return draft; const question = investigation.protocolSnapshot.questions[investigation.currentIndex]; const existing = investigation.answers.find((item) => item.questionId === question.id); if (existing) { existing.answer = answer; existing.answeredAt = store.nowIso(); } else investigation.answers.push({ questionId: question.id, questionTextSnapshot: question.text, answer, answeredAt: store.nowIso() }); if (investigation.currentIndex < investigation.protocolSnapshot.questions.length - 1) investigation.currentIndex += 1; else { investigation.status = 'COMPLETED'; investigation.completedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.INVESTIGATION_COMPLETED, entityType: 'Investigation', entityId: investigation.id, sessionId: investigation.currentSessionId, assistedEntityId: investigation.assistedEntityId, metadata: { protocolName: investigation.protocolSnapshot.name } }); } investigation.updatedAt = store.nowIso(); return draft; });
}
export function confirmFindings(store, investigationId, questionIds) {
  const state = store.getState(); const sourceInvestigation = state.investigations.find((item) => item.id === investigationId && item.status === 'COMPLETED'); if (!sourceInvestigation) return []; requirePreparedSession(state, sourceInvestigation.currentSessionId); const created = [];
  store.setState((source) => { const draft = structuredClone(source); const investigation = draft.investigations.find((item) => item.id === investigationId); if (!investigation || investigation.status !== 'COMPLETED') return draft; for (const questionId of questionIds) { const answer = investigation.answers.find((item) => item.questionId === questionId && item.answer === 'YES'); if (!answer) continue; const duplicate = draft.findings.find((item) => item.investigationId === investigationId && item.sourceQuestionId === questionId && item.status !== 'DISMISSED'); if (duplicate) { created.push(duplicate); continue; } const finding = { id: store.makeId('find'), assistedEntityId: investigation.assistedEntityId, investigationId, sourceQuestionId: questionId, classification: 'FACTOR_RELEVANT', title: answer.questionTextSnapshot, status: 'IDENTIFIED', createdAt: store.nowIso() }; draft.findings.push(finding); created.push(finding); addEvent(store, draft, { eventType: EventType.FINDING_IDENTIFIED, entityType: 'Finding', entityId: finding.id, sessionId: investigation.currentSessionId, assistedEntityId: investigation.assistedEntityId, metadata: { title: finding.title } }); } return draft; }); return created;
}

function addDuration(startedAt, value, unit) { const date = new Date(startedAt); const n = Number(value); if (!Number.isFinite(n) || n <= 0) return null; if (unit === 'MINUTE') date.setMinutes(date.getMinutes() + n); if (unit === 'HOUR') date.setHours(date.getHours() + n); if (unit === 'DAY') date.setDate(date.getDate() + n); if (unit === 'WEEK') date.setDate(date.getDate() + (n * 7)); if (unit === 'MONTH') date.setMonth(date.getMonth() + n); return date.toISOString(); }
export function createTreatment(store, input) {
  const state = store.getState(); requirePreparedSession(state, input.sessionId); if (!getAssisted(state, input.assistedEntityId)) throw new Error('Assistido inválido.');
  const findingIds = [...new Set(input.findingIds || [])];
  for (const findingId of findingIds) { const finding = state.findings.find((item) => item.id === findingId); if (!finding || finding.assistedEntityId !== input.assistedEntityId) throw new Error('Cada achado do tratamento deve pertencer ao assistido selecionado.'); }
  const startedAt = store.nowIso();
  const treatment = { id: store.makeId('trt'), assistedEntityId: input.assistedEntityId, originSessionId: input.sessionId, findingIds, title: input.title?.trim() || 'Tratamento', status: TreatmentStatus.IN_PROGRESS, startedAt, completedAt: null, interruptedAt: null, resumedAt: null, createdAt: store.nowIso(), updatedAt: store.nowIso() };
  const component = { id: store.makeId('cmp'), treatmentId: treatment.id, type: 'TOOL', name: input.componentName?.trim() || 'Componente terapêutico', instructions: input.instructions?.trim() || null, status: TreatmentStatus.IN_PROGRESS, startedAt, durationValue: Number(input.durationValue) || null, durationUnit: input.durationUnit || null, expectedEndAt: addDuration(startedAt, input.durationValue, input.durationUnit), completedAt: null, interruptedAt: null, createdAt: store.nowIso(), updatedAt: store.nowIso() };
  store.setState((current) => { const draft = structuredClone(current); draft.treatments.push(treatment); draft.treatmentComponents.push(component); for (const findingId of treatment.findingIds) { const finding = draft.findings.find((item) => item.id === findingId); if (finding) finding.status = 'TREATED'; } addEvent(store, draft, { eventType: EventType.TREATMENT_CREATED, entityType: 'Treatment', entityId: treatment.id, sessionId: input.sessionId, assistedEntityId: input.assistedEntityId, metadata: { title: treatment.title } }); addEvent(store, draft, { eventType: EventType.TREATMENT_STARTED, entityType: 'Treatment', entityId: treatment.id, sessionId: input.sessionId, assistedEntityId: input.assistedEntityId, metadata: { title: treatment.title } }); addEvent(store, draft, { eventType: EventType.COMPONENT_STARTED, entityType: 'TreatmentComponent', entityId: component.id, sessionId: input.sessionId, assistedEntityId: input.assistedEntityId, metadata: { treatmentId: treatment.id, name: component.name, expectedEndAt: component.expectedEndAt } }); return draft; }); return { treatment, component };
}
export function interruptTreatment(store, treatmentId, reason = '') { store.setState((state) => { const draft = structuredClone(state); const treatment = draft.treatments.find((item) => item.id === treatmentId); if (!treatment || treatment.status !== TreatmentStatus.IN_PROGRESS) return draft; treatment.status = TreatmentStatus.INTERRUPTED; treatment.interruptedAt = store.nowIso(); treatment.updatedAt = store.nowIso(); draft.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.IN_PROGRESS).forEach((item) => { item.status = TreatmentStatus.INTERRUPTED; item.interruptedAt = store.nowIso(); item.updatedAt = store.nowIso(); }); addEvent(store, draft, { eventType: EventType.TREATMENT_INTERRUPTED, entityType: 'Treatment', entityId: treatment.id, assistedEntityId: treatment.assistedEntityId, metadata: { reason: reason.trim() || null } }); return draft; }); }
export function resumeTreatment(store, treatmentId) { store.setState((state) => { const draft = structuredClone(state); const treatment = draft.treatments.find((item) => item.id === treatmentId); if (!treatment || treatment.status !== TreatmentStatus.INTERRUPTED) return draft; treatment.status = TreatmentStatus.IN_PROGRESS; treatment.resumedAt = store.nowIso(); treatment.updatedAt = store.nowIso(); draft.treatmentComponents.filter((item) => item.treatmentId === treatmentId && item.status === TreatmentStatus.INTERRUPTED).forEach((item) => { item.status = TreatmentStatus.IN_PROGRESS; item.updatedAt = store.nowIso(); }); addEvent(store, draft, { eventType: EventType.TREATMENT_RESUMED, entityType: 'Treatment', entityId: treatment.id, assistedEntityId: treatment.assistedEntityId }); return draft; }); }
export function reviewTreatment(store, input) {
  const state = store.getState(); requirePreparedSession(state, input.sessionId); const treatment = state.treatments.find((item) => item.id === input.treatmentId && item.status === TreatmentStatus.IN_PROGRESS); if (!treatment) throw new Error('Tratamento não disponível para revisão.');
  const imbalancePercent = input.imbalancePercent === '' || input.imbalancePercent == null ? null : Number(input.imbalancePercent);
  if (imbalancePercent != null && (!Number.isFinite(imbalancePercent) || imbalancePercent < 0 || imbalancePercent > 100)) throw new Error('Desequilíbrio deve estar entre 0% e 100%.');
  const review = { id: store.makeId('rev'), treatmentId: treatment.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, verifiedComplete: Boolean(input.verifiedComplete), imbalancePercent, notes: input.notes?.trim() || null, reviewedAt: store.nowIso(), createdAt: store.nowIso() };
  store.setState((current) => { const draft = structuredClone(current); const target = draft.treatments.find((item) => item.id === treatment.id); draft.treatmentReviews.push(review); addEvent(store, draft, { eventType: EventType.TREATMENT_REVIEWED, entityType: 'TreatmentReview', entityId: review.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, verifiedComplete: review.verifiedComplete, imbalancePercent: review.imbalancePercent } }); if (review.verifiedComplete) { const now = store.nowIso(); draft.treatmentComponents.filter((item) => item.treatmentId === treatment.id && item.status !== TreatmentStatus.COMPLETED).forEach((item) => { item.status = TreatmentStatus.COMPLETED; item.completedAt = now; item.updatedAt = now; addEvent(store, draft, { eventType: EventType.COMPONENT_COMPLETED, entityType: 'TreatmentComponent', entityId: item.id, sessionId: input.sessionId, assistedEntityId: treatment.assistedEntityId, metadata: { treatmentId: treatment.id, name: item.name } }); }); target.status = TreatmentStatus.COMPLETED; target.completedAt = now; target.updatedAt = now; addEvent(store, draft, { eventType: EventType.TREATMENT_COMPLETED, entityType: 'Treatment', entityId: target.id, sessionId: input.sessionId, assistedEntityId: target.assistedEntityId, metadata: { imbalancePercent: review.imbalancePercent } }); } return draft; }); return review;
}
export function treatmentNeedsReview(state, treatment) { if (!treatment || treatment.status !== TreatmentStatus.IN_PROGRESS) return false; return state.treatmentComponents.some((item) => item.treatmentId === treatment.id && item.status === TreatmentStatus.IN_PROGRESS && item.expectedEndAt && new Date(item.expectedEndAt).getTime() <= Date.now()); }

function activeElapsedMs(application, now = Date.now()) { return (application.intervals || []).reduce((total, interval) => { const start = new Date(interval.startedAt).getTime(); const end = interval.endedAt ? new Date(interval.endedAt).getTime() : now; return total + Math.max(0, end - start); }, 0); }
export function reikiElapsedSeconds(application, now = Date.now()) { return Math.floor(activeElapsedMs(application, now) / 1000); }
export function startReiki(store, sessionId, assistedEntityId) {
  const state = store.getState(); requireOpenSession(state, sessionId); if (!getAssisted(state, assistedEntityId)) throw new Error('Selecione um assistido válido.');
  const existing = state.reikiApplications.find((item) => ['RUNNING','PAUSED'].includes(item.status)); if (existing) return existing;
  const now = store.nowIso(); const application = { id: store.makeId('reiki'), sessionId, assistedEntityId, status: 'RUNNING', startedAt: now, endedAt: null, durationSeconds: null, notes: null, intervals: [{ id: store.makeId('int'), startedAt: now, endedAt: null }], createdAt: now, updatedAt: now };
  store.setState((current) => { const draft = structuredClone(current); draft.reikiApplications.push(application); addEvent(store, draft, { eventType: EventType.REIKI_STARTED, entityType: 'ReikiApplication', entityId: application.id, sessionId, assistedEntityId }); return draft; }); return application;
}
export function pauseReiki(store, applicationId) { store.setState((state) => { const draft = structuredClone(state); const app = draft.reikiApplications.find((item) => item.id === applicationId && item.status === 'RUNNING'); if (!app) return draft; const interval = [...app.intervals].reverse().find((item) => !item.endedAt); if (interval) interval.endedAt = store.nowIso(); app.status = 'PAUSED'; app.updatedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.REIKI_PAUSED, entityType: 'ReikiApplication', entityId: app.id, sessionId: app.sessionId, assistedEntityId: app.assistedEntityId }); return draft; }); }
export function resumeReiki(store, applicationId) { store.setState((state) => { const draft = structuredClone(state); const app = draft.reikiApplications.find((item) => item.id === applicationId && item.status === 'PAUSED'); if (!app) return draft; requireOpenSession(draft, app.sessionId); app.intervals.push({ id: store.makeId('int'), startedAt: store.nowIso(), endedAt: null }); app.status = 'RUNNING'; app.updatedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.REIKI_RESUMED, entityType: 'ReikiApplication', entityId: app.id, sessionId: app.sessionId, assistedEntityId: app.assistedEntityId }); return draft; }); }
export function completeReiki(store, applicationId, notes = '') { store.setState((state) => { const draft = structuredClone(state); const app = draft.reikiApplications.find((item) => item.id === applicationId && ['RUNNING', 'PAUSED'].includes(item.status)); if (!app) return draft; if (app.status === 'RUNNING') { const interval = [...app.intervals].reverse().find((item) => !item.endedAt); if (interval) interval.endedAt = store.nowIso(); } app.status = 'COMPLETED'; app.endedAt = store.nowIso(); app.notes = notes.trim() || null; app.durationSeconds = reikiElapsedSeconds(app, new Date(app.endedAt).getTime()); app.updatedAt = store.nowIso(); addEvent(store, draft, { eventType: EventType.REIKI_COMPLETED, entityType: 'ReikiApplication', entityId: app.id, sessionId: app.sessionId, assistedEntityId: app.assistedEntityId, metadata: { durationSeconds: app.durationSeconds } }); return draft; }); }
export function recordReikiRetrospective(store, input) {
  const state = store.getState(); if (!getAssisted(state, input.assistedEntityId)) throw new Error('Selecione um assistido válido.');
  const seconds = Math.max(0, Number(input.durationMinutes || 0) * 60); const occurredAt = input.occurredAt || store.nowIso(); const ended = new Date(occurredAt); const started = new Date(ended.getTime() - seconds * 1000);
  const application = { id: store.makeId('reiki'), sessionId: null, assistedEntityId: input.assistedEntityId, status: 'COMPLETED', startedAt: started.toISOString(), endedAt: ended.toISOString(), durationSeconds: seconds, notes: input.notes?.trim() || null, intervals: [{ id: store.makeId('int'), startedAt: started.toISOString(), endedAt: ended.toISOString() }], createdAt: store.nowIso(), updatedAt: store.nowIso() };
  store.setState((source) => { const draft = structuredClone(source); draft.reikiApplications.push(application); addEvent(store, draft, { eventType: EventType.REIKI_COMPLETED, entityType: 'ReikiApplication', entityId: application.id, assistedEntityId: input.assistedEntityId, occurredAt: application.endedAt, metadata: { durationSeconds: application.durationSeconds, retrospective: true } }); return draft; }); return application;
}
export function addSessionNote(store, sessionId, assistedEntityId, body) {
  const text = String(body || '').trim(); if (!text) return;
  const state = store.getState(); requireOpenSession(state, sessionId); if (!getAssisted(state, assistedEntityId)) throw new Error('Selecione um assistido válido.');
  store.setState((source) => { const draft = structuredClone(source); addEvent(store, draft, { eventType: EventType.NOTE_CREATED, entityType: 'Note', entityId: store.makeId('note'), sessionId, assistedEntityId, metadata: { body: text } }); return draft; });
}
