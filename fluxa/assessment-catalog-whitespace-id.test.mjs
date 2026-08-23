import assert from 'node:assert/strict';
import { suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

const catalog = [
  { id:'   ', name:'Vida Financeira', category:'Malformed legacy row' },
  { id:'\t\n', name:'Prosperidade e Abundância', category:'Malformed legacy row' },
  { id:'root_finance_valid', name:'  VIDA FINANCEIRA  ', category:'Temas essenciais' },
  { id:'root_prosperity_valid', name:'Prosperidade e Abundância', category:'Investigações profundas' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['finance'], catalog).map((item) => item.protocolId),
  ['root_finance_valid','root_prosperity_valid'],
  'Whitespace-only catalog IDs must not shadow later valid protocols with the same normalized label.'
);

console.log('assessment-catalog-whitespace-id.test.mjs: ok');
