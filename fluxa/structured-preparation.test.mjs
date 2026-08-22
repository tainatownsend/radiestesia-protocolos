import assert from 'node:assert/strict';
import { updatePreparationDetails, validateStructuredPreparation, completeStructuredPreparation } from './structured-preparation.js';

function fakeStore(sessionStatus = 'OPEN') {
  let seq = 0;
  let state = {
    sessions: [{ id:'ses_1', status:sessionStatus }],
    preparationRuns: [{
      id:'prep_1', sessionId:'ses_1', status:'IN_PROGRESS',
      steps:[
        { key:'breathing', completed:true },
        { key:'frequency', completed:true },
        { key:'protection', completed:true },
        { key:'permission', completed:true }
      ]
    }],
    events:[],
    tools:[]
  };
  return {
    getState:()=>state,
    setState(updater){ state = typeof updater === 'function' ? updater(state) : updater; return state; },
    nowIso(){ return '2026-08-20T03:45:00.000Z'; },
    makeId(prefix='id'){ return `${prefix}_${++seq}`; }
  };
}

{
  const store = fakeStore();
  assert.throws(() => validateStructuredPreparation(store.getState(), 'prep_1'), /frequência vibracional/i);
  assert.throws(() => completeStructuredPreparation(store, 'prep_1'), /frequência vibracional/i);
  assert.equal(store.getState().preparationRuns[0].status, 'IN_PROGRESS');
  updatePreparationDetails(store, 'prep_1', { frequencyValue:'8500' });
  assert.throws(() => validateStructuredPreparation(store.getState(), 'prep_1'), /proteção/i);
  updatePreparationDetails(store, 'prep_1', { frequencyValue:'8500', frequencyScale:'Bovis', protectionNotes:'Proteção manual' });
  assert.equal(validateStructuredPreparation(store.getState(), 'prep_1'), true);
  const completed = completeStructuredPreparation(store, 'prep_1');
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(store.getState().events.filter((event)=>event.eventType==='PREPARATION_COMPLETED').length,1);
  const run = store.getState().preparationRuns[0];
  assert.equal(run.frequencyMeasurement.value, '8500');
  assert.equal(run.frequencyMeasurement.scale, 'Bovis');
  assert.equal(run.protection.notes, 'Proteção manual');
}

{
  const store = fakeStore();
  updatePreparationDetails(store, 'prep_1', { frequencyValue:'9200', protectionToolIds:['tool_1','tool_1','tool_2'] });
  assert.equal(validateStructuredPreparation(store.getState(), 'prep_1'), true);
  assert.deepEqual(store.getState().preparationRuns[0].protection.toolIds, ['tool_1','tool_2']);
}

{
  const store = fakeStore('CLOSED');
  const before = structuredClone(store.getState().preparationRuns[0]);
  assert.throws(
    () => updatePreparationDetails(store, 'prep_1', { frequencyValue:'10000', protectionNotes:'Não deve ser salvo' }),
    /sessão estiver aberta/i
  );
  assert.deepEqual(store.getState().preparationRuns[0], before);
  assert.throws(() => validateStructuredPreparation(store.getState(), 'prep_1'), /sessão estiver aberta/i);
  assert.throws(() => completeStructuredPreparation(store, 'prep_1'), /sessão estiver aberta/i);
  assert.equal(store.getState().preparationRuns[0].status, 'IN_PROGRESS');
  assert.equal(store.getState().events.length, 0);
}

console.log('structured-preparation.test.mjs: ok');
