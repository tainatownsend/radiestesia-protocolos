import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const index = fs.readFileSync(new URL('./index.html', root), 'utf8');
const js = fs.readFileSync(new URL('./mobile-ux-hardening-ui.js', root), 'utf8');
const timing = fs.readFileSync(new URL('./planned-treatment-item-timing-ui.js', root), 'utf8');
const css = fs.readFileSync(new URL('./mobile-ux-hardening.css', root), 'utf8');

assert.match(index, /mobile-ux-hardening\.css/, 'Round 3 CSS must be loaded.');
assert.match(index, /mobile-ux-hardening-ui\.js/, 'Round 3 UI enhancer must be loaded.');
assert.match(index, /planned-treatment-item-timing-ui\.js/, 'Planned item timing hardening must be loaded.');
const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
assert.equal(styles.at(-1), 'idle-home-premium.css', 'Idle Home refinement must remain last in the visual cascade.');
assert.ok(styles.indexOf('mobile-ux-hardening.css') < styles.indexOf('idle-home-premium.css'), 'Hardening CSS must load before the protected idle-home layer.');

assert.match(css, /max-height:calc\(100dvh/, 'Mobile sheets must use dynamic viewport height.');
assert.match(css, /body\.fluxa-mobile-sheet-open\{[^}]*overflow:hidden/, 'Background scroll must be locked while a sheet is open.');
assert.match(css, /\.mx3-mobile-sheet>\.sheet-head\.mx3-sheet-header\{[^}]*position:sticky/, 'Sheet header must stay visible.');
assert.match(css, /\.mx3-mobile-sheet \.mx3-sticky-cta,[\s\S]*position:sticky/, 'Primary sheet actions must stay reachable.');
assert.match(css, /\.mx3-question-sheet \.question-panel\{[^}]*min-height:0/, 'Question sheets must remove artificial dead space.');
assert.match(css, /\.mx3-treatment-actions/, 'Treatment actions need a dedicated hierarchy.');
assert.match(css, /--mx3-space-1:4px/, 'Round 3 spacing tokens must start at 4px.');
assert.match(css, /--mx3-space-6:32px/, 'Round 3 spacing tokens must include 32px.');

assert.match(js, /createPlannedTreatment/, 'Composer must support saving a treatment as planned.');
assert.match(js, /data-mx3-save-planned/, 'Composer must expose the planned-treatment action.');
assert.match(js, /mx3-summary-timeline/, 'Session timeline must expose a readable summary layer.');
assert.match(js, /atividades relacionadas/, 'Timeline must retain expandable audit activity.');
assert.match(js, /data-mx3-session-summary/, 'Session metrics must be placed inside the action-first cockpit.');
assert.match(js, /mx3-action-overflow/, 'Low-priority treatment actions must move to compact overflow.');
assert.match(js, /mx3-final-assessment/, 'Final assessment must use the hardened short-block layout.');
assert.match(timing, /normalizePlannedGraphTiming/, 'Planned graph deadlines must remain unset until treatment start.');
assert.match(timing, /anchorStartedTreatmentItems/, 'Structured graph timing must be anchored when a planned treatment starts.');
assert.match(timing, /graph\.startedAt = treatment\.startedAt/, 'Graph timing must use the actual treatment start time.');

console.log('mobile-ux-hardening.test.mjs: ok');
