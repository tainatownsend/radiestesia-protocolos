import assert from 'node:assert/strict';
import fs from 'node:fs';

const assistedPicker = fs.readFileSync(new URL('./ui-v2/session/assisted-picker.js', import.meta.url), 'utf8');
const goldenPathCss = fs.readFileSync(new URL('./ui-v2/golden-path.css', import.meta.url), 'utf8');

assert.doesNotMatch(assistedPicker, /<style[\s>]/i, 'V2 screen components must not inject local style blocks during render.');
assert.match(goldenPathCss, /\.v2-assisted-search-empty\s*\{\s*display:\s*none;/s);
assert.match(goldenPathCss, /\.v2-select-list:has\(\.v2-select-row\)/);

console.log('ui-v2-style-boundary.test.mjs: ok');
