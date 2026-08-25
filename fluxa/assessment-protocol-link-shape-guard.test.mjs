import assert from 'node:assert/strict';
import { linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

function fakeStore(initial) {
  let state = structuredClone(initial);
  let seq = 0;
  return {
    getState: () => state,
    setState(updater) {
      state = structuredClone(typeof updater === 'function' ? updater(state) : updater);
      return state;
    },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-23T20:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const session = { id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' };
const preparation = { id:'prep_1', sessionId:'ses_1', status:'COMPLETED' };
const assessment = {
  id:'assess_1', kind:'ORIENTING', sessionId:'ses_1', assistedEntityId:'ast_1',
  protocolSuggestions:[{ protocolId:'root_finance', protocolName:'Vida Financeira' }],
  selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null
};
const investigation = {
  id:'inv_1', kind:'ROOT_PROTOCOL', protocolId:'root_finance', assistedEntityId:'ast_1',
  currentSessionId:'ses_1', status:'IN_PROGRESS'
};
const baseState = {
  sessions:[session], preparationRuns:[preparation], assistedEntities:[{ id:'ast_1', displayName:'Maria' }],
  assessments:[assessment], investigations:[investigation], events:[]
};

const missingAssessmentStore = fakeStore({ ...baseState, assessments:{ legacy:'corrupt-shape' } });
assert.throws(
  () => linkOrientingAssessmentToProtocol(missingAssessmentStore, 'assess_1', { protocolId:'root_finance', investigationId:'inv_1' }),
  /avaliação orientadora não encontrada/i,
  'Malformed local assessment collections should fail with the domain error instead of Array.find TypeError.'
);
assert.equal(missingAssessmentStore.getState().events.length, 0, 'Rejected malformed assessment state must not append history.');

const malformedAssessmentEntriesStore = fakeStore({ ...baseState, assessments:[null, undefined, assessment] });
assert.throws(
  () => linkOrientingAssessmentToProtocol(malformedAssessmentEntriesStore, undefined, { protocolId:'root_finance', investigationId:'inv_1' }),
  /avaliação orientadora não encontrada/i,
  'Null or undefined assessment entries must not turn a missing assessment ID into a property-access TypeError.'
);
assert.equal(malformedAssessmentEntriesStore.getState().events.length, 0, 'Rejected malformed assessment entries must not append history.');

const validAfterMalformedEntriesStore = fakeStore({ ...baseState, assessments:[null, undefined, assessment] });
const linkedAfterMalformedEntries = linkOrientingAssessmentToProtocol(validAfterMalformedEntriesStore, 'assess_1', { protocolId:'root_finance', investigationId:'inv_1' });
assert.equal(linkedAfterMalformedEntries?.linkedInvestigationId, 'inv_1', 'Malformed neighboring entries must not hide a valid assessment later in the collection.');
assert.equal(validAfterMalformedEntriesStore.getState().events.length, 1, 'A valid link after malformed neighboring entries should append exactly one history event.');
assert.equal(validAfterMalformedEntriesStore.getState().events[0].eventType, 'ASSESSMENT_PROTOCOL_SELECTED');

const nullInputStore = fakeStore(baseState);
assert.throws(
  () => linkOrientingAssessmentToProtocol(nullInputStore, 'assess_1', null),
  /não pertence às sugestões/i,
  'Missing link input should be rejected by the domain boundary instead of dereferencing null.'
);
assert.equal(nullInputStore.getState().assessments[0].linkedInvestigationId, null, 'Rejected missing input must not mutate the assessment link.');
assert.equal(nullInputStore.getState().events.length, 0, 'Rejected missing input must not append history.');

const malformedSuggestionsStore = fakeStore({
  ...baseState,
  assessments:[{ ...assessment, protocolSuggestions:{ root_finance:true } }]
});
assert.throws(
  () => linkOrientingAssessmentToProtocol(malformedSuggestionsStore, 'assess_1', { protocolId:'root_finance', investigationId:'inv_1' }),
  /não pertence às sugestões/i,
  'Malformed imported suggestion snapshots must not bypass the recorded-suggestion safety boundary.'
);
assert.equal(malformedSuggestionsStore.getState().assessments[0].linkedInvestigationId, null, 'Malformed suggestion snapshots must not create a treatment link.');

const malformedInvestigationsStore = fakeStore({ ...baseState, investigations:{ inv_1:investigation } });
assert.throws(
  () => linkOrientingAssessmentToProtocol(malformedInvestigationsStore, 'assess_1', { protocolId:'root_finance', investigationId:'inv_1' }),
  /não é um protocolo terapêutico válido/i,
  'Malformed local investigation collections should fail closed instead of throwing Array.find TypeError.'
);
assert.equal(malformedInvestigationsStore.getState().events.length, 0, 'Rejected malformed investigation state must not append history.');

const malformedInvestigationEntriesStore = fakeStore({ ...baseState, investigations:[null, undefined, investigation] });
assert.throws(
  () => linkOrientingAssessmentToProtocol(malformedInvestigationEntriesStore, 'assess_1', { protocolId:'root_finance', investigationId:undefined }),
  /inicie ou retome a investigação/i,
  'Null or undefined neighboring investigations must not turn a missing investigation ID into a property-access error.'
);
assert.equal(malformedInvestigationEntriesStore.getState().events.length, 0, 'Rejected missing investigation IDs must not append history.');

const validInvestigationAfterMalformedEntriesStore = fakeStore({ ...baseState, investigations:[null, undefined, investigation] });
const linkedAfterMalformedInvestigations = linkOrientingAssessmentToProtocol(validInvestigationAfterMalformedEntriesStore, 'assess_1', { protocolId:'root_finance', investigationId:'inv_1' });
assert.equal(linkedAfterMalformedInvestigations?.linkedInvestigationId, 'inv_1', 'Malformed neighboring investigations must not hide a valid investigation later in the collection.');
assert.equal(validInvestigationAfterMalformedEntriesStore.getState().events.length, 1, 'A valid link after malformed investigation neighbors should append exactly one history event.');
assert.equal(validInvestigationAfterMalformedEntriesStore.getState().events[0].eventType, 'ASSESSMENT_PROTOCOL_SELECTED');

console.log('assessment-protocol-link-shape-guard.test.mjs: ok');