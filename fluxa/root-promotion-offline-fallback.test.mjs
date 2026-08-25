import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');

assert.match(source,/key\.startsWith\(['"]fluxa-runtime-['"]\)&&key!==CACHE_NAME/,
  'activation should keep clearing older Fluxa runtime caches after root promotion');
assert.match(source,/caches\.match\(ROOT\)/,
  'offline navigation fallback should resolve through the runtime ROOT URL');
assert.doesNotMatch(source,/caches\.match\(['"][^'"]*\/fluxa\//,
  'offline navigation fallback must not hard-code the current /fluxa/ deployment path');
assert.match(source,/if\(request\.mode===['"]navigate['"]\)/,
  'navigation requests should retain a dedicated offline shell fallback');

console.log('root-promotion-offline-fallback.test.mjs: ok');
