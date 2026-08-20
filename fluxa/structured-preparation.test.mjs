import assert from 'node:assert/strict';
import { updatePreparationDetails, validateStructuredPreparation } from './structured-preparation.js';

function fakeStore() {
  let seq = 0;
  let state = {
    preparationRuns: [{
      id:'prep_1', sessionId:'ses_1', status:'IN_PROGRESS',
      steps:[
        { key:'breathing', completed:true },
        { key:'frequency', completed:true },
        { key:'protection', completed:true },
        { key:'permission', completed:true }
      ]
    }]
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
  updatePreparationDetails(store, 'prep_1', { frequencyValue:'8500' });
  assert.throws(() => validateStructuredPreparation(store.getState(), 'prep_1'), /proteção/i);
  updatePreparationDetails(store, 'prep_1', { frequencyValue:'8500', frequencyScale:'Bovis', protectionNotes:'Proteção manual' });
  assert.equal(validateStructuredPreparation(store.getState(), 'prep_1'), true);
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

console.log('structured-preparation.test.mjs: ok');
