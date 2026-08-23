import assert from 'node:assert/strict';
import { suggestProtocolsForAreas, recordOrientingAssessment } from './assessment-protocol-handoff.js';

const catalog = [
  { id:'root_master', name:'Protocolo Mestre de Causa Raiz', category:'Protocolo Mestre' },
  { id:'root_finance', name:'Vida Financeira', category:'Temas essenciais' }
];

assert.equal(
  suggestProtocolsForAreas('finance', catalog)[0]?.protocolId,
  'root_master',
  'A malformed non-array focus payload must not be iterated as assessment area IDs and should retain the suggestion-layer master fallback.'
);
assert.deepEqual(
  suggestProtocolsForAreas(['finance'], null),
  [],
  'An unavailable/null therapeutic catalog must degrade to no suggestions instead of throwing a raw TypeError.'
);

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T19:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const preparedState = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assessments:[], investigations:[], events:[]
};

assert.throws(
  () => recordOrientingAssessment(fakeStore(preparedState), {
    sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:'finance'
  }, catalog),
  /Selecione pelo menos uma área/i,
  'Malformed persisted/imported focus shapes must fail through the domain validation message rather than a .filter TypeError.'
);

assert.throws(
  () => recordOrientingAssessment(fakeStore(preparedState), {
    sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:['finance']
  }, null),
  /biblioteca terapêutica/i,
  'A temporarily unavailable catalog must preserve the intended therapeutic-library error path.'
);

console.log('assessment-input-shape-guard.test.mjs: ok');
