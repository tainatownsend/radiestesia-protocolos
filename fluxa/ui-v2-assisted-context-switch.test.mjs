import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderAppShell } from './ui-v2/app-shell.js';

const baseModel = {
  source:'live', sessionOpen:true, assistedSelected:true, assistedName:'Marina', prepared:true,
  hawkinsReady:true, hawkins:540, nextActionCode:'INVESTIGATE', nextAction:'Iniciar investigação',
  nextReason:'Pronta para investigar.', investigations:0, treatmentCount:0, activeTreatments:0,
  reikiEnabled:true, reiki:null, treatments:[], historySessions:[], library:{ counts:{} },
};
const ui = { route:'today', sheet:null, justClosedSessionId:null, historySessionId:null, librarySection:'home' };

const availableHtml = renderAppShell(baseModel, ui);
assert.match(availableHtml,/data-v2-preview-action="change-assisted"/);
assert.match(availableHtml,/aria-label="Trocar Assistido · Marina"/);
assert.doesNotMatch(availableHtml,/data-v2-preview-action="change-assisted"[^>]*disabled/,'Context switching should remain available when no contiguous workflow is active.');

const lockedHtml = renderAppShell({
  ...baseModel, nextActionCode:'TRIAGE', nextAction:'Continuar investigação', nextReason:'Triagem em andamento.',
}, ui);
assert.match(lockedHtml,/data-v2-preview-action="change-assisted"[^>]*disabled/,'Changing assisted must be blocked while investigation continuity is active.');

const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
assert.match(index,/name === 'change-assisted'[\s\S]*openSheet\('assisted', action\)/);
assert.match(index,/selectSessionAssisted\(store, assisted\.dataset\.v2SelectAssisted\);[\s\S]*const nextModel = deriveLiveModel\(\);[\s\S]*ui\.sheet = nextModel\.hawkinsReady \? null : 'hawkins';/,'Switching back to an assisted with a current-session baseline must not request Hawkins twice.');

const css = fs.readFileSync(new URL('./ui-v2/mobile-viewport.css', import.meta.url), 'utf8');
assert.match(css,/\.v2-context-chip--button\s*\{[^}]*min-height:\s*44px;/s,'Interactive context chip must meet the mobile touch target.');
assert.match(css,/\.v2-context-chip--button\[disabled\]/);

console.log('ui-v2-assisted-context-switch.test.mjs: ok');
