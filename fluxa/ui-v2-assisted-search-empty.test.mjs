import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';

const populated = assistedPicker({
  assistedOptions: [
    { id:'ast_1', name:'José da Silva', type:'PERSON' },
    { id:'ast_2', name:'Marina', type:'PERSON' },
  ],
}, {});

assert.match(populated, /data-v2-assisted-search="josé da silva\|jose da silva"/i, 'Assisted search metadata should support accented and unaccented names.');
assert.match(populated, /v2-assisted-search-empty/);
assert.match(populated, /Nenhum nome encontrado/);
assert.doesNotMatch(populated, /<style[\s>]/i, 'Assisted picker must not inject CSS during render.');
assert.doesNotMatch(populated, /Nenhum Assistido cadastrado/);

const goldenPathCss = fs.readFileSync(new URL('./ui-v2/golden-path.css', import.meta.url), 'utf8');
assert.match(goldenPathCss, /:has\(\.v2-select-row\)/, 'Filtered empty feedback should react to rows hidden by the existing search controller through the V2 cascade.');

const empty = assistedPicker({ assistedOptions: [] }, {});
assert.match(empty, /Nenhum Assistido cadastrado/);
assert.doesNotMatch(empty, /Nenhum nome encontrado/);

console.log('ui-v2-assisted-search-empty.test.mjs: ok');
