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
    nowIso() { return `2026-08-24T18:00:${String(seq).padStart(2, '0')}Z`; }
  };
}

const catalog = [
  { id:'root_patterns', name:'Padrões Repetitivos', category:'Investigações profundas' },
  { id:'root_master', name:'Protocolo Mestre de Causa Raiz', category:'Protocolo Mestre' }
];

const baseState = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[{
    id:'assess_general', kind:'GENERAL', sessionId:'ses_1', assistedEntityId:'ast_1',
    subject:'Frequência vibracional', result:'8500', createdAt:'2026-08-24T17:50:00Z'
  }],
  investigations:[], events:[]
};

const store = fakeStore(baseState);
const first = recordOrientingAssessment(store, {
  sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
}, catalog);

const afterFirst = structuredClone(store.getState());
assert.equal(afterFirst.assessments.find((item) => item?.id === 'assess_general')?.followUpAssessmentId, first.id);
assert.equal(afterFirst.events.length, 1);
assert.equal(afterFirst.events[0].eventType, 'ORIENTING_ASSESSMENT_RECORDED');

assert.throws(
  () => recordOrientingAssessment(store, {
    sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
  }, catalog),
  /já possui um próximo passo registrado/i,
  'A source assessment must not create a second orienting handoff once its forward link is set.'
);

const afterRejectedRepeat = store.getState();
assert.deepEqual(afterRejectedRepeat, afterFirst, 'Rejecting a repeated source handoff must not mutate assessments or history.');
assert.equal(afterRejectedRepeat.assessments.filter((item) => item?.kind === 'ORIENTING').length, 1);
assert.equal(afterRejectedRepeat.events.filter((event) => event?.eventType === 'ORIENTING_ASSESSMENT_RECORDED').length, 1);

console.log('assessment-source-repeat-guard.test.mjs: ok');
