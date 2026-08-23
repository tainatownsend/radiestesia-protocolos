import assert from 'node:assert/strict';
import { suggestProtocolsForAreas, linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T22:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

assert.deepEqual(
  suggestProtocolsForAreas(['career'], [
    { id:true, name:'Carreira / Profissional', category:'Malformed import' },
    { id:'root_career', name:'Carreira / Profissional', category:'Temas essenciais' },
    { id:'root_purpose', name:'Propósito e Caminho de Vida', category:'Investigações profundas' }
  ]).map((item) => item.protocolId),
  ['root_career','root_purpose'],
  'Malformed boolean protocol IDs must not shadow a valid catalog entry with the same normalized name.'
);

const state = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[{
    id:'assess_1', kind:'ORIENTING', sessionId:'ses_1', assistedEntityId:'ast_1',
    protocolSuggestions:[{ protocolId:true, protocolName:'Malformed legacy suggestion' }],
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null
  }],
  investigations:[{
    id:'inv_1', kind:'ROOT_PROTOCOL', protocolId:true, assistedEntityId:'ast_1',
    currentSessionId:'ses_1', status:'IN_PROGRESS'
  }],
  events:[]
};

const store = fakeStore(state);
assert.throws(
  () => linkOrientingAssessmentToProtocol(store, 'assess_1', { protocolId:true, investigationId:'inv_1' }),
  /não pertence às sugestões/i,
  'Boolean IDs from malformed imported suggestion snapshots must never become linkable protocol identities.'
);
assert.equal(store.getState().assessments[0].linkedInvestigationId, null, 'Rejected malformed protocol IDs must not mutate assessment linkage.');
assert.equal(store.getState().events.length, 0, 'Rejected malformed protocol IDs must not append history.');

console.log('assessment-protocol-id-type-guard.test.mjs: ok');
