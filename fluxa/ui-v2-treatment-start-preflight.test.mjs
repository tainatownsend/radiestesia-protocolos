import assert from 'node:assert/strict';
import fs from 'node:fs';

const actions = fs.readFileSync(new URL('./ui-v2/state/actions.js', import.meta.url), 'utf8');
const start = actions.indexOf('export function saveTreatmentDraft');
const end = actions.indexOf('export function startPlannedTreatmentV2');
const saveDraft = actions.slice(start, end);

assert.ok(start >= 0 && end > start, 'V2 must expose the treatment draft/start action boundary.');
assert.match(actions, /function preflightImmediateTreatmentStart/);
assert.match(actions, /requireHawkinsBaseline/);
assert.match(saveDraft, /if \(start\) preflightImmediateTreatmentStart\(state, session\);/);
assert.ok(
  saveDraft.indexOf('preflightImmediateTreatmentStart(state, session)') < saveDraft.indexOf('createPlannedTreatment(store'),
  'Immediate start prerequisites must be checked before a planned treatment is persisted.',
);

console.log('ui-v2-treatment-start-preflight.test.mjs: ok');
