import assert from 'node:assert/strict';
import { startSession, closeSession, createAssistedEntity, selectAssistedForSession, startPreparation, togglePreparationStep, completePreparation, PREPARATION_STEPS } from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { PROTOCOL_LIBRARY, startBranchingInvestigation, resumeBranchingInvestigation, answerBranchingInvestigation, currentProtocolNode, confirmBranchingFindings } from './protocol-engine.js';

function makeState() {
  return { version:5, meta:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[], investigations:[], findings:[], treatments:[], treatmentComponents:[], componentReviews:[], treatmentReviews:[], assessments:[], reikiApplications:[], tools:[] };
}
function fakeStore() {
  let state = makeState(); let seq = 0; let now = Date.parse('2026-08-19T10:00:00Z');
  return { getState:()=>state, setState(updater){ state = typeof updater === 'function' ? updater(state) : updater; return state; }, makeId(prefix='id'){ return `${prefix}_${++seq}`; }, nowIso(){ return new Date(now).toISOString(); }, advance(ms){ now += ms; } };
}
function prepare(store, sessionId) {
  const run = startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}
function measureBaseline(store, sessionId, assistedEntityId, hertz=450) {
  selectAssistedForSession(store, sessionId, assistedEntityId);
  return recordHawkinsBaseline(store, { sessionId, assistedEntityId, hertz });
}
function startMeasured(store, sessionId, assistedEntityId, protocolId) {
  measureBaseline(store, sessionId, assistedEntityId);
  return startBranchingInvestigation(store, sessionId, assistedEntityId, protocolId);
}

assert.ok(PROTOCOL_LIBRARY.length >= 4);
assert.ok(PROTOCOL_LIBRARY.some((p) => p.id === 'investigacao_completa'));
assert.ok(PROTOCOL_LIBRARY.some((p) => p.id === 'protocolo_especifico'));
assert.equal(new Set(PROTOCOL_LIBRARY.map((p) => p.versionId)).size, PROTOCOL_LIBRARY.length);

{
  const store = fakeStore();
  const session = startSession(store);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Sem preparo', birthDate:'1980-01-01' });
  assert.throws(() => startBranchingInvestigation(store, session.id, assisted.id, 'causa_raiz'), /preparação/);
}

{
  const store = fakeStore();
  const session = startSession(store); prepare(store, session.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Sem Hawkins', birthDate:'1980-01-01' });
  selectAssistedForSession(store, session.id, assisted.id);
  const eventsBefore = store.getState().events.length;
  assert.throws(() => startBranchingInvestigation(store, session.id, assisted.id, 'causa_raiz'), /Hawkins/i);
  assert.equal(store.getState().investigations.length, 0, 'missing Hawkins baseline must not create an investigation');
  assert.equal(store.getState().events.length, eventsBefore, 'rejected investigation start must not append history');
}

{
  const store=fakeStore();
  const session=startSession(store);prepare(store,session.id);
  const owner=createAssistedEntity(store,{type:'PERSON',displayName:'Investigação A',birthDate:'1980-01-01'});
  const other=createAssistedEntity(store,{type:'PERSON',displayName:'Investigação B',birthDate:'1981-01-01'});
  measureBaseline(store,session.id,owner.id);
  selectAssistedForSession(store,session.id,other.id);
  const eventsBefore=store.getState().events.length;
  assert.throws(
    ()=>startBranchingInvestigation(store,session.id,owner.id,'causa_raiz'),
    /Assistido atual não corresponde/i,
    'branching investigation start must not silently replace a different explicit assisted context'
  );
  assert.equal(store.getState().investigations.length,0);
  assert.equal(store.getState().sessions[0].currentAssistedEntityId,other.id);
  assert.equal(store.getState().events.length,eventsBefore);
}

{
  const store = fakeStore();
  const session = startSession(store); prepare(store, session.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Teste', birthDate:'1980-01-01' });
  const other = createAssistedEntity(store, { type:'PERSON', displayName:'Outro contexto', birthDate:'1982-02-02' });
  const inv = startMeasured(store, session.id, assisted.id, 'causa_raiz');
  assert.equal(currentProtocolNode(inv).id, 'q1');
  selectAssistedForSession(store,session.id,other.id);
  const nodeBefore=currentProtocolNode(store.getState().investigations.find((item)=>item.id===inv.id)).id;
  const eventsBefore=store.getState().events.length;
  assert.throws(()=>answerBranchingInvestigation(store,inv.id,'YES'),/Assistido atual não corresponde/i);
  assert.equal(currentProtocolNode(store.getState().investigations.find((item)=>item.id===inv.id)).id,nodeBefore);
  assert.equal(store.getState().events.length,eventsBefore,'rejected answer must not append history');
  selectAssistedForSession(store,session.id,assisted.id);
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'YES');
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(currentProtocolNode(completed).type, 'END');
  assert.equal(completed.protocolVersionId, 'causa_raiz_v1');
  const yesNodes = completed.answers.filter((item) => item.answer === 'YES').map((item) => item.nodeId);
  selectAssistedForSession(store,session.id,other.id);
  const findingsBefore=store.getState().findings.length;
  assert.throws(()=>confirmBranchingFindings(store,inv.id,yesNodes.slice(0,1),'CAUSE'),/Assistido atual não corresponde/i);
  assert.equal(store.getState().findings.length,findingsBefore,'rejected finding consolidation must not create findings');
  selectAssistedForSession(store,session.id,assisted.id);
  const findings = confirmBranchingFindings(store, inv.id, yesNodes.slice(0,1), 'CAUSE');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].classification, 'CAUSE');
  assert.equal(store.getState().findings.length, 1);
  assert.throws(() => confirmBranchingFindings(store, inv.id, yesNodes.slice(0,1), 'INVALID'), /Classificação/);
}

