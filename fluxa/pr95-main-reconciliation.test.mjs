import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const requiredStyles = [
  'ux-architecture-refresh.css',
  'visual-reconciliation.css',
  'validation-round-5.css',
  'mobile-ux-hardening.css',
  'idle-home-premium.css'
];
for (const name of requiredStyles) assert.ok(index.includes(`href="${name}"`), `missing ${name}`);

const requiredScripts = [
  'ux-architecture-loader.js',
  'mobile-ux-hardening-ui.js',
  'planned-treatment-item-timing-ui.js'
];
for (const name of requiredScripts) assert.ok(index.includes(`src="${name}"`), `missing ${name}`);

const lastStylesheet = [...index.matchAll(/href="([^"]+\.css)"/g)].at(-1)?.[1];
assert.equal(lastStylesheet, 'idle-home-premium.css');
assert.ok(index.indexOf('ux-architecture-loader.js') < index.indexOf('mobile-ux-hardening-ui.js'));

console.log('pr95-main-reconciliation.test.mjs: ok');
