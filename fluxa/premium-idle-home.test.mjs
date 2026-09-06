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
assert.ok(reconciliation.includes('--fluxa-teal:#173F46')&&reconciliation.includes('--fluxa-teal-deep:#102F35'),'Approved Deep Teal brand anchors must stay locked.');
assert.ok(reconciliation.includes('--fluxa-coral:#C17C61'),'Approved coral accent must stay locked.');
assert.ok(reconciliation.includes('--fluxa-touch:48px'),'Primary operational touch target must remain one-hand friendly.');
assert.ok(reconciliation.includes('.workspace-nav-btn{font-weight:680!important;color:#6A7474!important;min-height:var(--fluxa-touch)!important;}'),'Bottom navigation must preserve a reliable touch target.');
assert.ok(reconciliation.includes('@media(min-width:700px) and (max-width:1100px)'),'Visual reconciliation must preserve a dedicated iPad/tablet range.');
assert.ok(reconciliation.includes('main{width:min(100%,820px);padding-inline:24px;}'),'Tablet content must remain comfortably constrained rather than stretching into a desktop dashboard.');
assert.ok(css.includes('.home-idle-secondary'),'Retrospective Reiki must remain visually secondary.');
assert.ok(css.includes('.home-collapsible-section'),'Recent activity must remain a collapsible secondary surface.');
assert.ok(css.includes('@media(max-width:560px)'),'Idle Home must preserve a dedicated iPhone layout.');
assert.ok(home.includes("classList.add('fluxa-home-idle')"),'Home enhancer must expose the idle-state class.');
assert.ok(home.includes('collapseSection(recent)'),'Recent activity must default to collapsed in idle state.');
assert.ok(app.includes('Nenhuma sessão aberta')&&app.includes('Iniciar sessão'),'The dominant idle action must remain explicit and functional.');

console.log('premium-idle-home.test.mjs: ok');
