import assert from 'node:assert/strict';
import { requireOpenSessionState, requirePreparedSessionState, isSessionPrepared } from './session-rules.js';

const state={
  sessions:[{id:'s1',status:'OPEN'},{id:'s2',status:'CLOSED'}],
  preparationRuns:[]
};

assert.equal(requireOpenSessionState(state,'s1').id,'s1');
assert.throws(()=>requireOpenSessionState(state,'s2'),/sessão aberta/);
assert.equal(isSessionPrepared(state,'s1'),false);
assert.throws(()=>requirePreparedSessionState(state,'s1'),/preparação/);
state.preparationRuns.push({id:'p1',sessionId:'s1',status:'COMPLETED'});
assert.equal(isSessionPrepared(state,'s1'),true);
assert.equal(requirePreparedSessionState(state,'s1').id,'s1');

console.log('session-rules.test.mjs: ok');
