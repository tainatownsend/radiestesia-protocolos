import assert from 'node:assert/strict';
import { interruptTreatment } from './domain.js';

let sequence = 0;
let state = {
  sessions: [{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_b' }],
  preparationRuns: [{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  treatments: [{ id:'trt_1', assistedEntityId:'ast_a', status:'IN_PROGRESS', interruptedAt:null, updatedAt:'2026-08-26T22:00:00.000Z' }],
  treatmentComponents: [{ id:'cmp_1', treatmentId:'trt_1', status:'IN_PROGRESS', interruptedAt:null, updatedAt:'2026-08-26T22:00:00.000Z' }],
  events: []
};
const store = {
  getState: () => state,
  setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
  makeId(prefix='id') { sequence += 1; return `${prefix}_${sequence}`; },
  nowIso: () => '2026-08-26T23:00:00.000Z'
};

assert.throws(
  () => interruptTreatment(store, 'trt_1', 'Pausa de teste'),
  /Assistido atual não corresponde ao tratamento/,
  'Interrupting a treatment must require the treatment Assisted to be the current session context.'
);
assert.equal(state.treatments[0].status, 'IN_PROGRESS', 'Rejected interruption must not change treatment status.');
assert.equal(state.treatmentComponents[0].status, 'IN_PROGRESS', 'Rejected interruption must not change component status.');
assert.equal(state.events.length, 0, 'Rejected interruption must not write history.');

state.sessions[0].currentAssistedEntityId = null;
assert.throws(
  () => interruptTreatment(store, 'trt_1', 'Pausa sem contexto'),
  /Selecione o Assistido do tratamento/,
  'Interrupting a treatment requires an explicit current Assisted.'
);
assert.equal(state.events.length, 0, 'Missing-context rejection must not write history.');

state.sessions[0].currentAssistedEntityId = 'ast_a';
interruptTreatment(store, 'trt_1', '  Pausa válida  ');
assert.equal(state.treatments[0].status, 'INTERRUPTED');
assert.equal(state.treatmentComponents[0].status, 'INTERRUPTED');
assert.equal(state.events.length, 1);
assert.equal(state.events[0].eventType, 'TREATMENT_INTERRUPTED');
assert.equal(state.events[0].assistedEntityId, 'ast_a');
assert.equal(state.events[0].metadata.reason, 'Pausa válida');

console.log('treatment-interrupt-assisted-context.test.mjs: ok');
