import assert from 'node:assert/strict';
import fs from 'node:fs';
import { viewportMetrics } from './ui-v2/mobile-viewport.js';

const html = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./ui-v2/mobile-viewport.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('./ui-v2/mobile-viewport.js', import.meta.url), 'utf8');

assert.match(html, /ui-v2\/mobile-viewport\.css/);
assert.match(html, /ui-v2\/mobile-viewport\.js/);
assert.ok(html.indexOf('mobile-viewport.css') > html.indexOf('library-settings.css'), 'Mobile viewport CSS must be the final V2 cascade layer.');
assert.ok(html.indexOf('mobile-viewport.js') < html.indexOf('ui-v2/index.js'), 'Viewport metrics should initialize before the V2 app mounts.');

assert.deepEqual(viewportMetrics({ layoutHeight: 852, visualHeight: 852, offsetTop: 0 }), {
  layoutHeight: 852,
  visualHeight: 852,
  keyboardInset: 0,
  keyboardOpen: false,
});
assert.deepEqual(viewportMetrics({ layoutHeight: 852, visualHeight: 522, offsetTop: 0 }), {
  layoutHeight: 852,
  visualHeight: 522,
  keyboardInset: 330,
  keyboardOpen: true,
});
assert.equal(viewportMetrics({ layoutHeight: 812, visualHeight: 730, offsetTop: 0 }).keyboardOpen, false, 'Small browser chrome changes must not be classified as the keyboard.');

assert.match(js, /visualViewport/);
assert.match(js, /--v2-visual-viewport-height/);
assert.match(js, /v2KeyboardOpen/);
assert.match(js, /focusin/);
assert.match(js, /ensureControlVisible/);
assert.doesNotMatch(js, /MutationObserver/);

assert.match(css, /--v2-visual-viewport-height/);
assert.match(css, /data-v2-keyboard-open="true"/);
assert.match(css, /font-size:\s*16px/);
assert.match(css, /body\[data-v2-sheet-open="true"\]\s*\{\s*touch-action:\s*auto;/s);
assert.match(css, /\.v2-sheet__body\s*\{\s*touch-action:\s*pan-y;/s);
assert.doesNotMatch(css, /body\[data-v2-sheet-open="true"\][^{]*\{[^}]*touch-action:\s*none/s);
assert.match(css, /@media \(max-width: 390px\)/);
assert.match(css, /\.v2-sheet__footer\s*\{\s*grid-template-columns:\s*1fr;/s);
assert.match(css, /scroll-padding-bottom/);

console.log('ui-v2-mobile-viewport.test.mjs: ok');
