import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const js = read('./preparation-mobile-ux.js');
const structured = read('./structured-preparation-ui.js');
const loader = read('./ux-architecture-loader.js');

assert.match(structured, /data-prep-protection-select/,
  'The canonical structured preparation selector must remain available as the persistence bridge.');
assert.match(structured, /data-prep-unlisted-toggle/,
  'Unlisted/custom graph support must remain available.');
assert.match(structured, /data-prep-add-unlisted-acervo/,
  'The optional path to add an unlisted graph to Acervo must remain intact.');

assert.match(js, /data-open-prep-resource-picker/,
  'Preparation should expose a compact picker launch instead of the long native selector.');
assert.match(js, /data-prep-picker-search/,
  'The preparation resource picker must be searchable.');
for (const filter of ['ALL','FAVORITES','RECENT']) {
  assert.match(js, new RegExp(`data-prep-picker-filter=\\"${filter}\\"`),
    `Preparation picker must expose ${filter}.`);
}
assert.match(js, /FAVORITES_KEY = 'fluxa\.toolFavorites'/,
  'Preparation should share the same favorite resource preference as other operational pickers.');
assert.match(js, /recentToolIds/,
  'Preparation should surface recently used resources.');
assert.match(js, /data-prep-mobile-summary/,
  'Selected preparation resources should collapse into a compact summary.');
assert.match(js, /items\.slice\(0, 2\)/,
  'The summary should show only a short resource preview instead of accumulating chips.');
assert.match(js, /\.prep-resource-picker\[data-prep-mobile-picker="true"\] \.prep-picker-row[\s\S]*display:none!important/,
  'The native long selector must be visually replaced after enhancement.');
assert.match(js, /\.prep-resource-picker\[data-prep-mobile-picker="true"\] \.prep-selected-tools[\s\S]*display:none!important/,
  'Selected-resource chips must not expand the preparation screen after enhancement.');
assert.match(js, /data-prep-toggle-resource/,
  'The picker must support multi-select resource toggling.');
assert.match(js, /data-prep-resource-unlisted/,
  'The compact picker must retain an explicit custom/unlisted resource path.');
assert.match(js, /toggle\.dispatchEvent\(new Event\('change'/,
  'The custom-resource path must reuse the canonical structured preparation controls.');
assert.doesNotMatch(js, /prep-mobile-resource-search[^\n]*focus\(/,
  'Opening the picker should not force the iOS keyboard before the therapist chooses to search.');
assert.match(js, /document\.head\.insertBefore\(style, finalBrand \|\| null\)/,
  'Preparation-specific styles should be inserted before the final Idle Home brand stylesheet.');
assert.match(js, /max-height:min\(48dvh,480px\)/,
  'Picker results need a bounded scrolling viewport on mobile.');
assert.match(js, /position:sticky/,
  'Selected count and Done action should remain reachable while the picker scrolls.');

assert.match(loader, /import ['"]\.\/preparation-mobile-ux\.js['"];?/,
  'Compact preparation UX must load through the PR #95 architecture layer.');
assert.ok(loader.indexOf('treatment-mobile-ux.js') < loader.indexOf('preparation-mobile-ux.js'),
  'The final mobile validation candidate should include treatment compaction before preparation refinement.');

console.log('preparation-mobile-ux.test.mjs: ok');
