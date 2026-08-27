import assert from 'node:assert/strict';
import { recordStructuredFinalAssessment } from './backlog.js';

function makeStore(treatmentStatus) {
  let state = {
    version: 5,
    sessions: [{ id:'s1', status:'OPEN', currentAssistedEntityId:'a1', startedAt:'2026-08-26T14:00:00.000Z' }],
    preparationRuns: [{ id:'prep1', sessionId:'s1', status:'COMPLETED', completedAt:'2026-08-26T14:05:00.000Z' }],
    assistedEntities: [{ id:'a1', type:'PERSON', displayName:'Maria', birthDate:'1990-01-01', members:[], archivedAt:null }],
    treatments: [{ id:'t1', assistedEntityId:'a1', status:treatmentStatus, title:'Tratamento' }],
    treatmentComponents: [{ id:'c1', treatmentId:'t1', status:'COMPLETED', name:'Componente' }],
    assessments: [],
    events: [],
    reikiApplications: [],
    investigations: []
  };
  let n = 0;
  return {
    getState: () => state,
    setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
    makeId(prefix) { n += 1; return `${prefix}_${n}`; },
    nowIso() { return '2026-08-26T15:00:00.000Z'; }
  };
}

const input = {
  treatmentId:'t1',
  sessionId:'s1',
  frequency:'520',
  imbalancePercent:10,
  needsNewTreatment:false
};

for (const status of ['PLANNED', 'COMPLETED']) {
  const store = makeStore(status);
  const before = structuredClone(store.getState());
  assert.throws(
    () => recordStructuredFinalAssessment(store, input),
    /tratamento.*andamento|interrompido|estado/i,
    `final assessment must reject treatment status ${status}`
  );
  assert.deepEqual(store.getState().assessments, before.assessments, `rejected ${status} assessment must not persist data`);
  assert.deepEqual(store.getState().events, before.events, `rejected ${status} assessment must not append history`);
}

for (const status of ['IN_PROGRESS', 'INTERRUPTED']) {
  const store = makeStore(status);
  const assessment = recordStructuredFinalAssessment(store, input);
  assert.equal(assessment.treatmentId, 't1');
  assert.equal(store.getState().assessments.length, 1, `treatment status ${status} must remain eligible`);
  assert.equal(store.getState().events.at(-1).eventType, 'TREATMENT_FINAL_ASSESSMENT');
}

console.log('final-assessment-treatment-state-guard.test.mjs: ok');
