import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('./home-refresh-ui.js', import.meta.url), 'utf8');
const treatment = await readFile(new URL('./treatment-create-ui.js', import.meta.url), 'utf8');
const modalities = await readFile(new URL('./therapeutic-modalities-ui.js', import.meta.url), 'utf8');
const css = await readFile(new URL('./therapeutic-flow-refresh.css', import.meta.url), 'utf8');
const reset = await readFile(new URL('./data-reset.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');

assert.ok(index.includes('therapeutic-flow-refresh.css'), 'therapeutic flow CSS must load');
assert.ok(index.includes('therapeutic-modalities-ui.js'), 'modality preferences UI must load');
assert.ok(index.indexOf('data-reset.js') < index.indexOf('type="module" src="app.js"'), 'one-time reset must execute before app state loads');

assert.ok(reset.includes("fluxa.validation-reset.2026-08-22"), 'reset must be versioned so it runs only for this validation release');
for (const key of ['fluxa.mvp.v1','fluxa.mvp.v1.backup','fluxa.mvp.v1.recovery']) {
  assert.ok(reset.includes(key), `reset must clear ${key}`);
}

assert.ok(home.includes('Compor tratamento'), 'Home must expose treatment composition rather than a standalone Reiki shortcut');
assert.ok(home.includes('Radiestesia + terapias opcionais'), 'Home must explain the treatment composition model');
assert.ok(!home.includes('data-action="reiki"'), 'premium Home must not expose Reiki as an independent session action');

assert.ok(modalities.includes("id:'RADIESTHESIA'"), 'Radiestesia must be the fixed base modality');
for (const modality of ['REIKI','BACH_FLOWERS','CRYSTALS','RADIONIC_TABLE']) {
  assert.ok(modalities.includes(modality), `${modality} should be available as an optional therapist-configured modality`);
}
assert.ok(modalities.includes('customModalities'), 'therapists must be able to add other modalities');

assert.ok(treatment.includes("['RADIESTHESIA', ...modalities.map"), 'treatment must persist Radiestesia as its base modality');
assert.ok(treatment.includes('name="treatmentModality"'), 'treatment composition must offer configured optional modalities');
assert.ok(treatment.includes("type: modality.id === 'REIKI' ? 'REIKI' : 'COMPLEMENTARY_THERAPY'"), 'optional modalities must be stored as treatment components');

assert.match(css, /\.home-cockpit-context\s*\{[\s\S]*?position:static !important/, 'assisted context must remain in normal document flow to prevent scroll overlap');
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, 'Home actions should use the three-action radiesthesia workflow');
assert.ok(worker.includes('fluxa-runtime-v3-therapeutic-flow-reset-20260822'), 'offline cache must be refreshed for the new shell');

console.log('therapeutic-flow-refresh.test.mjs: ok');
