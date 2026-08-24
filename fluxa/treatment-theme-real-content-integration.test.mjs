import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inferTreatmentTheme, matchesTreatmentThemeSearch, parseTreatmentPlans } from './treatment-theme-parser.js';

const sources = [
  '../app.js',
  '../marriage.js',
  '../protocols-v11-core.js',
  '../protocols-v11-expansion.js',
  '../protocols-v11-quick.js',
  '../deep-tree.js',
  '../deep-tree-2.js'
];

const discovered = [];
for (const path of sources) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  discovered.push(...parseTreatmentPlans(source, path));
}

const unique = [...new Map(discovered.map((item) => [`${item.title}\u0000${item.command}`, item])).values()];

assert.ok(unique.length >= 10, `expected a meaningful real treatment-theme catalog, found ${unique.length}`);
assert.ok(unique.every((item) => item.id && item.title && item.command && item.theme && item.sourcePath), 'every discovered suggestion must preserve identity, visible copy, theme and source traceability');

const themes = new Set(unique.map((item) => item.theme));
for (const requiredTheme of ['Financeiro', 'Carreira', 'Relacionamentos']) {
  assert.ok(themes.has(requiredTheme), `real therapeutic content must keep ${requiredTheme} discoverable by theme`);
}

const searchable = unique.find((item) => matchesTreatmentThemeSearch(item.search, 'prosperidade'));
assert.ok(searchable, 'accent-insensitive theme discovery should find a real prosperity-related treatment suggestion');
assert.equal(inferTreatmentTheme('Carreira / Profissional', 'fortalecer reconhecimento profissional'), 'Carreira');

console.log(`treatment-theme-real-content-integration.test.mjs: ok (${unique.length} real suggestions across ${themes.size} themes)`);
