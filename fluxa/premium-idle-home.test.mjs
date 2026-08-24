import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./idle-home-premium.css',import.meta.url),'utf8');
const reconciliation=fs.readFileSync(new URL('./visual-reconciliation.css',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('./home-refresh-ui.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'visual-reconciliation.css','Visual reconciliation must be the final style authority during the identity validation round.');
assert.ok(styles.indexOf('brand-shell.css')<styles.indexOf('idle-home-premium.css'));
assert.ok(styles.indexOf('idle-home-premium.css')<styles.indexOf('visual-reconciliation.css'));
assert.ok(css.includes('body.fluxa-home-idle main>:is(.eyebrow,h1,.lead){display:none;}'),'Idle Home must remove redundant page-level copy.');
assert.ok(css.includes('body.fluxa-home-idle .hero-card'),'Idle Home must keep one compact dominant session card.');
assert.ok(reconciliation.includes('body.fluxa-home-idle .hero-card'),'Deep Teal reconciliation must deliberately refine the idle hero rather than bypass it.');
assert.ok(css.includes('.home-idle-secondary'),'Retrospective Reiki must remain visually secondary.');
assert.ok(css.includes('.home-collapsible-section'),'Recent activity must remain a collapsible secondary surface.');
assert.ok(css.includes('@media(max-width:560px)'),'Idle Home must preserve a dedicated iPhone layout.');
assert.ok(home.includes("classList.add('fluxa-home-idle')"),'Home enhancer must expose the idle-state class.');
assert.ok(home.includes('collapseSection(recent)'),'Recent activity must default to collapsed in idle state.');
assert.ok(app.includes('Nenhuma sessão aberta')&&app.includes('Iniciar sessão'),'The dominant idle action must remain explicit and functional.');

console.log('premium-idle-home.test.mjs: ok');
