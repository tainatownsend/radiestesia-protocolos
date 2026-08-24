import assert from 'node:assert/strict';
import { linkOrientingAssessmentToProtocol, suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

function makeStore(state) {
  let current = structuredClone(state);
  let seq = 0;
  return {
    getState: () => structuredClone(current),
    setState: (updater) => { current = updater(current); },
    makeId: (prefix) => `${prefix}-${++seq}`,
    nowIso: () => '2026-08-24T01:00:00.000Z',
    snapshot: () => structuredClone(current)
  };
}

const catalog = [
  { id:'bad-empty-name', name:'   ', category:'Investigação' },
  { id:'bad-non-string-name', name:true, category:'Investigação' },
  { id:'career-valid', name:'Carreira / Profissional', category:'Investigação' }
];

const suggestions = suggestProtocolsForAreas(['career'], catalog, 3);
assert.deepEqual(suggestions.map((item) => item.protocolId), ['career-valid']);
assert.equal(suggestions[0].protocolName, 'Carreira / Profissional');

const baseState = {
  sessions:[{ id:'session-1', status:'PREPARED', currentAssistedEntityId:'assisted-1' }],
  assessments:[{
    id:'assessment-1', kind:'ORIENTING', sessionId:'session-1', assistedEntityId:'assisted-1',
    protocolSuggestions:[{ protocolId:'career-valid', protocolName:'   ' }],
    selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null
  }],
  investigations:[{
    id:'investigation-1', kind:'ROOT_PROTOCOL', protocolId:'career-valid', assistedEntityId:'assisted-1', currentSessionId:'session-1'
  }],
  events:[]
};

const whitespaceStore = makeStore(baseState);
assert.throws(
  () => linkOrientingAssessmentToProtocol(whitespaceStore, 'assessment-1', { protocolId:'career-valid', investigationId:'investigation-1' }),
  /não pertence às sugestões desta avaliação/
);
assert.equal(whitespaceStore.snapshot().assessments[0].linkedInvestigationId, null);
assert.equal(whitespaceStore.snapshot().events.length, 0);

const nonStringStore = makeStore({
  ...baseState,
  assessments:[{ ...baseState.assessments[0], protocolSuggestions:[{ protocolId:'career-valid', protocolName:42 }] }]
});
assert.throws(
  () => linkOrientingAssessmentToProtocol(nonStringStore, 'assessment-1', { protocolId:'career-valid', investigationId:'investigation-1' }),
  /não pertence às sugestões desta avaliação/
);
assert.equal(nonStringStore.snapshot().assessments[0].selectedProtocolId, null);
assert.equal(nonStringStore.snapshot().events.length, 0);

const validStore = makeStore({
  ...baseState,
  assessments:[{ ...baseState.assessments[0], protocolSuggestions:[{ protocolId:'career-valid', protocolName:'Carreira / Profissional' }] }]
});
const linked = linkOrientingAssessmentToProtocol(validStore, 'assessment-1', { protocolId:'career-valid', investigationId:'investigation-1' });
assert.equal(linked.selectedProtocolId, 'career-valid');
assert.equal(linked.selectedProtocolName, 'Carreira / Profissional');
assert.equal(linked.linkedInvestigationId, 'investigation-1');
assert.equal(validStore.snapshot().events.length, 1);
assert.equal(validStore.snapshot().events[0].eventType, 'ASSESSMENT_PROTOCOL_SELECTED');

console.log('assessment suggestion name integrity regression passed');
