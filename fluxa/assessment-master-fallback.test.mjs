import assert from 'node:assert/strict';
import { suggestProtocolsForAreas, recordOrientingAssessment } from './assessment-protocol-handoff.js';

const master = { id:'protocol_master', name:'Protocolo Mestre de Causa Raiz', category:'Causa raiz' };
const catalog = [master];

const suggestions = suggestProtocolsForAreas(['finance'], catalog, 3);
assert.deepEqual(
  suggestions.map((item) => item.protocolId),
  ['protocol_master'],
  'A valid focus area must fall back to the Master protocol when its specific protocols are unavailable.'
);
assert.match(suggestions[0].reason, /Fallback/, 'Fallback provenance must be explicit.');

let sequence = 0;
let state = {
  sessions:[{ id:'ses_1', status:'OPEN', currentAssistedEntityId:'ast_1' }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
  assessments:[],
  events:[]
};
const store = {
  getState: () => state,
  setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
  makeId(prefix='id') { sequence += 1; return `${prefix}_${sequence}`; },
  nowIso: () => '2026-08-26T21:50:00.000Z'
};

const assessment = recordOrientingAssessment(store, {
  sessionId:'ses_1',
  assistedEntityId:'ast_1',
  focusAreas:['finance']
}, catalog);
assert.equal(assessment.protocolSuggestions.length, 1);
assert.equal(assessment.protocolSuggestions[0].protocolId, 'protocol_master');
assert.equal(state.assessments.length, 1);
assert.equal(state.events.at(-1)?.eventType, 'ORIENTING_ASSESSMENT_RECORDED');
assert.deepEqual(state.events.at(-1)?.metadata?.suggestedProtocolIds, ['protocol_master']);

const specificCatalog = [
  { id:'protocol_finance', name:'Vida Financeira', category:'Financeiro' },
  master
];
assert.equal(
  suggestProtocolsForAreas(['finance'], specificCatalog, 3)[0]?.protocolId,
  'protocol_finance',
  'Specific protocols must remain preferred when available.'
);

console.log('assessment-master-fallback.test.mjs: ok');
