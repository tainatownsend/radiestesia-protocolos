import assert from 'node:assert/strict';
import { inferTreatmentTheme, matchesTreatmentThemeSearch } from './treatment-theme-parser.js';

assert.equal(
  inferTreatmentTheme('Paixão por projetos', 'Fortalecer entusiasmo criativo e concluir o projeto'),
  'Propósito e criatividade',
  'The short family keyword pai must not match inside paixão.'
);
assert.equal(
  inferTreatmentTheme('Regularizar rotina diária', 'Organizar hábitos e constância'),
  'Outros temas',
  'The short home keyword lar must not match inside regularizar.'
);
assert.equal(
  inferTreatmentTheme('Relação com o pai', 'Harmonizar vínculo com o pai'),
  'Família e ancestralidade',
  'The standalone family keyword pai must remain discoverable.'
);
assert.equal(
  inferTreatmentTheme('Energia do lar', 'Harmonizar o lar e o espaço de moradia'),
  'Casa e ambiente',
  'The standalone home keyword lar must remain discoverable.'
);

assert.equal(
  matchesTreatmentThemeSearch('Paixão por projetos criativos', 'pai'),
  false,
  'Searching for pai must not match inside paixão.'
);
assert.equal(
  matchesTreatmentThemeSearch('Regularizar rotina e hábitos', 'lar'),
  false,
  'Searching for lar must not match inside regularizar.'
);
assert.equal(
  matchesTreatmentThemeSearch('Harmonizar vínculo com o pai', 'pai'),
  true,
  'Standalone short search terms must remain discoverable.'
);
assert.equal(
  matchesTreatmentThemeSearch('Harmonizar energia do lar', 'lar'),
  true,
  'Standalone home search terms must remain discoverable.'
);
assert.equal(
  matchesTreatmentThemeSearch('Apoiar carreira e liderança', 'lider'),
  true,
  'Longer search terms must preserve partial matching behavior.'
);

console.log('treatment-theme-short-keyword-boundary.test.mjs: ok');
