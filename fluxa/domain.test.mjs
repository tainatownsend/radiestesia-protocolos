import assert from 'node:assert/strict';
import {
  startSession, closeSession, startPreparation, togglePreparationStep, completePreparation,
  createAssistedEntity, startInvestigation, resumeInvestigation, answerInvestigation, confirmFindings,
  createTreatment, interruptTreatment, reviewTreatment, startReiki, pauseReiki, resumeReiki, completeReiki,
  TreatmentStatus, PREPARATION_STEPS
} from './domain.js';
import {
  correctForgottenSessionClose, addTreatmentComponent, replaceTreatmentComponent,
  resumeTreatmentPreservingDuration, recordStructuredFinalAssessment, validateAssistedInput,
  createValidatedAssistedEntity
} from './backlog.js';

function makeState() {
  return {
    version: 3, meta: {}, sessions: [], assistedEntities: [], events: [], preparationRuns: [], closingRuns: [],
    investigations: [], findings: [], treatments: [], treatmentComponents: [], treatmentReviews: [], assessments: [], reikiApplications: []
  };
}

function fakeStore(start = '2026-08-19T10:00:00.000Z') {
  let state = makeState();
  let now = new Date(start).getTime();
  let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
    makeId(prefix = 'id') { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return new Date(now).toISOString(); },
    advance(ms) { now += ms; },
    setNow(iso) { now = new Date(iso).getTime(); }
  };
}

function prepare(store, sessionId) {
  const run = startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}

{
  const store = fakeStore();
  const a = startSession(store);
  const b = startSession(store);
  assert.equal(a.id, b.id, 'only one open session should exist');
  assert.equal(store.getState().sessions.length, 1);
}

{
  const store = fakeStore();
  const session = startSession(store);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Maria', birthDate:'1980-01-01' });
  assert.throws(() => startInvestigation(store, session.id, person.id), /preparação/i, 'quick investigation start requires preparation');
  prepare(store, session.id);
  const inv = startInvestigation(store, session.id, person.id);
  answerInvestigation(store, inv.id, 'YES');
  closeSession(store, session.id, { endedAt:'2026-08-19T11:00:00.000Z' });
  store.setNow('2026-08-19T15:00:00.000Z');
  const later = startSession(store);
  assert.throws(() => resumeInvestigation(store, inv.id, later.id), /preparação/i, 'quick investigation resume requires preparation');
  prepare(store, later.id);
  resumeInvestigation(store, inv.id, later.id);
  const current = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(current.originSessionId, session.id);
  assert.equal(current.currentSessionId, later.id);
}

{
  const store = fakeStore();
  const session = startSession(store);
  store.advance(2 * 60 * 60 * 1000);
  assert.throws(
    () => correctForgottenSessionClose(store, session.id, session.startedAt),
    /posterior ao início/i,
    'corrected session end must be strictly after session start'
  );
  correctForgottenSessionClose(store, session.id, '2026-08-19T11:30:00.000Z');
  const closed = store.getState().sessions[0];
  assert.equal(closed.endedAt, '2026-08-19T11:30:00.000Z');
  assert.equal(closed.closedRecordedAt, '2026-08-19T12:00:00.000Z');
  assert.notEqual(closed.endedAt, closed.closedRecordedAt);
}

{
  const store = fakeStore();
  const session = startSession(store);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Ana', birthDate:'1979-02-02' });
  assert.throws(
    () => createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, title:'Teste', componentName:'Gráfico A' }),
    /preparação/i,
    'direct treatment creation requires preparation'
  );
  prepare(store, session.id);
  const { treatment, component } = createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, title:'Teste', componentName:'Gráfico A', durationValue:2, durationUnit:'HOUR' });
  store.advance(30 * 60 * 1000);
  interruptTreatment(store, treatment.id, 'pausa');
  const beforeResume = store.getState().treatmentComponents.find((item) => item.id === component.id).expectedEndAt;
  store.advance(90 * 60 * 1000);
  resumeTreatmentPreservingDuration(store, treatment.id, { preserveRemainingDuration:true });
  const afterResume = store.getState().treatmentComponents.find((item) => item.id === component.id).expectedEndAt;
  assert.equal(new Date(afterResume).getTime() - new Date(beforeResume).getTime(), 90 * 60 * 1000, 'pause time should extend expected end');
}

