import assert from 'node:assert/strict';
import { activeReikiApplication, isReikiEnabled } from './reiki-modality.js';

assert.equal(isReikiEnabled({ settings:{} }), false, 'Reiki must be disabled when no modality setting exists');
assert.equal(isReikiEnabled({ settings:{ therapeuticModalities:{ enabled:['CRYSTALS'] } } }), false, 'other therapies must not enable Reiki');
assert.equal(isReikiEnabled({ settings:{ therapeuticModalities:{ enabled:['REIKI'] } } }), true, 'explicit Reiki configuration must enable new Reiki work');

const state = {
  reikiApplications:[
    { id:'done', sessionId:'ses_1', status:'COMPLETED' },
    { id:'other', sessionId:'ses_2', status:'RUNNING' },
    { id:'paused', sessionId:'ses_1', status:'PAUSED' }
  ]
};
assert.equal(activeReikiApplication(state, 'ses_1')?.id, 'paused', 'paused Reiki in the current session must remain recoverable');
assert.equal(activeReikiApplication(state, 'ses_2')?.id, 'other', 'running Reiki in another session must not be confused with the current session');
assert.equal(activeReikiApplication({ reikiApplications:[{ id:'done', sessionId:'ses_1', status:'COMPLETED' }] }, 'ses_1'), null, 'completed Reiki must not count as active work');

console.log('reiki-session-modality-gate.test.mjs: ok');
