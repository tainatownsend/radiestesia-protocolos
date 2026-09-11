import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isContinuityLocked } from './ui-v2/workflow-continuity.js';

const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');

assert.equal(isContinuityLocked('TRIAGE'), true);
assert.equal(isContinuityLocked('FINDINGS'), true);
assert.equal(isContinuityLocked('REIKI_CONTEXT'), true);
assert.equal(isContinuityLocked('REIKI_ACTIVE'), true);
assert.equal(isContinuityLocked('TREATMENT_REVIEW'), true);
assert.equal(isContinuityLocked('TREATMENT_FINAL'), true);
assert.equal(isContinuityLocked('TREATMENT_WORKSPACE'), false);

assert.match(index,/function requireTreatmentActionAllowed\(action, treatmentId\)[\s\S]*isRecommendedReview[\s\S]*isRecommendedFinal/,'Controller must allow only the recommended review/final mutation while continuity is locked.');
assert.match(index,/function performTreatmentAction[\s\S]*requireTreatmentActionAllowed\(action, treatmentId\);/,'Treatment card actions must pass through the controller continuity guard.');
assert.match(index,/const treatmentSubmit = event\.target\.closest\('\[data-v2-treatment-submit\]'\);[\s\S]*requireNewTreatmentAllowed\(\);[\s\S]*saveTreatmentDraft/,'Submitting a treatment draft must re-check continuity in the controller.');
assert.match(index,/const reviewComponent = event\.target\.closest\('\[data-v2-review-component\]'\);[\s\S]*requireTreatmentActionAllowed\('review', treatmentId\);/,'Direct component review must re-check the owning treatment against the recommended action.');
assert.match(index,/ui\.sheet === 'treatment-review'[\s\S]*requireTreatmentActionAllowed\('review', ui\.activeTreatmentId\);/,'Review submission must remain guarded after the sheet is already open.');
assert.match(index,/ui\.sheet === 'final-assessment'[\s\S]*requireTreatmentActionAllowed\('final', ui\.activeTreatmentId\);/,'Final assessment submission must remain guarded after the sheet is already open.');
assert.match(index,/const assisted = event\.target\.closest\('\[data-v2-select-assisted\]'\);[\s\S]*!assistedContextChangeAllowed\(\)[\s\S]*selectSessionAssisted/,'Assisted selection must reject stale or programmatic context switching during a contiguous workflow.');
assert.match(index,/name === 'change-assisted'[\s\S]*assistedContextChangeAllowed\(\)[\s\S]*openSheet\('assisted', action\)/,'Opening the assisted picker must also re-check continuity.');

console.log('ui-v2-controller-continuity.test.mjs: ok');
