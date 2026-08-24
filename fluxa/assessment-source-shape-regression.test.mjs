import assert from 'node:assert/strict';
import { recordOrientingAssessment } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial);
  let seq = 0;
  return {
    getState: () => state,
    setState(updater) {
      state = structuredClone(typeof updater === 'function' ? updater(state) : updater);
      return state;
    },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-24T16:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const catalog = [
  { id:'root_patterns', name:'Padrões Repetitivos', category:'Investigações profundas' },
  { id:'root_master', name:'Protocolo Mestre de Causa Raiz', category:'Protocolo Mestre' }
];
const sourceAssessment = {
  id:'assess_general', kind:'GENERAL', sessionId:'ses_1', assistedEntityId:'ast_1',
  subject:'Frequência vibracional', result:'8500', createdAt:'2026-08-24T15:50:00Z'
};
const baseState = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[null, undefined, sourceAssessment], investigations:[], events:[]
};

const store = fakeStore(baseState);
const recorded = recordOrientingAssessment(store, {
  sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
}, catalog);
assert.equal(recorded.sourceAssessmentId, 'assess_general', 'Malformed neighboring assessment entries must not hide a valid source assessment later in the collection.');
assert.equal(store.getState().assessments.find((item) => item?.id === 'assess_general')?.followUpAssessmentId, recorded.id, 'The valid source assessment must retain the forward link after malformed neighboring entries.');
assert.equal(store.getState().events.length, 1, 'A valid handoff after malformed neighboring entries should append exactly one history event.');
assert.equal(store.getState().events[0].eventType, 'ORIENTING_ASSESSMENT_RECORDED');

const missingSourceStore = fakeStore({ ...baseState, assessments:[null, undefined] });
assert.throws(
  () => recordOrientingAssessment(missingSourceStore, {
    sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
  }, catalog),
  /avaliação de origem não pertence ao atendimento atual/i,
  'Malformed source collections must fail with the domain error instead of a property-access TypeError.'
);
assert.equal(missingSourceStore.getState().events.length, 0, 'Rejected source lookup must not append history.');
assert.equal(missingSourceStore.getState().assessments.filter(Boolean).length, 0, 'Rejected source lookup must not create an orienting assessment.');

console.log('assessment-source-shape-regression.test.mjs: ok');
