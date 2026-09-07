import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preventImplicitV2FormSubmit, initFormSubmitGuard } from './ui-v2/form-submit-guard.js';

let prevented = false;
const formEvent = {
  target: { matches: (selector) => selector === 'form' },
  preventDefault() { prevented = true; },
};
assert.equal(preventImplicitV2FormSubmit(formEvent), true);
assert.equal(prevented, true, 'Implicit form submissions must be prevented so Enter cannot reload or navigate away from an in-progress V2 sheet.');
assert.equal(preventImplicitV2FormSubmit({ target:{ matches:() => false }, preventDefault() { throw new Error('must not run'); } }), false);

let listener = null;
const root = {
  dataset:{},
  addEventListener(type, handler) {
    assert.equal(type, 'submit');
    listener = handler;
  },
};
assert.equal(initFormSubmitGuard(root), true);
assert.equal(typeof listener, 'function');
assert.equal(root.dataset.v2FormSubmitGuard, 'true');
assert.equal(initFormSubmitGuard(root), false, 'The submit guard must install only once.');

const html = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');
assert.match(html, /ui-v2\/form-submit-guard\.js/);
assert.ok(html.indexOf('form-submit-guard.js') < html.indexOf('ui-v2/index.js'), 'The guard must be active before the interactive V2 controller mounts.');

const source = fs.readFileSync(new URL('./ui-v2/form-submit-guard.js', import.meta.url), 'utf8');
assert.doesNotMatch(source, /location\.|window\.location|form\.submit\(/);
assert.doesNotMatch(source, /MutationObserver/);

console.log('ui-v2-form-submit-guard.test.mjs: ok');
