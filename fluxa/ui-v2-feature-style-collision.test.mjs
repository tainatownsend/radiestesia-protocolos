import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const featureFiles = [
  './ui-v2/treatment.css',
  './ui-v2/closing-history.css',
  './ui-v2/library-settings.css',
];

function ownedClasses(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const owners = new Set();
  for (const match of stripped.matchAll(/([^{}]+)\{/g)) {
    const blockHead = match[1].trim();
    if (!blockHead || blockHead.startsWith('@')) continue;
    for (const selector of blockHead.split(',')) {
      const classMatch = selector.trim().match(/^\.([A-Za-z0-9_-]+)/);
      if (classMatch) owners.add(classMatch[1]);
    }
  }
  return owners;
}

const ownership = new Map();
const featureCss = new Map();
for (const relativePath of featureFiles) {
  const css = fs.readFileSync(new URL(relativePath, root), 'utf8');
  featureCss.set(relativePath, css);
  for (const className of ownedClasses(css)) {
    if (!ownership.has(className)) ownership.set(className, []);
    ownership.get(className).push(relativePath);
  }
}

const collisions = [...ownership.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([className, files]) => ({ className, files }))
  .sort((a, b) => a.className.localeCompare(b.className));

assert.deepEqual(
  collisions,
  [],
  `Feature CSS files must not silently share top-level class ownership. Move shared primitives to base/golden-path or rename feature-specific selectors. Collisions: ${JSON.stringify(collisions)}`,
);

const goldenPathCss = fs.readFileSync(new URL('./ui-v2/golden-path.css', root), 'utf8');
assert.match(
  goldenPathCss,
  /\.v2-helper\s*\{[^}]*color:\s*var\(--v2-muted\);[^}]*font-size:\s*\.8rem;[^}]*line-height:\s*1\.45;/s,
  'Shared helper typography must be owned by golden-path.css.',
);
for (const [relativePath, css] of featureCss) {
  assert.doesNotMatch(
    css,
    /(^|\n)\.v2-helper(?:\s|,|\{)/,
    `${relativePath} must consume the shared helper primitive instead of redefining it.`,
  );
}

console.log('ui-v2-feature-style-collision.test.mjs: ok');
