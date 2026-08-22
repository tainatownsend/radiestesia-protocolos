import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('./premium-shell-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./brand-shell.css',import.meta.url),'utf8');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const premiumIndex=styles.indexOf('premium-reference.css');
const brandIndex=styles.indexOf('brand-shell.css');
assert.ok(premiumIndex>=0&&brandIndex>premiumIndex,'Brand shell must refine, not precede, the premium reference layer.');
const idleIndex=styles.indexOf('idle-home-premium.css');
if(idleIndex>=0)assert.ok(idleIndex>brandIndex,'State-specific idle styling may follow the global brand shell, never precede it.');

assert.ok(ui.includes('topbar-session-open'),'Session-open state must have a dedicated topbar treatment.');
assert.ok(ui.includes('bottom-nav-icon'),'Bottom navigation must expose iconography.');
assert.ok(ui.includes('bottom-nav-label'),'Bottom navigation must preserve visible text labels alongside icons.');
assert.ok(ui.includes("setAttribute('aria-label','Fluxa · Hoje')"),'Brand enhancement must preserve an accessible name.');

assert.ok(css.includes("font-family:Georgia,'Times New Roman',serif"),'Fluxa wordmark must keep the editorial serif treatment.');
assert.match(css,/\.topbar-session-open\s*\{[\s\S]*?background:#173F46/,'Open sessions must use the approved Deep Teal topbar.');
assert.ok(css.includes('.bottom-nav-icon'),'Bottom navigation icon styling must remain present.');
assert.ok(css.includes('env(safe-area-inset-bottom)'),'Bottom navigation must continue respecting the iPhone safe area.');
assert.ok(css.includes('backdrop-filter'),'Global navigation should retain the restrained premium translucent surface treatment.');

console.log('premium-brand-shell.test.mjs: ok');
