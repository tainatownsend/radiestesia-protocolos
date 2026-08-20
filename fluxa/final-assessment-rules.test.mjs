import assert from 'node:assert/strict';
import { validateFinalAssessmentInput } from './final-assessment-rules.js';

assert.throws(() => validateFinalAssessmentInput({ frequency:'', imbalancePercent:10 }), /frequência vibracional/i);
assert.throws(() => validateFinalAssessmentInput({ frequency:'8500', imbalancePercent:'' }), /percentual de desequilíbrio/i);
assert.throws(() => validateFinalAssessmentInput({ frequency:'8500', imbalancePercent:120 }), /entre 0% e 100%/i);
assert.deepEqual(validateFinalAssessmentInput({ frequency:' 8500 ', imbalancePercent:'15' }), { frequency:'8500', imbalancePercent:15 });

console.log('final-assessment-rules.test.mjs: ok');
