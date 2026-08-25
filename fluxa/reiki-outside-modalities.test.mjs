import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./reiki-outside-ui.js', import.meta.url), 'utf8');

assert.match(source, /therapeuticModalities/,'Reiki outside-session UI must read therapeutic modality settings.');
assert.match(source, /includes\('REIKI'\)/,'Reiki outside-session UI must require the REIKI modality for a new idle-home entry point.');
assert.match(source, /!current\s*&&\s*!reikiConfigured\(\)/,'A disabled Reiki modality must remove the idle-home Reiki entry point when no outside-session application is active.');
assert.match(source, /store\.subscribe\(\(\)=>queueMicrotask\(ensureAction\)\)/,'Reiki visibility must react when modality settings change.');
assert.match(source, /const current=active\(\);[\s\S]*!current\s*&&\s*!reikiConfigured\(\)/,'An already-running outside-session Reiki application must remain reachable so it can be safely completed even if Reiki is later disabled.');
assert.match(source, /\[data-action="reiki-retro"\][\s\S]*toggleAttribute\('hidden',!reikiConfigured\(\)\)/,'The legacy retrospective Reiki action on Hoje must follow configured modalities too.');
assert.match(source, /b\.dataset\.action==='reiki-retro'&&!reikiConfigured\(\)[\s\S]*stopImmediatePropagation/,'Disabled Reiki must block the legacy retrospective click path even before the UI synchronization runs.');
assert.match(source, /form\.id==='reiki-retro-form'&&!reikiConfigured\(\)[\s\S]*stopImmediatePropagation/,'Disabled Reiki must block submission of a retrospective form that was already open.');
assert.match(source, /if\(!reikiConfigured\(\)\) return;/,'Starting a new outside-session Reiki application must be guarded at dialog creation.');

console.log('reiki-outside-modalities.test.mjs: ok');
