import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';

const source = fs.readFileSync(new URL('./ui-v2/session/session-cockpit.js', import.meta.url), 'utf8');
const baseModel = {
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
};
const html = sessionCockpit({ ...baseModel, reiki:null });

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

const reikiHtml = sessionCockpit({
  ...baseModel,
  nextAction:'Acompanhar Reiki',
  nextReason:'Marina · Sessão · aplicação em andamento.',
  reiki:{ status:'RUNNING', assistedName:'Marina', modeLabel:'Sessão' },
});
assert.equal((reikiHtml.match(/class="v2-session-indicator"/g) || []).length, 3, 'Reiki state must not change compact snapshot geometry.');
assert.match(reikiHtml, /Acompanhar Reiki/,'Active Reiki remains visible through the primary recommendation instead of adding a layout-shifting KPI.');

console.log('ui-v2-session-cockpit.test.mjs: ok');
