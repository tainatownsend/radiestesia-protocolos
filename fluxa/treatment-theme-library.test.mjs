import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseTreatmentPlans } from './treatment-theme-parser.js';

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
assert.match(library,/parseTreatmentPlans/,'Theme library must use the regression-tested pure parser.');
assert.match(library,/seen\.has\(key\)/,'Duplicate commands from overlapping sources must be removed.');
assert.match(library,/let failedSources=\[\]/,'Theme loading must track transient source failures.');
assert.match(library,/if\(catalog\.length&&failedSources\.length===0\)return catalog/,'A complete catalog should be reused without unnecessary reloads.');
assert.match(library,/failures\.push\(path\)/,'Unavailable sources must be recorded instead of silently locking a partial catalog.');
assert.match(library,/finally\{loading=null;\}/,'The load promise must be released so a later picker open can retry transient failures.');
assert.match(library,/treatmentThemeLibraryStatus/,'Catalog completeness must be inspectable for diagnostics and future UI handling.');
assert.match(library,/complete:catalog\.length>0&&failedSources\.length===0/,'Library status must expose whether all therapeutic sources loaded.');
assert.match(ui,/ensureTreatmentThemeLibrary\(\)/,'Opening the picker must re-enter the loader, allowing a retry when the previous load was partial.');
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

const realSources=[
  '../app.js','../marriage.js','../protocols-v11-core.js','../protocols-v11-expansion.js','../protocols-v11-quick.js','../deep-tree.js','../deep-tree-2.js'
];
const parsedBySource=new Map();
for(const path of realSources){
  const source=fs.readFileSync(new URL(path,root),'utf8');
  const items=parseTreatmentPlans(source,path);
  parsedBySource.set(path,items);
  assert.ok(items.length>0,`${path} must contribute at least one treatment suggestion to thematic discovery.`);
  assert.ok(items.every((item)=>item.title&&item.command&&item.theme&&item.sourcePath===path),`${path} parsed suggestions must retain complete content and provenance.`);
  assert.equal(new Set(items.map((item)=>item.id)).size,items.length,`${path} must not generate duplicate parser IDs.`);
}
assert.ok(parsedBySource.get('../app.js').some((item)=>item.title==='Crenças limitantes financeiras'),'Core financial treatment must remain discoverable.');
assert.ok(parsedBySource.get('../marriage.js').some((item)=>item.title==='Segurança e proteção no relacionamento'),'Relationship safety treatment must remain discoverable.');
assert.ok(parsedBySource.get('../protocols-v11-core.js').some((item)=>item.title==='Autovalor condicionado'),'V1.1 self-worth treatment must remain discoverable.');
assert.ok(parsedBySource.get('../deep-tree.js').some((item)=>item.title==='Origem infantil das crenças financeiras'),'Deep-tree treatment expansions must remain discoverable.');
const totalParsed=[...parsedBySource.values()].reduce((sum,items)=>sum+items.length,0);
assert.ok(totalParsed>=50,'The real therapeutic source set should yield a substantial thematic catalog, not a silently partial parser result.');

console.log('treatment-theme-library.test.mjs: ok');