{
  const store = fakeStore();
  const session = startSession(store);
  prepare(store, session.id);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Lia', birthDate:'1985-03-03' });
  const { treatment, component } = createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, title:'Multi', componentName:'Original', durationValue:1, durationUnit:'DAY' });
  const extra = addTreatmentComponent(store, { sessionId:session.id, treatmentId:treatment.id, name:'Segundo', durationValue:2, durationUnit:'DAY' });
  const replacement = replaceTreatmentComponent(store, component.id, { sessionId:session.id, name:'Substituto', durationValue:3, durationUnit:'DAY' });
  assert.equal(store.getState().treatmentComponents.length, 3);
  assert.equal(store.getState().treatmentComponents.find((item) => item.id === component.id).status, 'REPLACED');
  assert.equal(store.getState().treatmentComponents.find((item) => item.id === component.id).replacedByComponentId, replacement.id);
  assert.equal(extra.status, TreatmentStatus.IN_PROGRESS);
}

{
  const store = fakeStore();
  const session = startSession(store);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Eva', birthDate:'1990-04-04' });
  assert.throws(
    () => createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, title:'Final', componentName:'A' }),
    /preparação/i
  );
  prepare(store, session.id);
  const { treatment } = createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, title:'Final', componentName:'A', durationValue:1, durationUnit:'HOUR' });
  assert.throws(
    () => recordStructuredFinalAssessment(store, { sessionId:session.id, treatmentId:treatment.id, frequency:'', imbalancePercent:15 }),
    /frequência vibracional/i,
    'final assessment frequency is required in the domain'
  );
  assert.throws(
    () => recordStructuredFinalAssessment(store, { sessionId:session.id, treatmentId:treatment.id, frequency:'6500', imbalancePercent:'' }),
    /percentual de desequilíbrio/i,
    'final assessment imbalance is required in the domain'
  );
  recordStructuredFinalAssessment(store, { sessionId:session.id, treatmentId:treatment.id, frequency:'6500', imbalancePercent:15, needsNewTreatment:true, nextTreatmentWhen:'em 7 dias' });
  assert.equal(store.getState().assessments.length, 1);
  assert.equal(store.getState().assessments[0].needsNewTreatment, true);
}

{
  const store = fakeStore();
  const session = startSession(store);
  prepare(store, session.id);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Joana', birthDate:'1988-06-06' });
  const inv = startInvestigation(store, session.id, person.id);
  answerInvestigation(store, inv.id, 'YES');
  answerInvestigation(store, inv.id, 'NO');
  answerInvestigation(store, inv.id, 'NO');
  const findings = confirmFindings(store, inv.id, ['q1']);
  assert.equal(findings.length, 1);
  const { treatment } = createTreatment(store, { sessionId:session.id, assistedEntityId:person.id, findingIds:[findings[0].id], title:'Revisão', componentName:'A' });
  reviewTreatment(store, { sessionId:session.id, treatmentId:treatment.id, verifiedComplete:false, imbalancePercent:20 });
  assert.equal(store.getState().treatmentReviews.length, 1);
}

{
  const store = fakeStore();
  const session = startSession(store);
  const person = createAssistedEntity(store, { type:'PERSON', displayName:'Rita', birthDate:'1970-05-05' });
  const app = startReiki(store, session.id, person.id);
  store.advance(10 * 60 * 1000);
  pauseReiki(store, app.id);
  store.advance(5 * 60 * 1000);
  resumeReiki(store, app.id);
  store.advance(10 * 60 * 1000);
  completeReiki(store, app.id, 'ok');
  const done = store.getState().reikiApplications[0];
  assert.equal(done.durationSeconds, 20 * 60, 'paused time must not count');
}

{
  const store = fakeStore();
  const situation = createValidatedAssistedEntity(store, {
    type:'SITUATION', displayName:'Processo familiar', identifier:'PROC-123', relatedPerson:'Maria Silva', members:[]
  });
  assert.equal(situation.relatedPerson, 'Maria Silva');
  assert.equal(store.getState().assistedEntities[0].relatedPerson, 'Maria Silva');
}

assert.throws(() => createAssistedEntity(fakeStore(), { type:'PERSON', displayName:'Sem data' }), /nascimento/);
assert.throws(() => validateAssistedInput({ type:'PERSON', displayName:'Sem data' }), /nascimento/);
assert.throws(() => validateAssistedInput({ type:'ENVIRONMENT', displayName:'Casa' }), /Endereço/);
assert.throws(() => validateAssistedInput({ type:'GROUP', displayName:'Família', members:[] }), /(pessoa|integrante)/);
assert.throws(() => validateAssistedInput({ type:'SITUATION', displayName:'Processo', identifier:'123' }), /envolvida|solicitante/i);
validateAssistedInput({ type:'SITUATION', displayName:'Processo', identifier:'123', relatedPerson:'Maria Silva' });
validateAssistedInput({ type:'GROUP', displayName:'Família', members:[{ fullName:'A Pessoa', birthDate:'1980-01-01' }] });

console.log('Fluxa domain tests: OK');
