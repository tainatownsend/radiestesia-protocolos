import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./offline-ui.js',import.meta.url),'utf8');

assert.match(source,/navigator\.serviceWorker\.register\('\.\/service-worker\.js',\{scope:'\.\/'\}\)/,
  'offline support should register the worker with root-relative portable paths');
assert.doesNotMatch(source,/serviceWorker\.register\([^\n]*\/fluxa\//,
  'service worker registration must not hard-code the current /fluxa/ deployment path');
assert.doesNotMatch(source,/scope\s*:\s*['"]\/fluxa\//,
  'service worker scope must remain relocatable before root promotion');

console.log('root-promotion-offline-registration.test.mjs: ok');
