import assert from 'node:assert/strict';
import { recordOrientingAssessment } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T21:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const catalog = [{ id:'root_finance', name:'Vida Financeira', category:'Temas essenciais' }];
const baseState = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[], investigations:[], events:[]
};

const nullInputStore = fakeStore(baseState);
let nullInputError = null;
try { recordOrientingAssessment(nullInputStore, null, catalog); } catch (error) { nullInputError = error; }
assert.ok(nullInputError instanceof Error, 'Missing assessment input must be rejected.');
assert.equal(nullInputError instanceof TypeError, false, 'Missing assessment input must fail through a domain error instead of property dereference TypeError.');
assert.equal(nullInputStore.getState().assessments.length, 0, 'Rejected missing input must not create an assessment.');
assert.equal(nullInputStore.getState().events.length, 0, 'Rejected missing input must not append history.');

const malformedSourceStore = fakeStore({ ...baseState, assessments:{ legacy:'corrupt-shape' } });
assert.throws(
  () => recordOrientingAssessment(malformedSourceStore, {
    sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_old', focusAreas:['finance']
  }, catalog),
  /avaliação de origem/i,
  'Malformed imported assessment collections must fail closed at the source-assessment boundary.'
);
assert.deepEqual(malformedSourceStore.getState().assessments, { legacy:'corrupt-shape' }, 'Rejected malformed source state must not be mutated.');

const malformedEventsStore = fakeStore({ ...baseState, events:{ legacy:'corrupt-shape' } });
const recorded = recordOrientingAssessment(malformedEventsStore, {
  sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:['finance']
}, catalog);
assert.equal(recorded.kind, 'ORIENTING');
assert.equal(malformedEventsStore.getState().assessments.length, 1, 'Valid assessment recording must remain available when only the event collection is malformed.');
assert.ok(Array.isArray(malformedEventsStore.getState().events), 'Malformed local event collections should be normalized before appending new history.');
assert.equal(malformedEventsStore.getState().events.length, 1, 'Event normalization must append exactly the new assessment history event.');
assert.equal(malformedEventsStore.getState().events[0].eventType, 'ORIENTING_ASSESSMENT_RECORDED');

console.log('assessment-record-shape-guard.test.mjs: ok');
