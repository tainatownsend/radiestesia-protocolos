import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('.', import.meta.url);
const html = fs.readFileSync(new URL('./index.html', root), 'utf8');

const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const localRefs = refs.filter((ref) => !/^(https?:|data:|#)/.test(ref));
assert.ok(localRefs.length >= 2, 'Fluxa shell should load local scripts/styles.');

for (const ref of localRefs) {
  const filePath = path.resolve(new URL(ref, root).pathname);
  assert.ok(fs.existsSync(filePath), `Missing shell dependency: ${ref}`);
}

for (const required of ['app.js','backlog-ui.js','protocol-ui.js','remaining-ui.js','import-ui.js','a11y.js','styles.css','remaining.css']) {
  assert.ok(localRefs.includes(required), `index.html must include ${required}`);
}

assert.match(html, /<title>Fluxa<\/title>/);
assert.doesNotMatch(html, /Radiestesia Terapêutica|Lumera/);
console.log('static-smoke.test.mjs: ok');
