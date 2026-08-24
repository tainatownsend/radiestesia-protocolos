import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('./manifest.webmanifest', import.meta.url), 'utf8'));

const assetRefs = [...index.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
assert.ok(assetRefs.length > 0, 'index should expose local asset references');

for (const ref of assetRefs) {
  assert.doesNotMatch(ref, /^\//, `asset ref must remain relative for future root promotion: ${ref}`);
  assert.doesNotMatch(ref, /\/fluxa\//i, `asset ref must not hard-code the current /fluxa/ deployment path: ${ref}`);
  assert.doesNotMatch(ref, /^https?:\/\//i, `core app asset ref should remain local and relocatable: ${ref}`);
}

for (const key of ['id', 'start_url', 'scope']) {
  assert.equal(manifest[key], './', `manifest ${key} must remain relative so Fluxa can move from /fluxa/ to repository root safely`);
}

for (const icon of manifest.icons || []) {
  assert.equal(typeof icon.src, 'string');
  assert.ok(icon.src.length > 0);
  assert.doesNotMatch(icon.src, /^\//, 'manifest icon must remain relative');
  assert.doesNotMatch(icon.src, /\/fluxa\//i, 'manifest icon must not hard-code /fluxa/');
}

console.log('root-promotion-portability.test.mjs: ok');
