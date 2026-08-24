import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const fluxaDir = path.resolve(new URL('.', import.meta.url).pathname);
const repoRoot = path.resolve(fluxaDir, '..');

const rootFiles = new Set(fs.readdirSync(repoRoot, { withFileTypes:true }).filter((entry)=>entry.isFile()).map((entry)=>entry.name));
const fluxaFiles = new Set(fs.readdirSync(fluxaDir, { withFileTypes:true }).filter((entry)=>entry.isFile()).map((entry)=>entry.name));
const collisions = [...fluxaFiles].filter((name)=>rootFiles.has(name)).sort();

for (const critical of ['index.html','app.js']) {
  assert.ok(collisions.includes(critical), `future root promotion must explicitly classify critical collision: ${critical}`);
}

assert.ok(collisions.length >= 2, 'root promotion should retain an explicit collision inventory before files are moved or deleted');

const legacyProtocolSources = ['app.js','marriage.js','deep-tree.js','deep-tree-2.js','protocols-v11-core.js','protocols-v11-expansion.js','protocols-v11-quick.js'];
for (const file of legacyProtocolSources) {
  assert.ok(rootFiles.has(file), `legacy protocol source must remain present until root promotion dependency migration: ${file}`);
}

console.log(`root-promotion-collision-inventory.test.mjs: ok (${collisions.length} current file collisions)`);
