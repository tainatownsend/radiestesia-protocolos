import assert from 'node:assert/strict';
import { matchesTreatmentThemeSearch, normalizeTreatmentThemeText } from './treatment-theme-parser.js';

assert.equal(
  matchesTreatmentThemeSearch('Autoestima Amor próprio e Merecimento', 'autoestima, amor-próprio'),
  true,
  'Cosmetic punctuation in the query must not hide a valid treatment-theme match.'
);
assert.equal(
  matchesTreatmentThemeSearch('Vida social e pertencimento', '(vida social); pertencimento'),
  true,
  'Brackets and punctuation should be equivalent to spaces during treatment discovery.'
);
assert.equal(
  matchesTreatmentThemeSearch('Carreira: direção profissional', 'carreira direção profissional'),
  true,
  'Cosmetic punctuation in indexed treatment text must not block an otherwise exact search.'
);
assert.equal(
  normalizeTreatmentThemeText('Financeiro, prosperidade; [merecimento]'),
  'financeiro prosperidade merecimento'
);

console.log('treatment-theme-search-punctuation.test.mjs: ok');
