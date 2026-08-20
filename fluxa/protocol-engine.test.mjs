import assert from 'node:assert/strict';
import { startSession, createAssistedEntity } from './domain.js';
import { PROTOCOL_LIBRARY, startBranchingInvestigation, answerBranchingInvestigation, currentProtocolNode, confirmBranchingFindings } from './protocol-engine.js';

function makeState() {
  return { version:3, meta:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[], investigations:[], findings:[], treatments:[], treatmentComponents:[], treatmentReviews:[], assessments:[], reikiApplications:[] };
}
function fakeStore() {
  let state = makeState(); let seq = 0; let now = Date.parse('2026-08-19T10:00:00Z');
  return { getState:()=>state, setState(updater){ state = typeof updater === 'function' ? updater(state) : updater; return state; }, makeId(prefix='id'){ return `${prefix}_${++seq}`; }, nowIso(){ return new Date(now).toISOString(); } };
}

assert.ok(PROTOCOL_LIBRARY.length >= 2);
assert.equal(new Set(PROTOCOL_LIBRARY.map((p) => p.versionId)).size, PROTOCOL_LIBRARY.length);

{
  const store = fakeStore();
  const session = startSession(store);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Teste', birthDate:'1980-01-01' });
  const inv = startBranchingInvestigation(store, session.id, assisted.id, 'causa_raiz');
  assert.equal(currentProtocolNode(inv).id, 'q1');
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'YES');
  answerBranchingInvestigation(store, inv.id, 'YES');
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(currentProtocolNode(completed).type, 'END');
  assert.equal(completed.protocolVersionId, 'causa_raiz_v1');
  const yesNodes = completed.answers.filter((item) => item.answer === 'YES').map((item) => item.nodeId);
  const findings = confirmBranchingFindings(store, inv.id, yesNodes.slice(0,1), 'CAUSE');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].classification, 'CAUSE');
  assert.equal(store.getState().findings.length, 1);
}

{
  const store = fakeStore();
  const session = startSession(store);
  const assisted = createAssistedEntity(store, { type:'PERSON', displayName:'Teste 2', birthDate:'1980-01-01' });
  const inv = startBranchingInvestigation(store, session.id, assisted.id, 'investigacao_inicial');
  answerBranchingInvestigation(store, inv.id, 'NO');
  const completed = store.getState().investigations.find((item) => item.id === inv.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.endNodeId, 'end_clear');
  assert.equal(completed.answers.length, 1);
}

console.log('Fluxa protocol engine tests: OK');
