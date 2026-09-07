import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./ui-v2/', import.meta.url));

function jsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...jsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const violations = [];
for (const file of jsFiles(root)) {
  const source = fs.readFileSync(file, 'utf8');
  if (/<style(?:\s|>)/i.test(source) || /createElement\(['"]style['"]\)/.test(source)) {
    violations.push(path.relative(root, file));
  }
}

assert.deepEqual(
  violations,
  [],
  `V2 source must use the deterministic CSS cascade instead of runtime style injection. Violations: ${violations.join(', ')}`,
);

console.log('ui-v2-runtime-style-injection.test.mjs: ok');
