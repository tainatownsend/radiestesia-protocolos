import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const html=fs.readFileSync(new URL('./index.html',root),'utf8');
const integration=fs.readFileSync(new URL('./ux-post-merge-integration-ui.js',root),'utf8');

assert.match(html,/ux-post-merge-integration-ui\.js/,'Post-merge integration guard must be loaded.');
assert.ok(html.indexOf('ux-post-merge-integration-ui.js')>html.indexOf('ux-milestone-ui.js'),'Integration guard must load after the UX conduction modules.');
assert.match(integration,/ux-internal-dismiss-sheet/,'Quick-finding internal dismiss must be masked during document capture.');
assert.match(integration,/rememberCreatedFindings/,'Confirmed findings need an independent handoff copy.');
assert.match(integration,/if\(!created\)return; \/\/ validation\/persistence failed: preserve handoff for retry/,'Failed treatment creation must preserve the finding handoff for retry.');
assert.match(integration,/dataset\.continuityInvestigation=id/,'Investigation stack must route through exact-ID continuity resume.');
assert.match(integration,/data-ux-resume-specific/,'Exact stack resume must intercept the older latest-investigation action.');
assert.match(integration,/dataset\.uxShowOptions='true'/,'No-pending state should offer neutral options instead of forcing investigation.');
assert.match(integration,/Nenhuma pendência exige sua atenção agora/,'Neutral next-action copy must preserve therapist choice.');

console.log('ux-post-merge-integration.test.mjs: ok');