{
  const store = fakeStore();
  const session = startSession(store); prepare(store, session.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Teste 2', birthDate:'1980-01-01' });
  const inv = startMeasured(store, session.id, assisted.id, 'investigacao_inicial');
  answerBranchingInvestigation(store, inv.id, 'NO');
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.endNodeId, 'end_clear');
  assert.equal(completed.answers.length, 1);
}

{
  const store = fakeStore();
  const session = startSession(store); prepare(store, session.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Completa', birthDate:'1992-02-02' });
  const inv = startMeasured(store, session.id, assisted.id, 'investigacao_completa');
  for (const answer of ['YES','YES','YES','YES','NO','NO']) {
    answerBranchingInvestigation(store, inv.id, answer);
    if (store.getState().investigations.find((i)=>i.id===inv.id).status === 'COMPLETED') break;
  }
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.protocolVersionId, 'investigacao_completa_v1');
  assert.equal(currentProtocolNode(completed).type, 'END');
}

{
  const store = fakeStore();
  const session = startSession(store); prepare(store, session.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Específico', birthDate:'1991-01-01' });
  const inv = startMeasured(store, session.id, assisted.id, 'protocolo_especifico');
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'NO');
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.protocolVersionId, 'protocolo_especifico_v1');
  assert.equal(completed.endNodeId, 'end_without_finding');
}

{
  const store = fakeStore();
  const first = startSession(store); prepare(store, first.id);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Continuidade', birthDate:'1985-05-05' });
  const other = createAssistedEntity(store, { type:'PERSON', displayName:'Outro retorno', birthDate:'1986-06-06' });
  const inv = startMeasured(store, first.id, assisted.id, 'causa_raiz');
  answerBranchingInvestigation(store, inv.id, 'YES');
  const nodeBefore = currentProtocolNode(store.getState().investigations.find((i) => i.id === inv.id)).id;
  closeSession(store, first.id, { endedAt:store.nowIso() });
  store.advance(60 * 60 * 1000);
  const second = startSession(store);
  assert.throws(() => resumeBranchingInvestigation(store, inv.id, second.id), /preparação/);
  prepare(store, second.id);
  selectAssistedForSession(store,second.id,other.id);
  const resumeEventsBefore=store.getState().events.filter((e)=>e.eventType==='INVESTIGATION_RESUMED').length;
  assert.throws(()=>resumeBranchingInvestigation(store,inv.id,second.id),/Assistido atual não corresponde/i);
  assert.equal(store.getState().investigations.find((i)=>i.id===inv.id).currentSessionId,first.id,'rejected resume must preserve investigation session');
  assert.equal(store.getState().events.filter((e)=>e.eventType==='INVESTIGATION_RESUMED').length,resumeEventsBefore);
  const secondBaseline=measureBaseline(store,second.id,assisted.id,470);
  resumeBranchingInvestigation(store, inv.id, second.id);
  const resumed = store.getState().investigations.find((i) => i.id === inv.id);
  assert.equal(resumed.originSessionId, first.id);
  assert.equal(resumed.currentSessionId, second.id);
  assert.equal(currentProtocolNode(resumed).id, nodeBefore, 'resume must preserve the exact current node');
  assert.equal(store.getState().sessions.find((s) => s.id === second.id).currentAssistedEntityId, assisted.id);
  const resumeEvent=store.getState().events.find((e)=>e.eventType==='INVESTIGATION_RESUMED'&&e.sessionId===second.id);
  assert.ok(resumeEvent);
  assert.equal(resumeEvent.metadata.hawkinsBaselineAssessmentId,secondBaseline.id);
  assert.equal(resumeEvent.metadata.hawkinsBaselineHertz,470);
}

console.log('Fluxa protocol engine tests: OK');
