import assert from 'node:assert/strict';
import { addSessionNote } from './domain.js';

let sequence = 0;
let state = {
  sessions: [{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_a' }],
  assistedEntities: [
    { id:'ast_a', archivedAt:null },
    { id:'ast_b', archivedAt:null }
  ],
  events: []
};
const store = {
  getState: () => state,
  setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
  makeId(prefix='id') { sequence += 1; return `${prefix}_${sequence}`; },
  nowIso: () => '2026-08-26T22:50:00.000Z'
};

assert.throws(
  () => addSessionNote(store, 'ses_1', 'ast_b', 'Nota para o assistido errado'),
  /Assistido atual não corresponde à anotação/,
  'A session note must not be recorded for a different Assisted than the active session context.'
);
assert.equal(state.events.length, 0, 'Rejected note must not write history.');

state.sessions[0].currentAssistedEntityId = null;
assert.throws(
  () => addSessionNote(store, 'ses_1', 'ast_a', 'Nota sem contexto'),
  /Selecione o Assistido da sessão/,
  'A session note requires an explicit current Assisted.'
);
assert.equal(state.events.length, 0, 'Missing-context rejection must not write history.');

state.sessions[0].currentAssistedEntityId = 'ast_a';
addSessionNote(store, 'ses_1', 'ast_a', '  Nota válida da sessão  ');
assert.equal(state.events.length, 1, 'A valid note should write one history event.');
assert.equal(state.events[0].eventType, 'NOTE_CREATED');
assert.equal(state.events[0].sessionId, 'ses_1');
assert.equal(state.events[0].assistedEntityId, 'ast_a');
assert.equal(state.events[0].metadata.body, 'Nota válida da sessão');

console.log('session-note-assisted-context.test.mjs: ok');
