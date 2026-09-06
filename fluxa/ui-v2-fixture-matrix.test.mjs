import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderAppShell } from './ui-v2/app-shell.js';
import { V2_FIXTURES, V2_FIXTURE_ORDER } from './ui-v2/testing/fixtures.js';

const REQUIRED = [
  'no-session','session-preparation-not-started','preparation-1','preparation-4','preparation-invalid-frequency',
  'prepared-no-assisted','assisted-no-hawkins','hawkins-valid','triage-1','triage-3','findings-available',
  'composer-empty','composer-complex','planned-treatment-blocked','active-treatment','treatment-ready-review',
  'component-manual-review','treatment-ready-final','final-assessment','reiki-running','safe-close-review',
  'post-close-summary','history-grouped','acervo-empty',
];

for (const id of REQUIRED) assert.ok(V2_FIXTURE_ORDER.includes(id), `Missing required fixture ${id}`);
assert.ok(V2_FIXTURE_ORDER.length >= 24, 'Blueprint requires at least 24 deterministic V2 states.');
assert.equal(new Set(V2_FIXTURE_ORDER).size, V2_FIXTURE_ORDER.length, 'Fixture ids must be unique.');

const indexLikeUi = {
  route:'today', sheet:null, assistedCreate:false, error:'', activeTreatmentId:null, reviewComponentId:null,
  treatmentDraft:{ title:'', objective:'', modalities:[], findingIds:[], items:[] }, justClosedSessionId:null,
  historySessionId:null, librarySection:'home', importPreview:null,
};
const indexOverrides = {
  historySessions:[], safeClose:null, latestClosedSession:null,
  library:{ assisteds:[], resources:[], protocols:[], therapies:[{id:'RADIESTHESIA',label:'Radiestesia',base:true}], counts:{assisteds:0,resources:0,protocols:0,therapies:1} },
  therapeuticSettings:{enabled:[],custom:[]},
};

for (const id of V2_FIXTURE_ORDER) {
  const source = structuredClone(V2_FIXTURES[id]);
  const model = { ...source, source:'fixture', ...indexOverrides };
  const controllerUi = structuredClone(indexLikeUi);
  const html = renderAppShell(model, controllerUi);
  assert.match(html, /class="v2-app"/, `${id} must render the V2 shell.`);
  assert.doesNotMatch(html, />undefined</, `${id} must not expose undefined copy.`);
  if (source.overlay) {
    assert.match(html, /class="v2-sheet"/, `${id} must render its real MobileSheet surface.`);
    assert.equal(controllerUi.sheet, source.overlay, `${id} must synchronize sheet state back to controller bookkeeping.`);
  }
  if (source.fixtureUi?.route) {
    assert.equal(controllerUi.route, source.fixtureUi.route, `${id} must synchronize its fixture route back to the controller.`);
  }
}

const settingsSource = structuredClone(V2_FIXTURES['settings-local-first']);
const settingsUi = structuredClone(indexLikeUi);
const settingsHtml = renderAppShell({ ...settingsSource, source:'fixture', ...indexOverrides }, settingsUi);
assert.equal(settingsUi.sheet, 'settings', 'Settings fixture must participate in real sheet bookkeeping.');
assert.match(settingsHtml, /data-status="OK"/, 'Settings fixture must render fixed storage-health status without reading live storage.');
assert.doesNotMatch(settingsHtml, /Ainda não realizado/, 'Settings fixture must expose a deterministic last-export timestamp.');

const fixtureSource = fs.readFileSync(new URL('./ui-v2/testing/fixtures.js', import.meta.url), 'utf8');
const visualFixtureSource = fs.readFileSync(new URL('./ui-v2/testing/fixture-visual-data.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('./ui-v2/app-shell.js', import.meta.url), 'utf8');
const settingsSheet = fs.readFileSync(new URL('./ui-v2/settings/settings-sheet.js', import.meta.url), 'utf8');
assert.match(fixtureSource, /V2_FIXTURE_ORDER/);
assert.match(shell, /fixtureVisualData/);
assert.match(shell, /Object\.assign\(ui,/);
assert.match(visualFixtureSource, /deterministicStorageHealth/);
assert.match(settingsSheet, /model\.storageHealth \|\| inspectStorageHealth\(\)/);
assert.doesNotMatch(shell, /MutationObserver/);

console.log(`ui-v2-fixture-matrix.test.mjs: ok (${V2_FIXTURE_ORDER.length} states)`);
