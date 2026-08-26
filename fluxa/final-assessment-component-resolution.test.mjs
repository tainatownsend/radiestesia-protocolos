import assert from 'node:assert/strict';
import { recordStructuredFinalAssessment } from './backlog.js';

function makeStore(initial) {
  let state = structuredClone(initial);
  let n = 0;
  return {
    getState: () => state,
    setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
    makeId(prefix) { n += 1; return `${prefix}_${n}`; },
    nowIso() { return '2026-08-26T15:00:00.000Z'; }
  };
}

function baseState(componentStatus = 'IN_PROGRESS') {
  return {
    version: 5,
    sessions: [{ id:'s1', status:'OPEN', currentAssistedEntityId:'a1', startedAt:'2026-08-26T14:00:00.000Z' }],
    preparationRuns: [{ id:'prep1', sessionId:'s1', status:'COMPLETED', completedAt:'2026-08-26T14:05:00.000Z' }],
    assistedEntities: [{ id:'a1', type:'PERSON', displayName:'Maria', birthDate:'1990-01-01', members:[], archivedAt:null }],
    treatments: [{ id:'t1', assistedEntityId:'a1', status:'IN_PROGRESS', title:'Tratamento' }],
    treatmentComponents: [{ id:'c1', treatmentId:'t1', status:componentStatus, name:'Componente' }],
    assessments: [],
    events: [],
    reikiApplications: [],
    investigations: []
  };
}

const assessmentInput = {
  treatmentId:'t1',
  sessionId:'s1',
  frequency:'520',
  imbalancePercent:10,
  needsNewTreatment:false
};

{
  const store = makeStore(baseState('IN_PROGRESS'));
  const eventsBefore = store.getState().events.length;
  assert.throws(
    () => recordStructuredFinalAssessment(store, assessmentInput),
    /Resolva todos os componentes/i,
    'final assessment must not be recorded while treatment components remain unresolved'
  );
  assert.equal(store.getState().assessments.length, 0, 'rejected final assessment must not persist an assessment');
  assert.equal(store.getState().events.length, eventsBefore, 'rejected final assessment must not append history');
}

{
  const store = makeStore(baseState('COMPLETED'));
  const assessment = recordStructuredFinalAssessment(store, assessmentInput);
  assert.equal(assessment.treatmentId, 't1');
  assert.equal(store.getState().assessments.length, 1, 'resolved treatment may record its final assessment');
  assert.equal(store.getState().events.at(-1).eventType, 'TREATMENT_FINAL_ASSESSMENT');
}

{
  const state = baseState('COMPLETED');
  state.treatmentComponents = [];
  const store = makeStore(state);
  assert.throws(
    () => recordStructuredFinalAssessment(store, assessmentInput),
    /Resolva todos os componentes/i,
    'a treatment without components must not bypass final-assessment readiness'
  );
  assert.equal(store.getState().assessments.length, 0);
}

console.log('final-assessment-component-resolution.test.mjs: ok');
