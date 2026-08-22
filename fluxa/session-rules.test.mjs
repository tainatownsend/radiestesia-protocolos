import assert from 'node:assert/strict';
import { requireOpenSessionState, requirePreparedSessionState, requirePreparedAssistedSessionState, isSessionPrepared } from './session-rules.js';

const state={
  sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'ast_1'},{id:'s2',status:'CLOSED',currentAssistedEntityId:'ast_1'}],
  preparationRuns:[]
};

assert.equal(requireOpenSessionState(state,'s1').id,'s1');
assert.throws(()=>requireOpenSessionState(state,'s2'),/sessão aberta/);
assert.equal(isSessionPrepared(state,'s1'),false);
assert.throws(()=>requirePreparedSessionState(state,'s1'),/preparação/);
state.preparationRuns.push({id:'p1',sessionId:'s1',status:'COMPLETED'});
assert.equal(isSessionPrepared(state,'s1'),true);
assert.equal(requirePreparedSessionState(state,'s1').id,'s1');
assert.equal(requirePreparedAssistedSessionState(state,'s1','ast_1').id,'s1');
assert.throws(()=>requirePreparedAssistedSessionState(state,'s1','ast_2'),/Assistido/i,'Prepared actions must not continue after the session context switches to another assisted entity.');
assert.throws(()=>requirePreparedAssistedSessionState(state,'s1',null),/Assistido/i,'Prepared assisted actions require an explicit assisted entity.');
assert.throws(()=>requirePreparedAssistedSessionState(state,'s2','ast_1'),/sessão aberta/i,'Assisted guard must preserve the open-session invariant.');

console.log('session-rules.test.mjs: ok');
