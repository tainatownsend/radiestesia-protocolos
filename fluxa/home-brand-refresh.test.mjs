import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const html=fs.readFileSync(new URL('./index.html',root),'utf8');
const home=fs.readFileSync(new URL('./home-refresh-ui.js',root),'utf8');
const brand=fs.readFileSync(new URL('./brand-refresh.css',root),'utf8');

assert.ok(html.includes('brand-refresh.css'),'Canonical Fluxa brand layer must be loaded.');
assert.ok(html.includes('home-refresh-ui.js'),'Focused Home layer must be loaded.');
assert.ok(html.indexOf('brand-refresh.css')>html.indexOf('ux-conduction-extensions.css'),'Canonical brand CSS must load after prior visual layers.');
assert.ok(html.indexOf('home-refresh-ui.js')>html.indexOf('ux-return-validation-ui.js'),'Focused Home must run after earlier UX enhancers.');

for(const [token,value] of Object.entries({
  '--bg':'#EFF1EF','--surface':'#F8F9F7','--surface-2':'#DEE4E1','--primary':'#173F46','--primary-strong':'#102F35','--secondary':'#66898C','--accent':'#C17C61','--text':'#202729','--muted':'#606B6C','--border':'#CBD3D1'
})) assert.ok(brand.includes(`${token}:${value}`),`Brand token ${token} must use approved Deep Teal value ${value}.`);

assert.match(home,/data-home-cockpit/,'Home should expose one canonical therapist cockpit.');
assert.match(home,/Atendimento atual/,'Home cockpit should show current assisted context.');
assert.match(home,/Próximo passo/,'Home cockpit should prioritize the next step.');
assert.match(home,/data-home-actions/,'Home cockpit should retain the four core therapist actions.');
assert.match(home,/data-fast-session-context.*hidden/,'Legacy fast context should be hidden from the refreshed Home.');
assert.match(home,/data-ux-next-action.*hidden/,'Previous next-action card should be hidden to avoid duplication.');
assert.match(home,/Contexto atual/,'Original assisted context card should be detected and hidden.');
assert.match(home,/Novo trabalho/,'Original action grid should be detected and hidden.');
assert.match(home,/homeToggleSection/,'Session and idle activity should be collapsible instead of permanently expanded.');
assert.match(home,/data-session-dashboard.*hidden/,'Session dashboard should stay out of the primary Home surface.');
assert.match(home,/fluxa-home-preparing/,'Preparation should have its own reduced-distraction Home state.');
assert.match(home,/fluxa-home-idle/,'Idle Home should have its own reduced-density state.');
assert.match(home,/Atividade recente/,'Idle activity should be explicitly collapsed by the Home refresh.');

assert.match(brand,/\.home-cockpit-next\{[^}]*background:var\(--primary-strong\)/,'Canonical Deep Teal layer must retain the primary decision token before premium overrides.');
assert.match(brand,/\.home-primary-actions/,'Core actions should share one visually unified surface.');
assert.match(brand,/fluxa-home-refreshed main>\.eyebrow[^}]*display:none/,'Prepared Home should remove redundant page-level heading chrome.');
assert.match(brand,/fluxa-home-preparing/,'Brand layer should visually prioritize preparation.');
assert.match(brand,/fluxa-home-idle/,'Brand layer should visually simplify the idle Home.');
assert.doesNotMatch(brand,/purple|violet|cosmic|gold/i,'Canonical identity must not introduce mystical palette language.');

console.log('home-brand-refresh.test.mjs: ok');
