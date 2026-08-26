import assert from 'node:assert/strict';
import { confirmFindings } from './domain.js';

let sequence = 0;
let state = {
  sessions: [{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_b' }],
  preparationRuns: [{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  investigations: [{
    id:'inv_1',
    status:'COMPLETED',
    currentSessionId:'ses_1',
    assistedEntityId:'ast_a',
    answers:[{ questionId:'q1', answer:'YES', questionTextSnapshot:'Há um fator relevante?' }]
  }],
  findings: [],
  events: []
};
const store = {
  getState: () => state,
  setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
  makeId(prefix='id') { sequence += 1; return `${prefix}_${sequence}`; },
  nowIso: () => '2026-08-26T18:45:00.000Z'
};

assert.throws(
  () => confirmFindings(store, 'inv_1', ['q1']),
  /Assistido atual não corresponde à investigação/,
  'Findings from one Assisted must not be confirmed while another Assisted is selected.'
);
assert.equal(state.findings.length, 0, 'Rejected confirmation must not create findings.');
assert.equal(state.events.length, 0, 'Rejected confirmation must not write history.');

state.sessions[0].currentAssistedEntityId = 'ast_a';
const created = confirmFindings(store, 'inv_1', ['q1']);
assert.equal(created.length, 1, 'Confirmation should succeed after restoring the investigation Assisted.');
assert.equal(state.findings.length, 1);
assert.equal(state.findings[0].assistedEntityId, 'ast_a');
assert.equal(state.events.length, 1);
assert.equal(state.events[0].eventType, 'FINDING_IDENTIFIED');
assert.equal(state.events[0].assistedEntityId, 'ast_a');

console.log('confirm-findings-assisted-context.test.mjs: ok');
