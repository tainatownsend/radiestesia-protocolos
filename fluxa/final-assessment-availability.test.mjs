import assert from 'node:assert/strict';
import { TreatmentStatus } from './domain.js';
import { canRunFinalAssessment } from './remaining.js';

function stateFor(status, componentStatus = TreatmentStatus.COMPLETED) {
  return {
    treatments: [{ id: 'trt-1', assistedEntityId: 'ast-1', status }],
    treatmentComponents: [{ id: 'cmp-1', treatmentId: 'trt-1', status: componentStatus }]
  };
}

assert.equal(
  canRunFinalAssessment(stateFor(TreatmentStatus.PLANNED), 'trt-1'),
  false,
  'A planned treatment must not advertise final assessment availability.'
);
assert.equal(
  canRunFinalAssessment(stateFor(TreatmentStatus.COMPLETED), 'trt-1'),
  false,
  'A completed treatment must not advertise another final assessment.'
);
assert.equal(
  canRunFinalAssessment(stateFor(TreatmentStatus.IN_PROGRESS), 'trt-1'),
  true,
  'An in-progress treatment with resolved components can run final assessment.'
);
assert.equal(
  canRunFinalAssessment(stateFor(TreatmentStatus.INTERRUPTED), 'trt-1'),
  true,
  'An interrupted treatment with resolved components can run final assessment.'
);
assert.equal(
  canRunFinalAssessment(stateFor(TreatmentStatus.IN_PROGRESS, TreatmentStatus.IN_PROGRESS), 'trt-1'),
  false,
  'Unresolved components must continue to block final assessment.'
);

console.log('final-assessment-availability.test.mjs: ok');
