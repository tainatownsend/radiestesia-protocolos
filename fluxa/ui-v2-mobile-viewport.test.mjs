import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setPageScrollLock, viewportMetrics } from './ui-v2/mobile-viewport.js';

const html = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./ui-v2/mobile-viewport.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('./ui-v2/mobile-viewport.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');

assert.match(html, /ui-v2\/mobile-viewport\.css/);
assert.match(html, /ui-v2\/mobile-viewport\.js/);
assert.ok(html.indexOf('mobile-viewport.css') > html.indexOf('library-settings.css'), 'Mobile viewport CSS must be the final V2 cascade layer.');
assert.ok(html.indexOf('mobile-viewport.js') < html.indexOf('ui-v2/index.js'), 'Viewport metrics should initialize before the V2 app mounts.');

assert.deepEqual(viewportMetrics({ layoutHeight: 852, visualHeight: 852, offsetTop: 0 }), {
  layoutHeight: 852,
  visualHeight: 852,
  offsetTop: 0,
  keyboardInset: 0,
  keyboardOpen: false,
});
assert.deepEqual(viewportMetrics({ layoutHeight: 852, visualHeight: 522, offsetTop: 0 }), {
  layoutHeight: 852,
  visualHeight: 522,
  offsetTop: 0,
  keyboardInset: 330,
  keyboardOpen: true,
});
assert.deepEqual(viewportMetrics({ layoutHeight: 852, visualHeight: 522, offsetTop: 36 }), {
  layoutHeight: 852,
  visualHeight: 522,
  offsetTop: 36,
  keyboardInset: 294,
  keyboardOpen: true,
});
assert.equal(viewportMetrics({ layoutHeight: 812, visualHeight: 730, offsetTop: 0 }).keyboardOpen, false, 'Small browser chrome changes must not be classified as the keyboard.');

const body = { dataset: {}, style: {} };
const scrollCalls = [];
const fakeWindow = {
  scrollY: 417,
  scrollTo(input) { scrollCalls.push(input); },
};
const fakeDocument = { body };
setPageScrollLock(true, fakeWindow, fakeDocument);
assert.equal(body.dataset.v2ScrollLocked, 'true');
assert.equal(body.dataset.v2ScrollY, '417');
assert.equal(body.style.position, 'fixed');
assert.equal(body.style.top, '-417px');
assert.equal(body.style.overflow, 'hidden');
assert.equal(body.style.overscrollBehavior, 'none');
fakeWindow.scrollY = 0;
setPageScrollLock(true, fakeWindow, fakeDocument);
assert.equal(body.dataset.v2ScrollY, '417', 'Repeated renders while a sheet is open must not overwrite the original page position.');
setPageScrollLock(false, fakeWindow, fakeDocument);
assert.equal(body.dataset.v2ScrollLocked, undefined);
assert.equal(body.dataset.v2ScrollY, undefined);
assert.equal(body.style.position, '');
assert.equal(body.style.top, '');
assert.equal(body.style.overflow, '');
assert.deepEqual(scrollCalls, [{ top:417, left:0, behavior:'auto' }], 'Closing the sheet must restore the exact page position once.');
setPageScrollLock(false, fakeWindow, fakeDocument);
assert.equal(scrollCalls.length, 1, 'Repeated unlocked renders must not cause extra scroll restoration.');

assert.match(js, /visualViewport/);
assert.match(js, /--v2-visual-viewport-height/);
assert.match(js, /--v2-visual-viewport-offset-top/);
assert.match(js, /v2KeyboardOpen/);
assert.match(js, /focusin/);
assert.match(js, /ensureControlVisible/);
assert.match(js, /keepFocusVisible/);
assert.match(js, /clearTimeout/);
assert.match(js, /scheduleSync\(\{ ensureFocus: false \}\)/);
assert.match(js, /setPageScrollLock/);
assert.match(js, /position = 'fixed'/);
assert.match(js, /v2ScrollY/);
assert.match(index, /setPageScrollLock\(Boolean\(ui\.sheet\)/, 'The app renderer must drive the idempotent page scroll lock from sheet state.');
assert.doesNotMatch(index, /document\.body\.style\.overflow\s*=\s*ui\.sheet/, 'The old overflow-only lock can lose page position on iOS and must not return.');
assert.doesNotMatch(js, /MutationObserver/);

assert.match(css, /--v2-visual-viewport-height/);
assert.match(css, /--v2-visual-viewport-offset-top/);
assert.match(css, /top:\s*var\(--v2-visual-viewport-offset-top/);
assert.match(css, /data-v2-keyboard-open="true"/);
assert.match(css, /font-size:\s*16px/);
assert.match(css, /\.v2-field input,\s*\.v2-field select,\s*\.v2-library-search input\[type="search"\]\s*\{\s*min-height:\s*52px;/s,'Mobile controls must share one stable touch height across feature surfaces.');
assert.match(css, /\.v2-field textarea\s*\{\s*min-height:\s*96px;/s,'Mobile textareas must share one stable geometry across feature surfaces.');
assert.match(css, /body\[data-v2-sheet-open="true"\]\s*\{\s*touch-action:\s*auto;/s);
assert.match(css, /\.v2-sheet__body\s*\{\s*touch-action:\s*pan-y;/s);
assert.doesNotMatch(css, /body\[data-v2-sheet-open="true"\][^{]*\{[^}]*touch-action:\s*none/s);
assert.match(css, /\.v2-question\s*\{\s*min-height:\s*0;/s);
assert.match(css, /\.v2-file-button:focus-within/);
assert.match(css, /\.v2-history-event__dot::before/);
assert.match(css, /\.v2-history-event__dot::after\s*\{[^}]*bottom:\s*0;[^}]*height:\s*auto;/s);
assert.match(css, /@media \(max-width: 430px\)/);
assert.match(css, /\.v2-sheet__footer\s*\{\s*grid-template-columns:\s*1fr;/s);
assert.doesNotMatch(css, /@media \(max-width: 390px\)[\s\S]*\.v2-sheet__footer/);
assert.match(css, /scroll-padding-bottom/);

console.log('ui-v2-mobile-viewport.test.mjs: ok');
