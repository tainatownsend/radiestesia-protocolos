import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('./premium-shell-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./brand-shell.css',import.meta.url),'utf8');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'brand-shell.css','The global brand shell must remain the final stylesheet in the cascade.');
assert.ok(styles.indexOf('premium-reference.css')<styles.indexOf('brand-shell.css'),'Brand shell must refine, not precede, the premium reference layer.');

assert.match(ui,/topbar-session-open/,'Session-open state must have a dedicated topbar treatment.');
assert.match(ui,/bottom-nav-icon/,'Bottom navigation must expose iconography.');
assert.match(ui,/bottom-nav-label/,'Bottom navigation must preserve visible text labels alongside icons.');
assert.match(ui,/aria-label','Brand enhancement must preserve an accessible name.');

assert.match(css,/font-family:Georgia,'Times New Roman',serif/,'Fluxa wordmark must keep the editorial serif treatment.');
assert.match(css,/\.topbar-session-open\s*\{[\s\S]*background:#173F46/,'Open sessions must use the approved Deep Teal topbar.');
assert.match(css,/\.bottom-nav-icon/,'Bottom navigation icon styling must remain present.');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Bottom navigation must continue respecting the iPhone safe area.');
assert.match(css,/backdrop-filter/,'Global navigation should retain the restrained premium translucent surface treatment.');

console.log('premium-brand-shell.test.mjs: ok');
