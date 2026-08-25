import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('./app-audit-fix.css',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('./workspace-layout-fix.js',import.meta.url),'utf8');
const topbar=css.match(/\.topbar\{([^}]*)\}/s)?.[1]||'';

assert.match(topbar,/display:grid!important/,
  'Desktop/iPad header must use the grid layout expected by workspace-layout-fix.js.');
assert.doesNotMatch(topbar,/display:flex!important/,
  'A flex !important override must not disable the runtime header grid reconciler.');
assert.match(layout,/topbar\.style\.gridTemplateColumns/,
  'Runtime header reconciliation must keep deriving columns from visible topbar children.');
assert.match(layout,/repeat\(\$\{trailing\},auto\)/,
  'Trailing header controls must keep auto-sized columns while the brand occupies the flexible column.');

console.log('header-grid-reconciliation.test.mjs: ok');
