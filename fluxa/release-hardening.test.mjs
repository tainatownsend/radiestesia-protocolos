import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const index = fs.readFileSync(new URL('./index.html', root), 'utf8');
const css = fs.readFileSync(new URL('./release-hardening.css', root), 'utf8');
const ui = fs.readFileSync(new URL('./release-hardening-ui.js', root), 'utf8');
const fixes = fs.readFileSync(new URL('./release-hardening-fixes.js', root), 'utf8');

assert.match(index, /release-hardening\.css/, 'Release hardening CSS must be loaded.');
assert.match(index, /release-hardening-ui\.js/, 'Release hardening coordinator must be loaded.');
assert.match(index, /release-hardening-fixes\.js/, 'Release hardening workflow fixes must be loaded.');
assert.match(index, /fluxa-booting/, 'Initial render must use the boot stability gate.');

const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
assert.equal(styles.at(-1), 'visual-reconciliation.css', 'Visual reconciliation must remain the final static visual authority.');
assert.ok(styles.indexOf('release-hardening.css') < styles.indexOf('visual-reconciliation.css'), 'Structural release hardening must load before visual reconciliation.');

assert.match(css, /--fluxa-vvh/, 'Mobile sheets must follow the real visual viewport.');
assert.match(css, /safe-area-inset-bottom/, 'Mobile controls must respect iPhone safe areas.');
assert.match(css, /prefers-reduced-motion/, 'Reduced-motion users must be supported.');
assert.match(css, /focus-visible/, 'Keyboard focus must remain visible.');
assert.match(css, /min-width:44px;min-height:44px/, 'Critical controls must retain accessible touch targets.');
assert.match(css, /\.mx3-question-sheet \.question-panel\{\s*min-height:0!important/, 'Triage sheets must not preserve artificial dead space.');

assert.match(ui, /function manageModals\(/, 'A single release coordinator must harden modal behavior.');
assert.match(ui, /function handleModalKeys\(/, 'Modal keyboard and focus containment must be handled.');
assert.match(ui, /fluxa-modal-open/, 'Background page interaction must lock while a modal is open.');
assert.match(ui, /data-fluxa-home-hawkins/, 'Home must expose Hawkins before gated work.');
assert.match(ui, /data-fluxa-home-reiki/, 'Reiki must remain directly reachable from the session cockpit.');
assert.match(ui, /Pergunta \$\{index \+ 1\} de \$\{total\}/, 'Investigation questions must expose progress.');
assert.match(ui, /data-fluxa-question-back/, 'Investigation questions must allow correcting the previous answer.');
assert.match(ui, /data-fluxa-post-close-summary/, 'Closing a session must produce a clear saved-session summary.');
assert.match(ui, /Onde seus dados ficam/, 'Local-first storage must be explained to the user.');
assert.match(ui, /Último backup/, 'Backup recency must be visible in settings.');
assert.match(ui, /window\.alert = managed/, 'Legacy alert feedback must be translated into in-product feedback.');

assert.match(fixes, /manualReviewReady/, 'Components without automatic deadlines must remain manually reviewable.');
assert.match(fixes, /data-treatment-filter=\\"ALL\\"/, 'Recommended treatment actions must escape sticky filters.');
assert.match(fixes, /resumeTreatmentPreservingDuration/, 'Treatment resume must update state without a page reload.');
assert.doesNotMatch(fixes, /location\.reload\(/, 'Release workflow fixes must not introduce page reload jank.');
assert.match(fixes, /data-fluxa-sheet-assisted/, 'Task sheets must preserve visible Assistido context.');
assert.match(fixes, /Antes de iniciar:/, 'Planned treatments must explain unmet prerequisites before start.');

console.log('release-hardening.test.mjs: ok');
