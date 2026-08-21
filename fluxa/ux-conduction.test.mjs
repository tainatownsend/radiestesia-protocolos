import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('.',import.meta.url);
const html=fs.readFileSync(new URL('./index.html',root),'utf8');
const conduction=fs.readFileSync(new URL('./ux-conduction-ui.js',root),'utf8');
const extensions=fs.readFileSync(new URL('./ux-conduction-extensions-ui.js',root),'utf8');
const milestones=fs.readFileSync(new URL('./ux-milestone-ui.js',root),'utf8');
const css=fs.readFileSync(new URL('./ux-conduction.css',root),'utf8');
const extras=fs.readFileSync(new URL('./ux-conduction-extensions.css',root),'utf8');

for(const file of ['ux-conduction.css','ux-conduction-extensions.css','ux-conduction-ui.js','ux-conduction-extensions-ui.js','ux-milestone-ui.js']){
  assert.match(html,new RegExp(file.replaceAll('.','\\.')),`index.html must load ${file}`);
}
assert.match(conduction,/data-ux-next-action/,'Today should expose one explicit next-action area.');
assert.match(conduction,/data-ux-investigation-stack/,'Open sessions should expose an investigation stack.');
assert.match(conduction,/fluxa-context-collapsed/,'Fast assisted context should collapse on scroll.');
assert.match(conduction,/Sessão possivelmente esquecida/,'Long-running sessions should surface forgotten-session context.');
assert.match(conduction,/ux-hide-before-close/,'Pre-close review should move reports out of the closing decision.');
assert.match(conduction,/ux-post-close-overlay/,'Post-close documentation actions should be presented after closure.');
assert.match(conduction,/data-ux-open-components/,'Treatment review should route into component review.');
assert.match(extensions,/handleQuickFindings/,'Quick findings should use the guided handoff.');
assert.match(extensions,/handleBranchFindings/,'Branching findings should use the guided handoff.');
assert.match(extensions,/pendingFindingIds/,'Finding-to-treatment trace must survive the handoff.');
assert.match(extensions,/data-ux-findings-treat/,'Finding handoff should offer treatment as a next action.');
assert.match(extensions,/data-ux-findings-investigate/,'Finding handoff should offer continued investigation.');
assert.match(extensions,/data-ux-last-session/,'Assisted details should include a return summary.');
assert.match(extensions,/fluxa\.protocolFavorites/,'Protocol chooser should support favorites.');
assert.match(extensions,/fluxa\.protocolRecents/,'Protocol chooser should support recent protocols.');
assert.match(extensions,/ux-dashboard-collapsed/,'Session dashboard should be collapsible by default.');
assert.match(milestones,/INVESTIGATION_COMPLETED:'Investigação concluída'/);
assert.match(milestones,/REIKI_COMPLETED:'Reiki concluído'/);
assert.match(css,/#session-template-editor-overlay \.check-row > span \{ display:flex; flex-direction:column/,'Session template labels and hints must not run together.');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Sheets must respect iPhone bottom safe area.');
assert.match(extras,/ux-milestone-toast/,'Milestone feedback needs visible mobile styling.');

console.log('ux-conduction.test.mjs: ok');
