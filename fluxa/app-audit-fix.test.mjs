import assert from 'node:assert/strict';
import fs from 'node:fs';

const loader=fs.readFileSync(new URL('./ux-architecture-loader.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./app-audit-fix.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./app-audit-fix.js',import.meta.url),'utf8');
const reikiOutside=fs.readFileSync(new URL('./reiki-outside-ui.js',import.meta.url),'utf8');
const reikiMode=fs.readFileSync(new URL('./reiki-mode-ui.js',import.meta.url),'utf8');

assert.match(loader,/app-audit-fix\.js/,'Architecture loader must keep the app-wide validation hotfix loaded last.');
assert.match(css,/\.workspace-bottom-nav\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/,'Bottom navigation must remain a true four-column dock.');
assert.match(css,/\.topbar\{[\s\S]*flex-wrap:nowrap!important/,'Desktop header must stay on one aligned row.');
assert.match(css,/\.hawkins-input\{/,'Hawkins fields must share one visual component.');
assert.match(css,/\[data-prep-structured\]/,'Preparation must keep the audited visual workflow.');
assert.match(css,/html,body\{max-width:100%;overflow-x:hidden;\}/,'Validation branch must prevent accidental horizontal scrolling.');
assert.match(css,/max-height:min\(90dvh,820px\)!important/,'Sheets must respect the dynamic viewport on mobile and tablet.');
assert.match(css,/@media\(min-width:700px\) and \(max-width:1180px\)/,'The premium responsive system must keep an explicit iPad/tablet range.');
assert.match(css,/@media\(max-width:390px\)[\s\S]*?\.home-primary-actions\{grid-template-columns:1fr!important/,'Very narrow phones must stack primary session actions.');
assert.match(css,/\.timeline-item\{grid-template-columns:minmax\(42px,54px\) 10px minmax\(0,1fr\)!important/,'Timeline text must retain a shrinkable content column.');
assert.match(css,/\.field input,\.field textarea,\.field select\{font-size:16px!important;\}/,'Mobile form controls must avoid browser zoom caused by undersized text.');
assert.match(js,/memory\.set\(key,input\.value\)/,'Hawkins input value must survive DOM refreshes while the user types.');
assert.match(js,/MutationObserver\(\(\)=>queueMicrotask\(restore\)\)/,'Hawkins input restoration must follow UI re-renders.');
assert.match(reikiOutside,/syncLegacyRetrospectiveAction/,'The idle Home must hide legacy Reiki entry points when Reiki is not configured.');
assert.match(reikiMode,/isReikiEnabled/,'In-session Reiki must remain gated by the current therapy settings after main is synced into the UX branch.');

console.log('app-audit-fix.test.mjs: ok');
