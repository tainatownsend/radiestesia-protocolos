import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateFinalAssessmentInput } from './final-assessment-rules.js';

for (const frequency of ['', 'abc', '0', '-10']) {
  assert.throws(() => validateFinalAssessmentInput({ frequency, imbalancePercent:10 }), /Hawkins em Hz/i);
}
assert.throws(() => validateFinalAssessmentInput({ frequency:'8500', imbalancePercent:'' }), /percentual de desequilíbrio/i);
assert.throws(() => validateFinalAssessmentInput({ frequency:'8500', imbalancePercent:120 }), /entre 0% e 100%/i);
assert.deepEqual(validateFinalAssessmentInput({ frequency:' 8500 ', imbalancePercent:'15' }), { frequency:'8500', hertz:8500, imbalancePercent:15 });
assert.deepEqual(validateFinalAssessmentInput({ frequency:'540.5', imbalancePercent:0 }), { frequency:'540.5', hertz:540.5, imbalancePercent:0 });

assert.throws(
  () => validateFinalAssessmentInput({ frequency:'540', imbalancePercent:'12', needsNewTreatment:true, nextTreatmentWhen:'' }),
  /Indique quando revisar ou iniciar o próximo tratamento/,
  'A final assessment that requires another treatment must record follow-up timing.',
);
assert.doesNotThrow(
  () => validateFinalAssessmentInput({ frequency:'540', imbalancePercent:'12', needsNewTreatment:true, nextTreatmentWhen:'em 7 dias' }),
);

const ui = fs.readFileSync(new URL('./ui-v2/treatment/final-assessment.js', import.meta.url), 'utf8');
assert.match(ui,/obrigatório se marcado acima/,'The conditional timing requirement must be visible before submission.');

console.log('final-assessment-rules.test.mjs: ok');
