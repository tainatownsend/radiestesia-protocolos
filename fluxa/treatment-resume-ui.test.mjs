import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('./treatment-resume-ui.js',import.meta.url),'utf8');

const guardIndex=index.indexOf('treatment-resume-ui.js');
const backlogIndex=index.indexOf('backlog-ui.js');
assert.ok(guardIndex>=0&&backlogIndex>=0&&guardIndex<backlogIndex,'resume guard must register before backlog-ui');
assert.match(ui,/stopImmediatePropagation\(\)/,'guard must prevent the older resume handler from running twice');
assert.match(ui,/document\.addEventListener\('click',[\s\S]*\},true\);/,'resume guard must stay in capture phase so the safe handler runs before legacy bubbling handlers');
assert.match(ui,/resumeTreatmentPreservingDuration/);
assert.match(ui,/catch\(error\)/,'resume errors must be handled in the UI');
assert.match(ui,/alert\(error\?\.message/,'domain error copy should be surfaced instead of becoming an uncaught exception');

console.log('treatment-resume-ui.test.mjs: ok');
