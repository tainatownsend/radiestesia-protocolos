import assert from 'node:assert/strict';
import { suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

const catalog = [
  { id:'career', name:'Carreira / Profissional' },
  { id:'purpose', name:'Propósito e Caminho de Vida' },
  { id:'patterns', name:'Padrões Repetitivos' },
  { id:'master', name:'Protocolo Mestre de Causa Raiz' }
];

assert.deepEqual(
  suggestProtocolsForAreas(['career','career','missing-area'], catalog).map((item) => item.protocolId),
  ['career','purpose'],
  'Duplicate and unknown assessment areas should not duplicate or reorder protocol suggestions.'
);

assert.deepEqual(
  suggestProtocolsForAreas(['career','unclear'], catalog).map((item) => item.protocolId),
  ['master'],
  'The unclear area should keep the master protocol as the only direct suggestion even if malformed callers mix it with another area.'
);

assert.deepEqual(
  suggestProtocolsForAreas(null, catalog).map((item) => item.protocolId),
  ['master'],
  'Malformed direct area input should fall back safely to the master protocol suggestion.'
);

console.log('assessment-suggestion-area-normalization.test.mjs: ok');
