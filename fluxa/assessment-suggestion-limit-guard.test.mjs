import assert from 'node:assert/strict';
import { suggestProtocolsForAreas } from './assessment-protocol-handoff.js';

const catalog = [
  { id:'career', name:'Carreira / Profissional' },
  { id:'purpose', name:'Propósito e Caminho de Vida' },
  { id:'patterns', name:'Padrões Repetitivos' },
  { id:'master', name:'Protocolo Mestre de Causa Raiz' }
];

assert.equal(
  suggestProtocolsForAreas(['career','patterns'], catalog, Infinity).length,
  3,
  'Non-finite suggestion limits should fall back to the default of three.'
);

assert.equal(
  suggestProtocolsForAreas(['career','patterns'], catalog, 0).length,
  3,
  'A zero suggestion limit should preserve the existing default-of-three behavior.'
);

assert.equal(
  suggestProtocolsForAreas(['career','patterns'], catalog, 1.9).length,
  1,
  'Fractional suggestion limits should be normalized to a deterministic integer count.'
);

assert.equal(
  suggestProtocolsForAreas(['career','patterns'], catalog, -4).length,
  1,
  'Negative suggestion limits should remain safely clamped to at least one suggestion.'
);

console.log('assessment-suggestion-limit-guard.test.mjs: ok');
