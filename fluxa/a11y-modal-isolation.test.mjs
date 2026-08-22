import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./a11y.js',import.meta.url),'utf8');

assert.match(source,/aria-modal/,'dialogs must remain announced as modal');
assert.match(source,/node\.inert = true/,'background siblings must become inert');
assert.match(source,/setAttribute\('aria-hidden', 'true'\)/,'background siblings must be hidden from assistive technology');
assert.match(source,/fluxaPreviousAriaHidden/,'previous aria-hidden state must be preserved');
assert.match(source,/node\.inert = false/,'inert state must be restored after closing');
assert.match(source,/removeAttribute\('aria-hidden'\)/,'temporary aria-hidden must be removed when it did not exist before');
assert.match(source,/syncModalIsolation\(\)/,'modal isolation must participate in the accessibility refresh cycle');
assert.match(source,/lastActive.*focus/s,'closing should still restore focus to the triggering control');

console.log('a11y-modal-isolation.test.mjs: ok');
