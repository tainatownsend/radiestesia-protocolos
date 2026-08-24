import assert from 'node:assert/strict';
import { matchesTreatmentThemeSearch, normalizeTreatmentThemeText } from './treatment-theme-parser.js';

assert.equal(
  matchesTreatmentThemeSearch('Autoestima e amor próprio', '“autoestima” amor próprio!'),
  true,
  'Quoted or emphatic search text must not hide an otherwise valid treatment-theme match.'
);
assert.equal(
  matchesTreatmentThemeSearch('Carreira e propósito profissional', "'carreira' propósito?"),
  true,
  'Straight quotes and question marks should be treated as cosmetic punctuation in treatment discovery.'
);
assert.equal(
  matchesTreatmentThemeSearch('Vida social e pertencimento', 'vida social… pertencimento'),
  true,
  'Ellipsis punctuation should be equivalent to spacing during treatment discovery.'
);
assert.equal(
  normalizeTreatmentThemeText('“Financeiro!” ‘prosperidade?’'),
  'financeiro prosperidade'
);

console.log('treatment-theme-search-quotes.test.mjs: ok');
