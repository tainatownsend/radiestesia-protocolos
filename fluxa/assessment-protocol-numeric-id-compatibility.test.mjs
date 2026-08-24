import assert from 'node:assert/strict';
import { suggestProtocolsForAreas, linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T23:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const suggestions = suggestProtocolsForAreas(['career'], [
  { id:Infinity, name:'Carreira / Profissional', category:'Malformed import' },
  { id:42, name:'Carreira / Profissional', category:'Legacy numeric identity' },
  { id:NaN, name:'Propósito e Caminho de Vida', category:'Malformed import' },
  { id:84, name:'Propósito e Caminho de Vida', category:'Legacy numeric identity' }
]);

assert.deepEqual(
  suggestions.map((item) => item.protocolId),
  [42, 84],
  'Finite numeric legacy IDs must remain discoverable while non-finite numeric IDs are ignored.'
);

const state = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[{
    id:'assess_1', kind:'ORIENTING', sessionId:'ses_1', assistedEntityId:'ast_1',
    protocolSuggestions:[{ protocolId:42, protocolName:'Carreira / Profissional' }],
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null
  }],
  investigations:[{
    id:'inv_1', kind:'ROOT_PROTOCOL', protocolId:42, assistedEntityId:'ast_1',
    currentSessionId:'ses_1', status:'IN_PROGRESS'
  }],
  events:[]
};

const store = fakeStore(state);
const linked = linkOrientingAssessmentToProtocol(store, 'assess_1', { protocolId:42, investigationId:'inv_1' });
assert.equal(linked.selectedProtocolId, 42, 'Finite numeric legacy IDs must remain linkable when the suggestion and investigation identities match exactly.');
assert.equal(linked.linkedInvestigationId, 'inv_1');
assert.equal(store.getState().events.length, 1, 'A valid numeric-ID link must append exactly one history event.');
assert.equal(store.getState().events[0].eventType, 'ASSESSMENT_PROTOCOL_SELECTED');

console.log('assessment-protocol-numeric-id-compatibility.test.mjs: ok');
