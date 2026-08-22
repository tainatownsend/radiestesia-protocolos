import assert from 'node:assert/strict';
import { matchesTreatmentThemeSearch, parseTreatmentPlans } from './treatment-theme-parser.js';

const doubleCall=parseTreatmentPlans('WORK:P("Produtividade consistente","Organizar trabalho e execução diária")','double-call.js');
assert.equal(doubleCall.length,1,'Double-quoted P/C treatment plans must remain discoverable.');
assert.equal(doubleCall[0].legacyId,'WORK');
assert.equal(doubleCall[0].title,'Produtividade consistente');
assert.equal(doubleCall[0].theme,'Carreira');
assert.equal(matchesTreatmentThemeSearch(doubleCall[0].search,'carreira produtividade'),true);

const doubleObject=parseTreatmentPlans('PLAN:{label:"Prosperidade sustentável",command:"Fortalecer relação consciente com dinheiro e recebimento"}','double-object.js');
assert.equal(doubleObject.length,1,'Double-quoted object treatment plans must remain discoverable.');
assert.equal(doubleObject[0].legacyId,'PLAN');
assert.equal(doubleObject[0].theme,'Financeiro');
assert.equal(matchesTreatmentThemeSearch(doubleObject[0].search,'prosperidade financeiro'),true);

const escaped=parseTreatmentPlans('ESC:P("Limites profissionais","Trabalhar \\"visibilidade\\" sem abandonar limites")','escaped.js');
assert.equal(escaped.length,1,'Escaped quotes inside double-quoted plans must not truncate the plan.');
assert.equal(escaped[0].command,'Trabalhar "visibilidade" sem abandonar limites');

console.log('treatment-theme-parser-quote-coverage.test.mjs: ok');