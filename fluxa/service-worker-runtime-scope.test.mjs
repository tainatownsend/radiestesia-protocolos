import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');

assert.match(source,/const ROOT_URL=new URL\(ROOT\);/,'service worker should parse its runtime root URL once');
assert.match(source,/const SCOPE_PATH=ROOT_URL\.pathname;/,'service worker scope should derive from the runtime root pathname');
assert.match(source,/url\.origin===ROOT_URL\.origin&&url\.pathname\.startsWith\(SCOPE_PATH\)/,
  'local Fluxa URL detection should follow the runtime deployment path');
assert.doesNotMatch(source,/pathname\.includes\(['"]\/fluxa\/['"]\)/,
  'service worker must not hard-code the /fluxa/ deployment path');
assert.match(source,/CACHE_NAME='fluxa-runtime-v2-therapeutic-catalog-complete-20260821-therapeutic-flow-20260822-hawkins-20260822-runtime-scope-20260824-release-candidate-20260904'/,
  'scope behavior changes should advance the runtime cache generation without dropping prior cache lineage guards');

console.log('service-worker-runtime-scope.test.mjs: ok');
