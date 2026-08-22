import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui=await readFile(new URL('./assessment-focus-exclusivity-ui.js',import.meta.url),'utf8');
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');

assert.ok(html.includes('assessment-focus-exclusivity-ui.js'),'The focus exclusivity guard must load with the Fluxa shell.');
assert.ok(ui.includes('#orienting-assessment-form input[name="focusArea"]'),'The guard must be scoped to orienting assessment focus choices.');
assert.ok(ui.includes("input.value==='unclear'"),'The unclear option must have explicit exclusive handling.');
assert.ok(ui.includes('other.checked=false'),'Choosing unclear must clear specific focus areas.');
assert.ok(ui.includes("item.value==='unclear'"),'Choosing a specific area must locate the unclear choice.');
assert.ok(ui.includes('unclear.checked=false'),'Choosing a specific area must clear the contradictory unclear choice.');

console.log('assessment-focus-exclusivity.test.mjs: ok');
