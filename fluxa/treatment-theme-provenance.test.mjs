import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync(new URL('./treatment-theme-ui.js',import.meta.url),'utf8');
const create=fs.readFileSync(new URL('./treatment-create-ui.js',import.meta.url),'utf8');

assert.match(ui,/function syncTreatmentLevelThemeProvenance\(form,item\)/,'Theme UI must reconcile item provenance before writing treatment-level provenance.');
assert.match(ui,/existing&&existing!==String\(item\.id\)/,'A second distinct suggestion must be recognized as mixed provenance.');
assert.match(ui,/function markMixedTreatmentProvenance\(form\)/,'Mixed treatment provenance must share one clearing path.');
assert.match(ui,/form\.dataset\.treatmentThemeMixed='true'/,'Mixed suggestion provenance must be marked explicitly.');
for(const key of ['treatmentTheme','treatmentThemeSource','treatmentThemeSuggestion']){
  assert.match(ui,new RegExp(`delete form\\.dataset\\.${key}`),`Mixed provenance must clear misleading treatment-level ${key}.`);
}
assert.match(ui,/const item=event\.target\.closest\?\.\('#treatment-form \[data-treatment-item\]'\)/,'Theme UI must observe edits inside treatment items.');
assert.match(ui,/if\(!item\|\|item\.dataset\.treatmentThemeSuggestion\)return/,'Edits to an item that already carries theme provenance must preserve its source.');
assert.match(ui,/if\(form\?\.dataset\.treatmentThemeSuggestion\)markMixedTreatmentProvenance\(form\)/,'A manual item added to a themed treatment must clear misleading treatment-level provenance.');
assert.match(ui,/section\.dataset\.treatmentThemeSuggestion=item\.id/,'Each treatment item must retain its own suggestion provenance.');
assert.match(create,/themeProvenance:theme\|\|sourcePath\|\|suggestionId\?\{theme,sourcePath,suggestionId\}:null/,'Treatment creation must keep item-level theme provenance.');
assert.match(create,/if\(!treatmentTheme&&!treatmentThemeSource&&!suggestion\)return/,'Treatment-level provenance must be omitted when mixed suggestions clear the form-level source.');

console.log('treatment-theme-provenance.test.mjs: ok');
