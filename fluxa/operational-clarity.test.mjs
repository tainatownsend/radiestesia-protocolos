import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const ui = fs.readFileSync(new URL('./operational-clarity-ui.js', root), 'utf8');
const css = fs.readFileSync(new URL('./operational-clarity.css', root), 'utf8');
const index = fs.readFileSync(new URL('./index.html', root), 'utf8');

assert.match(ui, /Próxima ação recomendada/, 'Today must expose one explicit recommended next action.');
assert.match(ui, /readyForFinalAssessment/, 'Today and treatment cards must understand final-assessment eligibility.');
assert.match(ui, /Realizar avaliação final/, 'Eligible treatments need a clear final-assessment CTA.');
assert.match(ui, /data-operational-status/, 'Treatment cards need a concise state explanation.');
assert.match(ui, /hawkinsBaselineHertz/, 'Final assessment should surface the linked Hawkins baseline when available.');
assert.match(ui, /data-next-cycle-field/, 'Next-cycle timing must be conditional.');
assert.match(ui, /Concluir tratamento/, 'Final assessment should end with one concise completion action.');
assert.match(css, /\[data-treatment-filters\][\s\S]*overflow-x:\s*auto/, 'Treatment filters should stay compact and horizontally scrollable on mobile.');
assert.match(css, /\.oc-treatment-status/, 'Treatment status guidance must have a dedicated visual surface.');
assert.match(index, /operational-clarity\.css/, 'Operational clarity stylesheet must be loaded.');
assert.match(index, /operational-clarity-ui\.js/, 'Operational clarity enhancer must be loaded.');

console.log('operational-clarity.test.mjs: ok');
