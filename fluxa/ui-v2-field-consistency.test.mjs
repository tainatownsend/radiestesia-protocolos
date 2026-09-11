import assert from 'node:assert/strict';
import fs from 'node:fs';

const golden = fs.readFileSync(new URL('./ui-v2/golden-path.css', import.meta.url), 'utf8');
const treatment = fs.readFileSync(new URL('./ui-v2/treatment.css', import.meta.url), 'utf8');

assert.match(golden, /\.v2-field\s*\{[\s\S]*?gap:\s*8px;/, 'Shared V2 field layout must live in golden-path.css.');
assert.match(golden, /\.v2-field input,[\s\S]*?min-height:\s*52px;/, 'Shared V2 form controls must keep one 52px geometry.');
assert.doesNotMatch(treatment, /(?:^|\n)\.v2-field\s*\{/, 'Treatment CSS must not redefine the global V2 field container.');
assert.doesNotMatch(treatment, /(?:^|\n)\.v2-field input,/, 'Treatment CSS must not override global input geometry for every V2 screen.');
assert.match(treatment, /\.v2-treatment-composer \.v2-field textarea\s*\{\s*min-height:\s*76px;/, 'Only the long composer may opt into a compact textarea height.');

console.log('ui-v2-field-consistency.test.mjs: ok');
