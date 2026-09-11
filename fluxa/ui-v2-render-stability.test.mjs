import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');

function functionBlock(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `Missing ${name}.`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
  assert.ok(end > start, `Could not isolate ${name}.`);
  return source.slice(start, end);
}

const scheduler = functionBlock('scheduleRender', 'renderPreservingSheetScroll');
assert.match(scheduler, /if \(renderQueued\) return;/,'Scheduler must coalesce duplicate render requests.');
assert.match(scheduler, /focusAfterRender \|\|= focusDialog;/,'A later sheet-open request must preserve focus intent even when a render is already queued.');

const preserving = functionBlock('renderPreservingSheetScroll', 'clearInlineError');
assert.match(preserving, /scheduleRender\(\);/,'Scroll-preserving updates must join the queued render instead of rendering immediately.');
assert.doesNotMatch(preserving, /\brender\(\);/,'Scroll-preserving updates must not cause a second immediate repaint.');
assert.ok(preserving.indexOf('scheduleRender();') < preserving.indexOf('queueMicrotask'), 'Scroll restoration must run after the scheduled render.');

const openSheet = functionBlock('openSheet', 'openTreatmentComposer');
assert.match(openSheet, /scheduleRender\(\{ focusDialog: true \}\);/,'Opening a sheet must use the coalescing scheduler.');
assert.doesNotMatch(openSheet, /\brender\(/,'Opening a sheet must not immediately rebuild the DOM.');

const treatmentAction = functionBlock('performTreatmentAction', 'performNext');
assert.match(treatmentAction, /scheduleRender\(\{ focusDialog: true \}\);/,'Treatment state transitions must use the coalescing scheduler.');
assert.doesNotMatch(treatmentAction, /\brender\(/,'Treatment state transitions must not rebuild the sheet twice around a store mutation.');

assert.match(source, /store\.subscribe\(\(\) => scheduleRender\(\)\)/,'Store mutations must flow through the same scheduler as UI sheet changes.');

console.log('ui-v2-render-stability.test.mjs: ok');
