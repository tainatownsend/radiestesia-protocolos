import assert from 'node:assert/strict';
import fs from 'node:fs';

const library=fs.readFileSync(new URL('./treatment-theme-library.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');

const librarySources=[...library.matchAll(/'\.\.\/([^']+\.js)'/g)].map((m)=>m[1]);
const workerSources=[...worker.matchAll(/new URL\('\.\.\/([^']+\.js)',ROOT\)\.href/g)].map((m)=>m[1]);

assert.ok(librarySources.length>0,'treatment theme discovery should declare legacy root sources');
assert.ok(workerSources.length>0,'offline shell should declare the same legacy root sources');
assert.deepEqual([...new Set(workerSources)].sort(),[...new Set(librarySources)].sort(),
  'service worker and treatment discovery must keep the legacy root protocol source set aligned before root promotion');

for(const source of librarySources){
  assert.ok(fs.existsSync(new URL(`../${source}`,import.meta.url)),`legacy root protocol source must exist: ${source}`);
}

console.log(`root-protocol-source-alignment.test.mjs: ok · ${librarySources.length} sources`);
