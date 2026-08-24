import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index=await readFile(new URL('./index.html',import.meta.url),'utf8');
const home=await readFile(new URL('./home-refresh-ui.js',import.meta.url),'utf8');
const treatment=await readFile(new URL('./treatment-create-ui.js',import.meta.url),'utf8');
const modalities=await readFile(new URL('./therapeutic-modalities-ui.js',import.meta.url),'utf8');
const picker=await readFile(new URL('./tool-picker-search-ui.js',import.meta.url),'utf8');
const css=await readFile(new URL('./therapeutic-flow-refresh.css',import.meta.url),'utf8');
const reset=await readFile(new URL('./data-reset.js',import.meta.url),'utf8');
const worker=await readFile(new URL('./service-worker.js',import.meta.url),'utf8');

assert.ok(index.includes('therapeutic-flow-refresh.css'),'therapeutic flow CSS must load');
assert.ok(index.includes('therapeutic-modalities-ui.js'),'therapeutic modality UI must load');
assert.ok(index.indexOf('data-reset.js')<index.indexOf('src="app.js"'),'one-time reset must execute before app state loads');
const styles=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
assert.ok(styles.includes('idle-home-premium.css'),'idle premium layer must remain in the visual cascade');
assert.equal(styles.at(-1),'visual-reconciliation.css','visual reconciliation must remain the final visual authority during identity validation');
assert.ok(styles.indexOf('idle-home-premium.css')<styles.indexOf('visual-reconciliation.css'),'visual reconciliation must refine the premium idle Home rather than be overwritten by it');

for(const key of ['fluxa.mvp.v1','fluxa.mvp.v1.backup','fluxa.mvp.v1.recovery'])assert.ok(reset.includes(key),`reset must clear ${key}`);
assert.ok(reset.includes('fluxa.validation-reset.2026-08-22.v2'),'reset must be versioned and one-time');

assert.ok(home.includes('Compor tratamento'),'Home must expose treatment composition');
assert.ok(home.includes('Radiestesia + terapias opcionais'),'Home must explain the composition model');
assert.ok(!home.includes('data-action="reiki"'),'premium Home must not expose Reiki as an independent action');
assert.ok(home.includes("reikiButton.hidden=true"),'idle Home must hide retrospective standalone Reiki');

for(const modality of ['REIKI','BACH_FLOWERS','CRYSTALS','RADIONIC_TABLE'])assert.ok(modalities.includes(modality),`${modality} must be configurable`);
assert.ok(modalities.includes("BASE={id:'RADIESTHESIA'"),'Radiestesia must remain the fixed base modality');
assert.ok(modalities.includes('customModalities'),'therapists must be able to define additional modalities');
assert.ok(modalities.includes('name="treatmentModality"'),'configured modalities must appear in treatment composition');
assert.ok(modalities.includes('data-modality-summary'),'saved composition must be visible on treatment cards');
assert.ok(modalities.includes('enhanceLibraryPreferences'),'modality configuration must live with Library preferences');
assert.ok(!modalities.includes('enhanceTreatmentsPage'),'Treatment flow must not contain profile/settings configuration');
assert.ok(modalities.includes('Biblioteca → Preferências'),'treatment flow should point to configuration without embedding it');

assert.ok(treatment.includes("t.modalities=['RADIESTHESIA'"),'saved treatments must persist Radiestesia as base');
assert.ok(treatment.includes("t.modalitySnapshots=[{id:'RADIESTHESIA',label:'Radiestesia'}"),'saved treatment must preserve modality labels');
assert.ok(treatment.includes('enrichComponentWithTreatmentItem'),'modality work must preserve the item-command-graph model');
assert.ok(!treatment.includes("type: modality.id === 'REIKI'"),'complementary modalities must not be misrepresented as radiesthesia treatment components');
assert.ok(treatment.includes("node?.dataset?.treatmentTheme||''"),'manual treatment items must tolerate missing theme provenance');
assert.ok(treatment.includes("node?.dataset?.treatmentThemeSource||''"),'manual treatment items must tolerate missing theme source');
assert.ok(treatment.includes("node?.dataset?.treatmentThemeSuggestion||''"),'manual treatment items must tolerate missing theme suggestion');

assert.ok(picker.includes('input[name="graphName"]'),'treatment graph inputs must be enhanced');
assert.ok(picker.includes('data-open-graph-picker'),'graph picker must open from a compact launcher');
assert.ok(picker.includes("mode==='graph'"),'graph picker must have a graph-only mode');
assert.ok(picker.includes("t.type==='GRAPH'"),'graph-only mode must exclude unrelated library resources');
assert.ok(picker.includes('Selecionar gráfico da Biblioteca'),'graph entry must support fast library selection');
assert.ok(picker.includes('Digitar nome novo'),'manual graph entry must remain available');
assert.ok(picker.includes('showManualGraphInput(input,Boolean(input.value&&!known))'),'manual graph field must stay collapsed for normal library selection');
assert.ok(picker.includes("input.removeAttribute('list')"),'native long datalist must not compete with the searchable picker');
assert.ok(picker.includes('showManualGraphInput(control,true)'),'manual graph field must open only when explicitly requested');

assert.match(css,/\.home-cockpit-context\s*\{[\s\S]*?position:static !important/,'Assistido context must stay in normal document flow');
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'Home must use three core actions');
assert.match(css,/\.sheet>\.sheet-head\s*\{[\s\S]*?background:#F8F9F7/,'sheet headers must use an opaque surface while scrolling');
assert.match(css,/box-shadow:0 -24px 0 24px #F8F9F7/,'sheet header must cover the scroll gap above it');
assert.ok(!/\.sheet>\.sheet-head\s*\{[^}]*background:\s*rgba\(/s.test(css),'sheet header background must not be translucent');
assert.ok(worker.includes('therapeutic-catalog-complete-20260821-therapeutic-flow-20260822'),'offline shell cache must refresh while preserving the catalog completion marker');

console.log('therapeutic-flow-refresh.test.mjs: ok');
