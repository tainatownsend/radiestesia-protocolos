import assert from 'node:assert/strict';
import {
  recordComponentDismantlingReview,
  treatmentComponentResolution,
  updateAssistedEntity,
  archiveAssistedEntity,
  completeTreatmentAfterFinalAssessment
} from './remaining.js';

function makeStore(initial) {
  let state = structuredClone(initial);
  let n = 0;
  return {
    getState: () => state,
    setState(updater) { state = typeof updater === 'function' ? updater(state) : updater; return state; },
    makeId(prefix) { n += 1; return `${prefix}_${n}`; },
    nowIso() { return '2026-08-20T01:00:00.000Z'; }
  };
}

function baseState() {
  return {
    version:5,
    sessions: [{ id:'s1', status:'OPEN', startedAt:'2026-08-20T00:00:00.000Z', currentAssistedEntityId:'a1' }],
    preparationRuns: [{ id:'p1', sessionId:'s1', status:'COMPLETED', completedAt:'2026-08-20T00:05:00.000Z' }],
    assistedEntities: [{ id:'a1', type:'PERSON', displayName:'Maria', birthDate:'1990-01-01', members:[], archivedAt:null }],
    treatments: [{ id:'t1', assistedEntityId:'a1', status:'IN_PROGRESS', title:'Tratamento', createdAt:'2026-08-20T00:00:00.000Z' }],
    treatmentComponents: [{ id:'c1', treatmentId:'t1', name:'Gráfico A', status:'IN_PROGRESS', expectedEndAt:'2026-08-20T00:30:00.000Z' }],
    investigations: [], reikiApplications: [], events: [], assessments: [], componentReviews: []
  };
}

{
  const store = makeStore(baseState());
  recordComponentDismantlingReview(store, { componentId:'c1', sessionId:'s1', verifiedComplete:true, permissionToDismantle:false });
  assert.equal(store.getState().treatmentComponents[0].status, 'IN_PROGRESS');
  recordComponentDismantlingReview(store, { componentId:'c1', sessionId:'s1', verifiedComplete:true, permissionToDismantle:true });
  assert.equal(store.getState().treatmentComponents[0].status, 'COMPLETED');
  assert.equal(treatmentComponentResolution(store.getState(), 't1').readyForFinalAssessment, true);
}

{
  const state = baseState();
  state.treatmentComponents.push({ id:'c2', treatmentId:'t1', name:'Planejado', status:'PLANNED' });
  assert.equal(treatmentComponentResolution(state, 't1').readyForFinalAssessment, false, 'planned components remain unresolved');
}

{
  const store = makeStore(baseState());
  assert.throws(() => archiveAssistedEntity(store, 'a1'), /trabalhos ativos/i);
  store.setState((s) => { const d = structuredClone(s); d.treatments[0].status = 'COMPLETED'; d.treatmentComponents[0].status = 'COMPLETED'; return d; });
  archiveAssistedEntity(store, 'a1', 'fim do acompanhamento');
  assert.ok(store.getState().assistedEntities[0].archivedAt);
}

{
  const store = makeStore(baseState());
  updateAssistedEntity(store, 'a1', { type:'PERSON', displayName:'Maria Silva', birthDate:'1990-01-01', members:[], details:'Atualizado' });
  assert.equal(store.getState().assistedEntities[0].displayName, 'Maria Silva');
  assert.equal(store.getState().events.at(-1).eventType, 'ASSISTED_UPDATED');
  assert.throws(() => updateAssistedEntity(store, 'a1', { type:'PET', displayName:'Maria', members:[] }), /tipo/i);
}

{
  const state = baseState();
  state.treatmentComponents[0].status = 'COMPLETED';
  state.assessments.push({ id:'fa1', treatmentId:'t1', createdAt:'2026-08-20T00:50:00.000Z', imbalancePercent:10, needsNewTreatment:true, nextTreatmentWhen:'em 7 dias' });
  const store = makeStore(state);
  completeTreatmentAfterFinalAssessment(store, 't1', 's1');
  assert.equal(store.getState().treatments[0].status, 'COMPLETED');
  assert.equal(store.getState().events.at(-1).eventType, 'TREATMENT_COMPLETED');
}

{
  const state = baseState();
  state.preparationRuns=[];
  state.treatmentComponents[0].status='COMPLETED';
  state.assessments.push({ id:'fa1', treatmentId:'t1', createdAt:'2026-08-20T00:50:00.000Z' });
  const store=makeStore(state);
  assert.throws(()=>completeTreatmentAfterFinalAssessment(store,'t1','s1'),/preparação/);
}

console.log('remaining.test.mjs: ok');
