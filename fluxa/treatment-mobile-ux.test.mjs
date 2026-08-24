import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const js = read('./treatment-mobile-ux.js');
const css = read('./treatment-mobile-ux.css');
const picker = read('./tool-picker-search-ui.js');
const html = read('./index.html');

for (const label of ['30 min','1 h','1 dia','7 dias','Sem prazo']) {
  assert.match(js, new RegExp(label.replace(' ', '\\s')),
    `Treatment duration shortcuts must retain ${label}.`);
}
assert.match(js, /data-treatment-duration-preset/);
assert.match(js, /data-treatment-compose-summary/);
assert.match(js, /position:sticky|mobile-treatment-compose-footer/);
assert.match(js, /data-toggle-mobile-treatment-item/);
assert.match(js, /items\.slice\(0, -1\).*setItemCollapsed/s,
  'When another treatment item is added, previous items should be collapsible/auto-collapsed to limit scrolling.');
assert.match(js, /treatmentItemView\(component\)/,
  'Active component management should reuse the canonical item → command → graph view.');
assert.match(js, /mobile-component-graphs/);
assert.match(js, /remainingLabel\(graph\)/);

assert.match(picker, /Selecionar gráfico da Biblioteca/,
  'Known graphs must use the searchable Library picker as the primary path.');
assert.match(picker, /Digitar nome novo/,
  'Unlisted graphs must remain enterable as free text.');
assert.match(picker, /mode==='graph'/,
  'Graph selection must stay scoped to graph resources.');

assert.match(css, /\.mobile-treatment-graph/);
assert.match(css, /grid-template-columns:64px 88px/,
  'Duration value/unit controls should remain compact inline controls.');
assert.match(css, /\.mobile-duration-presets/);
assert.match(css, /\.mobile-treatment-compose-footer\{position:sticky/,
  'Treatment composition must keep its summary/action reachable while scrolling.');
assert.match(css, /\.mobile-component-row/,
  'Started treatments must use dense component rows rather than tall repeated cards.');
assert.match(css, /@media\(max-width:390px\)/,
  'Very narrow phones need a safe single-column fallback.');

assert.match(html, /href="treatment-mobile-ux\.css"/,
  'Compact treatment CSS must be loaded by the Fluxa shell.');
assert.match(html, /src="treatment-mobile-ux\.js"/,
  'Compact treatment behavior must be loaded by the Fluxa shell.');
assert.ok(html.indexOf('treatment-mobile-ux.css') < html.indexOf('brand-shell.css'),
  'The canonical brand shell should remain after treatment-specific CSS.');
assert.ok(html.indexOf('tool-picker-search-ui.js') < html.indexOf('treatment-mobile-ux.js'),
  'Treatment compacting should build on the searchable picker enhancement.');

console.log('treatment-mobile-ux.test.mjs: ok');
