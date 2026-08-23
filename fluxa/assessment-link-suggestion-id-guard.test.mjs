import assert from 'node:assert/strict';
import { linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T21:30:${String(seq).padStart(2,'0')}Z`; }
  };
}

const baseState = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[{
    id:'assess_1', kind:'ORIENTING', sessionId:'ses_1', assistedEntityId:'ast_1',
    protocolSuggestions:[{ protocolId:'   ', protocolName:'Malformed legacy suggestion' }],
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null
  }],
  investigations:[{
    id:'inv_1', kind:'ROOT_PROTOCOL', protocolId:'   ', assistedEntityId:'ast_1',
    currentSessionId:'ses_1', status:'IN_PROGRESS'
  }],
  events:[]
};

const store = fakeStore(baseState);
assert.throws(
  () => linkOrientingAssessmentToProtocol(store, 'assess_1', { protocolId:'   ', investigationId:'inv_1' }),
  /não pertence às sugestões/i,
  'Whitespace-only IDs from imported suggestion snapshots must not become linkable protocol identities.'
);
assert.equal(store.getState().assessments[0].linkedInvestigationId, null, 'Rejected malformed suggestion IDs must not mutate the assessment link.');
assert.equal(store.getState().events.length, 0, 'Rejected malformed suggestion IDs must not append history.');

console.log('assessment-link-suggestion-id-guard.test.mjs: ok');
