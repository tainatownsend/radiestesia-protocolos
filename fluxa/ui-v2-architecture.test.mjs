import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fluxaDir = path.dirname(fileURLToPath(import.meta.url));
const v2Dir = path.join(fluxaDir, 'ui-v2');
const read = (relative) => fs.readFileSync(path.join(fluxaDir, relative), 'utf8');

const html = read('v2.html');
const baseCss = read('ui-v2/base.css');
const goldenCss = read('ui-v2/golden-path.css');
const indexJs = read('ui-v2/index.js');
const selectorsJs = read('ui-v2/state/selectors.js');
const actionsJs = read('ui-v2/state/actions.js');
const prepJs = read('ui-v2/session/preparation-flow.js');
const assistedJs = read('ui-v2/session/assisted-picker.js');
const hawkinsJs = read('ui-v2/session/hawkins-flow.js');
const triageJs = read('ui-v2/investigation/triage-flow.js');
const findingsJs = read('ui-v2/investigation/findings-summary.js');
const blueprint = read('docs/FLUXA_UI_V2_BLUEPRINT.md');

assert.match(html, /ui-v2\/tokens\.css/, 'V2 must load its token layer.');
assert.match(html, /ui-v2\/base\.css/, 'V2 must load its structural base layer.');
assert.match(html, /ui-v2\/golden-path\.css/, 'V2 must load the owned golden-path component layer.');
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

assert.match(indexJs, /params\.get\('mode'\) === 'live'/, 'Real-data wiring must remain explicit opt-in while V2 is under construction.');
assert.match(indexJs, /queueMicrotask/, 'Store-driven rendering should coalesce synchronous state changes before paint.');
assert.match(indexJs, /deriveV2Model/, 'Live V2 must render from a single state-derived view model.');
assert.doesNotMatch(indexJs, /localStorage/, 'V2 runtime must use the existing store abstraction rather than touching persistence directly.');

assert.match(baseCss, /100dvh/, 'Canonical V2 mobile structure must use dynamic viewport height.');
assert.match(baseCss, /safe-area-inset-bottom/, 'Canonical V2 structure must respect iPhone safe areas.');
assert.match(baseCss, /\.v2-sheet__body\s*\{[\s\S]*?overflow:\s*auto/, 'MobileSheet body must be the intentional scroll owner.');
assert.match(baseCss, /\.v2-sheet__footer\s*\{/, 'MobileSheet must own a structural footer rather than overlaying arbitrary content.');
assert.match(baseCss, /prefers-reduced-motion/, 'V2 must support reduced motion from the first structural phase.');
assert.match(goldenCss, /body\[data-v2-sheet-open="true"\]/, 'Open sheets must lock the background structurally.');
assert.match(goldenCss, /\.v2-binary-actions/, 'Triage must own reachable binary actions without dead-space layout hacks.');

assert.match(selectorsJs, /START_SESSION/, 'Selectors must derive the start-session recommendation.');
assert.match(selectorsJs, /PREPARATION/, 'Selectors must derive preparation as a blocking prerequisite.');
assert.match(selectorsJs, /SELECT_ASSISTED/, 'Selectors must derive Assistido as a blocking prerequisite.');
assert.match(selectorsJs, /HAWKINS/, 'Selectors must derive Hawkins as a blocking prerequisite.');
assert.match(selectorsJs, /TRIAGE/, 'Selectors must surface an open investigation before generic actions.');
assert.match(selectorsJs, /FINDINGS/, 'Selectors must surface pending findings before generic actions.');

assert.match(actionsJs, /startSession/, 'V2 actions must reuse the existing session domain action.');
assert.match(actionsJs, /completeStructuredPreparation/, 'V2 preparation must reuse authoritative structured-preparation validation.');
assert.match(actionsJs, /recordHawkinsBaseline/, 'V2 Hawkins must reuse the authoritative same-session measurement action.');
assert.match(actionsJs, /startInvestigation/, 'V2 triage must reuse the existing investigation domain action.');
assert.match(actionsJs, /confirmFindings/, 'V2 findings must reuse the existing finding creation action.');

assert.match(prepJs, /Etapa \$\{prep\.step\} de \$\{prep\.total\}/, 'Preparation must expose clear workflow position.');
assert.match(prepJs, /Respiração e presença/, 'Preparation must render the first checkpoint directly.');
assert.match(prepJs, /Frequência do terapeuta/, 'Preparation must present therapist frequency once in the scan path.');
assert.match(prepJs, /Proteção/, 'Preparation must present protection as a direct step.');
assert.match(prepJs, /Permissão/, 'Preparation must present permission as a direct step.');
assert.doesNotMatch(prepJs, /Minha frequência vibracional de Hawkins/i, 'V2 must not preserve the duplicated legacy Hawkins card language.');

assert.match(assistedJs, /Buscar por nome/, 'Assistido selection must provide immediate search.');
assert.match(assistedJs, /Adicionar e selecionar/, 'Assistido creation must stay in the same guided sheet instead of nesting another modal.');
assert.match(hawkinsJs, /Uma calibração por Assistido nesta sessão/, 'Hawkins copy must explain same-session reuse before gated work.');
assert.match(triageJs, /Pergunta \$\{questionNumber\} de \$\{investigation\.total\}/, 'Triage must expose current question position.');
assert.match(triageJs, /data-v2-triage-back/, 'Triage must let the user correct a previous answer before completion.');
assert.match(findingsJs, /Confirmar achados/, 'Investigation completion must hand off directly to findings confirmation.');

assert.match(blueprint, /No visual MutationObserver/, 'Blueprint must explicitly prohibit visual MutationObserver rendering.');
assert.match(blueprint, /Golden Path/, 'Blueprint must define the golden path before broad feature migration.');
assert.match(blueprint, /Cutover Acceptance Criteria/, 'Blueprint must define objective cutover gates.');

console.log('ui-v2-architecture.test.mjs: ok');
