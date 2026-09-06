import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const index = fs.readFileSync(new URL('./index.html', root), 'utf8');
const loader = fs.readFileSync(new URL('./ux-architecture-loader.js', root), 'utf8');

for (const name of [
  'ux-architecture-refresh.css',
  'ux-validation-hotfix.css',
  'mobile-ux-hardening.css',
  'idle-home-premium.css',
  'visual-reconciliation.css'
]) assert.ok(index.includes(`href="${name}"`), `missing ${name}`);

for (const name of [
  'ux-architecture-loader.js',
  'mobile-ux-hardening-ui.js',
  'planned-treatment-item-timing-ui.js'
]) assert.ok(index.includes(`src="${name}"`), `missing ${name}`);

for (const moduleName of [
  'workspace-shell-ui.js',
  'acervo-ui.js',
  'preparation-mobile-ux.js',
  'treatment-mobile-ux.js',
  'validation-round-5-ui.js'
]) assert.ok(loader.includes(moduleName), `architecture loader lost ${moduleName}`);

const styles = [...index.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
assert.equal(styles.at(-1), 'visual-reconciliation.css');
assert.ok(styles.indexOf('mobile-ux-hardening.css') < styles.indexOf('idle-home-premium.css'));
assert.ok(styles.indexOf('idle-home-premium.css') < styles.indexOf('visual-reconciliation.css'));
assert.ok(index.indexOf('ux-architecture-loader.js') < index.indexOf('mobile-ux-hardening-ui.js'));
assert.ok(index.indexOf('mobile-ux-hardening-ui.js') < index.indexOf('planned-treatment-item-timing-ui.js'));

console.log('pr95-main-reconciliation.test.mjs: ok');
