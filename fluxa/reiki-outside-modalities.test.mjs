import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./reiki-outside-ui.js', import.meta.url), 'utf8');

assert.match(source, /therapeuticModalities/,'Reiki outside-session UI must read therapeutic modality settings.');
assert.match(source, /includes\('REIKI'\)/,'Reiki outside-session UI must require the REIKI modality for a new idle-home entry point.');
assert.match(source, /!current\s*&&\s*!reikiConfigured\(\)/,'A disabled Reiki modality must remove the idle-home Reiki entry point when no outside-session application is active.');
assert.match(source, /store\.subscribe\(\(\)=>queueMicrotask\(ensureAction\)\)/,'Reiki visibility must react when modality settings change.');
assert.match(source, /const current=active\(\);[\s\S]*!current\s*&&\s*!reikiConfigured\(\)/,'An already-running outside-session Reiki application must remain reachable so it can be safely completed even if Reiki is later disabled.');

console.log('reiki-outside-modalities.test.mjs: ok');
