import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const index = fs.readFileSync(new URL('./index.html', root), 'utf8');
const css = fs.readFileSync(new URL('./release-candidate.css', root), 'utf8');
const js = fs.readFileSync(new URL('./release-candidate-ui.js', root), 'utf8');
const preparation = fs.readFileSync(new URL('./structured-preparation-ui.js', root), 'utf8');
const catalog = fs.readFileSync(new URL('./therapeutic-catalog-ui.js', root), 'utf8');
const prefill = fs.readFileSync(new URL('./root-treatment-prefill-ui.js', root), 'utf8');
const image = new URL('./assets/fluxa-focus.webp', root);

assert.match(index, /rel="preload" href="assets\/fluxa-focus\.webp" as="image"/, 'Primary visual must be preloaded and discoverable offline.');
assert.match(index, /release-candidate\.css/, 'Release candidate stylesheet must be loaded.');
assert.match(index, /release-candidate-ui\.js/, 'Release candidate enhancer must be loaded.');
assert.ok(fs.existsSync(image), 'Release candidate visual asset must exist.');
assert.ok(fs.statSync(image).size > 10_000, 'Release candidate visual asset must not be an empty placeholder.');

assert.match(js, /const FLOW_STEPS/, 'The five-stage flow must be centralized.');
for (const label of ['Preparar','Medir','Investigar','Tratar','Revisar']) assert.match(js, new RegExp(label), `Journey must include ${label}.`);
for (const stage of ['prepare','measure','investigate','treat','review']) assert.match(js, new RegExp(`'${stage}'`), `Shell must recognize ${stage}.`);
assert.match(js, /ensureSheetBody/, 'All sheets must receive the same scrollable body region.');
assert.match(js, /ensureQuestionFooter/, 'Question decisions must receive the same fixed footer region.');
assert.match(js, /fx-hero-art/, 'Idle home must receive a visual anchor.');
assert.doesNotMatch(js, /reel|video/i, 'Release candidate must not reference stale reel or video assets.');

assert.match(css, /grid-template-rows:auto minmax\(0,1fr\) auto/, 'Shared shell must use fixed header, scrolling body, and footer rows.');
assert.match(css, /\.fx-sheet-body\{[\s\S]*overflow-y:auto/, 'Only the shell body should scroll.');
assert.match(css, /max-height:calc\(100dvh/, 'Mobile shell must respect dynamic viewport height.');
assert.match(css, /@media\(max-width:560px\)/, 'Phone layout must be explicit.');
assert.match(css, /@media\(min-width:700px\)/, 'Tablet and desktop layout must be explicit.');
assert.match(css, /@media\(max-width:380px\)/, 'Narrow-phone layout must be explicit.');
assert.match(css, /prefers-reduced-motion:reduce/, 'Motion preferences must be respected.');
assert.match(css, /forced-colors:active/, 'Forced-colors users must retain visible controls.');
assert.match(css, /\.fx-inline-error/, 'Preparation validation must remain inside the mobile sheet.');
assert.match(css, /\.searchable-checklist/, 'Long protection lists must use progressive disclosure.');
assert.match(css, /\.catalog-group\[open\]/, 'Protocol groups must expose their expanded state visually.');
assert.match(css, /root-finding-choice:has\(input:checked\)/, 'Finding details must expand only after selection.');

assert.doesNotMatch(preparation, /alert\(error\.message\)/, 'Preparation errors must not use blocking browser alerts.');
assert.match(preparation, /role', 'alert/, 'Preparation errors must be announced accessibly.');
assert.match(preparation, /aria-label="\$\{esc\(tool\.name\)\}"/, 'Protection choices must expose their own accessible names.');
assert.match(catalog, /<details class="catalog-group"/, 'Protocol catalog groups must be progressively disclosed.');
assert.match(catalog, /Nada vira causa ou inicia investigação|Selecione apenas os achados/, 'Decision copy must be concise.');
assert.match(prefill, /itens preenchidos/, 'Treatment handoff must summarize prefilled items compactly.');

const picker = fs.readFileSync(new URL('./tool-picker-search-ui.js', root), 'utf8');
const pickerSyntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input:picker, encoding:'utf8' });
assert.equal(pickerSyntax.status, 0, `Library picker must parse as a browser module: ${pickerSyntax.stderr}`);

console.log('release-candidate.test.mjs: ok');
