import assert from 'node:assert/strict';
import { inferTreatmentTheme } from './treatment-theme-parser.js';

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

console.log('treatment-theme-short-keyword-boundary.test.mjs: ok');
