import assert from 'node:assert/strict';
import { suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

const aliasedCatalog = [
  { id:'root_shared', name:'Carreira / Profissional', category:'Temas essenciais' },
  { id:'root_shared', name:'Propósito e Caminho de Vida', category:'Legacy alias' },
  { id:'root_other', name:'Protocolo Mestre de Causa Raiz', category:'Investigação profunda' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['career'], aliasedCatalog).map((item) => item.protocolId),
  ['root_shared'],
  'Assessment suggestions should not show the same protocol identity twice when legacy catalog aliases use different names.'
);

const numericIdentityCatalog = [
  { id:42, name:'Carreira / Profissional', category:'Legacy numeric' },
  { id:42, name:'Propósito e Caminho de Vida', category:'Legacy numeric alias' },
  { id:'42', name:'Protocolo Mestre de Causa Raiz', category:'String identity' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['career','patterns'], numericIdentityCatalog, 6).map((item) => item.protocolId),
  [42,'42'],
  'Deduplication should preserve strict protocol identity semantics so numeric and string IDs remain distinct.'
);

console.log('assessment-protocol-id-dedup.test.mjs: ok');
