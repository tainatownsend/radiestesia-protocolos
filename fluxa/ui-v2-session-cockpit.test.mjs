import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';

const source = fs.readFileSync(new URL('./ui-v2/session/session-cockpit.js', import.meta.url), 'utf8');
const html = sessionCockpit({
  sessionOpen:true,
  assistedSelected:true,
  assistedName:'Marina',
  prepared:true,
  hawkinsReady:true,
  hawkins:540,
  nextAction:'Continuar investigação',
  nextReason:'Triagem em andamento.',
  investigations:1,
  treatmentCount:2,
  activeTreatments:1,
  reikiEnabled:true,
  reiki:null,
});

assert.match(html, /Próxima ação recomendada/);
assert.match(html, /v2-session-snapshot/);
assert.match(html, /Preparação/);
assert.match(html, /Hawkins/);
assert.match(html, /Tratamentos ativos/);
assert.match(html, /1 investigação · 2 tratamentos trabalhados/);
assert.ok(html.indexOf('v2-next-action') < html.indexOf('v2-session-snapshot'), 'Next action must appear before compact session indicators.');
assert.ok(html.indexOf('v2-session-snapshot') < html.indexOf('Ações da sessão'), 'Compact indicators must appear before secondary session actions.');
assert.doesNotMatch(html, /v2-kpis/);
assert.doesNotMatch(html, /v2-session-state/);
assert.doesNotMatch(source, /statusLine\(/);

console.log('ui-v2-session-cockpit.test.mjs: ok');
