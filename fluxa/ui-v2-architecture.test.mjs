import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fluxaDir = path.dirname(fileURLToPath(import.meta.url));
const v2Dir = path.join(fluxaDir, 'ui-v2');
const read = (relative) => fs.readFileSync(path.join(fluxaDir, relative), 'utf8');

const html = read('v2.html');
const baseCss = read('ui-v2/base.css');
const indexJs = read('ui-v2/index.js');
const prepJs = read('ui-v2/session/preparation-flow.js');
const blueprint = read('docs/FLUXA_UI_V2_BLUEPRINT.md');

assert.match(html, /ui-v2\/tokens\.css/, 'V2 preview must load only its token layer.');
assert.match(html, /ui-v2\/base\.css/, 'V2 preview must load its structural base layer.');
assert.match(html, /ui-v2\/index\.js/, 'V2 preview must mount the V2 entrypoint.');
assert.doesNotMatch(html, /styles\.css|mobile-ux-hardening\.css|release-hardening\.css|visual-reconciliation\.css/, 'V2 preview must not inherit legacy visual layers.');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const v2JavaScript = walk(v2Dir).filter((file) => /\.js$/.test(file));
for (const file of v2JavaScript) {
  const content = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(content, /new\s+MutationObserver|MutationObserver\s*\(/, `${path.relative(v2Dir, file)} must not use MutationObserver as a render mechanism.`);
  assert.doesNotMatch(content, /location\.reload\s*\(/, `${path.relative(v2Dir, file)} must not reload the page for normal workflow.`);
}

assert.doesNotMatch(indexJs, /createStore|localStorage|setState/, 'Structural preview must not mutate real Fluxa data.');
assert.match(baseCss, /100dvh/, 'Canonical V2 mobile structure must use dynamic viewport height.');
assert.match(baseCss, /safe-area-inset-bottom/, 'Canonical V2 structure must respect iPhone safe areas.');
assert.match(baseCss, /\.v2-sheet__body\s*\{[\s\S]*?overflow:\s*auto/, 'MobileSheet body must be the intentional scroll owner.');
assert.match(baseCss, /\.v2-sheet__footer\s*\{/, 'MobileSheet must own a structural footer rather than overlaying arbitrary content.');
assert.match(baseCss, /prefers-reduced-motion/, 'V2 must support reduced motion from the first structural phase.');

assert.match(prepJs, /Etapa \$\{prep\.step\} de \$\{prep\.total\}/, 'Preparation must expose clear workflow position.');
assert.match(prepJs, /Frequência do terapeuta/, 'Preparation must present therapist frequency as one operational summary row.');
assert.match(prepJs, /Proteção/, 'Preparation must present protection as a direct summary row.');
assert.match(prepJs, /Permissão/, 'Preparation must present permission as a direct summary row.');
assert.doesNotMatch(prepJs, /Minha frequência vibracional de Hawkins/i, 'V2 must not preserve the duplicated legacy Hawkins card language.');

assert.match(blueprint, /No visual MutationObserver/, 'Blueprint must explicitly prohibit visual MutationObserver rendering.');
assert.match(blueprint, /Golden Path/, 'Blueprint must define the golden path before broad feature migration.');
assert.match(blueprint, /Cutover Acceptance Criteria/, 'Blueprint must define objective cutover gates.');

console.log('ui-v2-architecture.test.mjs: ok');