import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const library=fs.readFileSync(new URL('./treatment-theme-library.js',root),'utf8');
const ui=fs.readFileSync(new URL('./treatment-theme-ui.js',root),'utf8');
const html=fs.readFileSync(new URL('./index.html',root),'utf8');
const css=fs.readFileSync(new URL('./treatment-theme.css',root),'utf8');

assert.match(library,/\.\.\/app\.js/,'Theme library must include the original essential treatment plans.');
assert.match(library,/\.\.\/marriage\.js/,'Theme library must include relationship treatment plans.');
assert.match(library,/protocols-v11-core\.js/,'Theme library must include the deep protocol treatment plans.');
assert.match(library,/DIVORCE_ENERGY_GENERAL/,'Theme discovery must include the canonical Divórcio Energético general treatment.');
assert.match(library,/DIVORCE_ENERGY_CUT/,'Theme discovery must include the canonical Divórcio Energético general cut.');
assert.match(library,/theme:'Divórcio Energético'/,'Divórcio Energético suggestions must be grouped under their own discoverable theme.');
assert.match(library,/TREATMENT_THEME_BUILTINS/,'Fluxa-native therapeutic suggestions must remain explicitly traceable.');
assert.match(library,/sourcePath:'fluxa\/divorce-energy-domain\.js'/,'Native suggestions must preserve their source provenance.');
assert.match(library,/inferTheme/,'Theme library must classify suggestions for fast discovery.');
assert.match(library,/seen\.has\(key\)/,'Duplicate commands from overlapping sources must be removed.');
assert.match(ui,/Tratamentos por tema/,'Treatment creation must expose thematic discovery.');
assert.match(ui,/data-open-treatment-theme/,'Treatment form must expose a theme picker action.');
assert.match(ui,/data-apply-treatment-theme/,'A selected thematic suggestion must be applicable to the form.');
assert.match(ui,/data-add-treatment-component-draft/,'Applying a suggestion must be able to preserve existing components by adding another one.');
assert.match(ui,/instructions\.value=item\.command/,'Original therapeutic command must prefill the editable instructions.');
assert.match(ui,/form\.dataset\.treatmentTheme=item\.theme/,'Treatment must retain thematic provenance in the form.');
assert.match(ui,/form\.dataset\.treatmentThemeSource=item\.sourcePath/,'Treatment must retain source provenance for native and root suggestions.');
assert.ok(html.indexOf('treatment-theme.css')<html.indexOf('premium-reference.css'),'Premium reference must remain the final CSS authority.');
assert.match(html,/treatment-theme-library\.js/,'Treatment theme library must load in the app shell.');
assert.match(html,/treatment-theme-ui\.js/,'Treatment theme UI must load in the app shell.');
assert.match(css,/@media\(max-width:620px\)/,'Treatment theme picker must have a mobile layout.');

console.log('treatment-theme-library.test.mjs: ok');
