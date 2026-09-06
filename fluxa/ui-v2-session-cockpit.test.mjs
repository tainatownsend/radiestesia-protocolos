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
  nextAction:'Iniciar investigação',
  nextActionCode:'INVESTIGATE',
  nextReason:'Pronta para investigar.',
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
assert.match(html, /data-v2-preview-action="investigate"/);
assert.match(html, /data-v2-preview-action="treat"/);
assert.doesNotMatch(html, /v2-kpis/);
assert.doesNotMatch(html, /v2-session-state/);
assert.doesNotMatch(source, /statusLine\(/);

const investigationHtml = sessionCockpit({
  ...baseModel,
  nextAction:'Continuar investigação',
  nextActionCode:'TRIAGE',
  nextReason:'Triagem em andamento.',
  reiki:null,
});
assert.match(investigationHtml, /Continuar investigação/);
assert.doesNotMatch(investigationHtml, /Ações da sessão/,'An active investigation must remain the single guided path.');
assert.doesNotMatch(investigationHtml, /data-v2-preview-action="treat"/);
assert.doesNotMatch(investigationHtml, /data-v2-preview-action="reiki"/);

const reikiHtml = sessionCockpit({
  ...baseModel,
  nextAction:'Acompanhar Reiki',
  nextActionCode:'REIKI_ACTIVE',
  nextReason:'Marina · Sessão · aplicação em andamento.',
  reiki:{ status:'RUNNING', assistedName:'Marina', modeLabel:'Sessão' },
});
assert.equal((reikiHtml.match(/class="v2-session-indicator"/g) || []).length, 3, 'Reiki state must not change compact snapshot geometry.');
assert.match(reikiHtml, /Acompanhar Reiki/,'Active Reiki remains visible through the primary recommendation instead of adding a layout-shifting KPI.');
assert.doesNotMatch(reikiHtml, /Ações da sessão/,'Active Reiki must not compete with new investigation/treatment actions.');

const reikiContextHtml = sessionCockpit({
  ...baseModel,
  assistedName:'João',
  nextAction:'Voltar para Marina',
  nextActionCode:'REIKI_CONTEXT',
  nextReason:'Há uma aplicação vinculada a Marina.',
  reiki:{ status:'PAUSED', assistedName:'Marina', modeLabel:'Sessão' },
});
assert.match(reikiContextHtml, /Voltar para Marina/);
assert.doesNotMatch(reikiContextHtml, /Ações da sessão/,'Reiki context recovery must stay the single guided action until the correct assisted is restored.');

console.log('ui-v2-session-cockpit.test.mjs: ok');
