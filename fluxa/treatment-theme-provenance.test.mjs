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
assert.match(ui,/function clearItemThemeProvenance\(item\)/,'Edited suggestions must have a dedicated item-level provenance clearing path.');
for(const key of ['treatmentTheme','treatmentThemeSource','treatmentThemeSuggestion']){
  assert.match(ui,new RegExp(`delete item\\.dataset\\.${key}`),`Manual edits must clear stale item-level ${key}.`);
}
assert.match(ui,/event\.target\.matches\?\.\('\[name="itemLabel"\],\[name="commandText"\]'\)&&item\.dataset\.treatmentThemeSuggestion/,'Only manual edits to suggestion-owned text should invalidate suggestion provenance.');
assert.match(ui,/clearItemThemeProvenance\(item\);\s*markMixedTreatmentProvenance\(form\)/,'Editing suggested text must clear both item and misleading treatment-level provenance.');
assert.match(ui,/if\(item\.dataset\.treatmentThemeSuggestion\)return/,'Non-text edits to a suggested item must preserve valid suggestion provenance.');
assert.match(ui,/if\(form\?\.dataset\.treatmentThemeSuggestion\)markMixedTreatmentProvenance\(form\)/,'A manual item added to a themed treatment must clear misleading treatment-level provenance.');
assert.match(ui,/section\.dataset\.treatmentThemeSuggestion=item\.id/,'Each treatment item must retain its own suggestion provenance until its suggested text is edited.');
assert.match(create,/themeProvenance:theme\|\|sourcePath\|\|suggestionId\?\{theme,sourcePath,suggestionId\}:null/,'Treatment creation must keep item-level theme provenance.');
assert.match(create,/if\(!treatmentTheme&&!treatmentThemeSource&&!suggestion\)return/,'Treatment-level provenance must be omitted when mixed suggestions clear the form-level source.');

console.log('treatment-theme-provenance.test.mjs: ok');
