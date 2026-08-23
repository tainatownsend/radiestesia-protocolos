import assert from 'node:assert/strict';
import { suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

const catalog = [
  { id:'root_career_compact', name:'Carreira/Profissional', category:'Temas essenciais' },
  { id:'root_marriage_compact', name:'Casamento/Relacionamento', category:'Temas essenciais' },
  { id:'root_selfworth_compact', name:'Autoestima Amor próprio e Merecimento', category:'Temas essenciais' },
  { id:'root_purpose', name:'Propósito e Caminho de Vida', category:'Investigações profundas' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['career'], catalog).map((item) => item.protocolId),
  ['root_career_compact','root_purpose'],
  'Assessment handoff should tolerate harmless spacing drift around slash separators in catalog protocol names.'
);

assert.deepEqual(
  suggestProtocolsForAreas(['relationship'], catalog).map((item) => item.protocolId),
  ['root_marriage_compact'],
  'Relationship suggestions should remain discoverable when slash separators are compacted.'
);

assert.deepEqual(
  suggestProtocolsForAreas(['selfworth'], catalog).map((item) => item.protocolId),
  ['root_selfworth_compact'],
  'Assessment handoff should tolerate cosmetic punctuation drift without losing a valid catalog protocol.'
);

const duplicateCatalog = [
  { id:'root_career_primary', name:'Carreira / Profissional', category:'Temas essenciais' },
  { id:'root_career_duplicate', name:'Carreira/Profissional', category:'Legacy duplicate' },
  { id:'root_purpose', name:'Propósito e Caminho de Vida', category:'Investigações profundas' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['career'], duplicateCatalog).map((item) => item.protocolId),
  ['root_career_primary','root_purpose'],
  'Separator normalization must preserve deterministic first-valid catalog identity when equivalent labels collide.'
);

const punctuationDuplicateCatalog = [
  { id:'root_selfworth_primary', name:'Autoestima, Amor-próprio e Merecimento', category:'Temas essenciais' },
  { id:'root_selfworth_duplicate', name:'Autoestima Amor próprio e Merecimento', category:'Legacy duplicate' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['selfworth'], punctuationDuplicateCatalog).map((item) => item.protocolId),
  ['root_selfworth_primary'],
  'Punctuation normalization must keep the first valid catalog identity when cosmetic label variants collide.'
);

console.log('assessment-protocol-separator-normalization.test.mjs: ok');
