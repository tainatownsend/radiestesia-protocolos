import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preparationFlow } from './ui-v2/session/preparation-flow.js';
import { stepBackPreparation } from './ui-v2/session/preparation-navigation.js';

function makeStore(state) {
  let current = structuredClone(state);
  return {
    getState: () => current,
    setState(updater) {
      current = typeof updater === 'function' ? updater(current) : updater;
      return current;
    },
  };
}

const step1Html = preparationFlow({ preparation:{ step:1, total:4, stepKey:'breathing' } }, { error:'' });
assert.doesNotMatch(step1Html, /data-v2-preparation-back/, 'The first preparation step must not show a dead Back action.');

const step3Html = preparationFlow({
  preparation:{ step:3, total:4, stepKey:'protection', frequency:540, frequencyValid:true, protection:'4 Círculos', permission:'' },
}, { error:'' });
assert.match(step3Html, /data-v2-preparation-back/);
assert.match(step3Html, />Voltar<\/button>/);

const state = {
  sessions:[{ id:'ses_1', status:'OPEN' }],
  preparationRuns:[{
    id:'prep_1', sessionId:'ses_1', status:'IN_PROGRESS', startedAt:'2026-09-06T10:00:00.000Z',
    frequencyMeasurement:{ hertz:540, value:'540' },
    protection:{ notes:'4 Círculos', toolIds:[] },
    permissionNotes:'Permissão registrada',
    steps:[
      { key:'breathing', completed:true, completedAt:'2026-09-06T10:01:00.000Z' },
      { key:'frequency', completed:true, completedAt:'2026-09-06T10:02:00.000Z' },
      { key:'protection', completed:false, completedAt:null },
      { key:'permission', completed:false, completedAt:null },
    ],
  }],
};
const store = makeStore(state);
const rewound = stepBackPreparation(store);
assert.equal(rewound.steps[0].completed, true);
assert.equal(rewound.steps[1].completed, false, 'Back from protection must reopen frequency, exactly one step.');
assert.equal(rewound.steps[1].completedAt, null);
assert.equal(rewound.steps[2].completed, false);
assert.equal(rewound.frequencyMeasurement.hertz, 540, 'Going back must preserve the previously entered frequency for correction.');
assert.equal(rewound.protection.notes, '4 Círculos', 'Going back must not erase already entered preparation details.');

stepBackPreparation(store);
const firstStep = store.getState().preparationRuns[0];
assert.equal(firstStep.steps[0].completed, false, 'A second Back moves from frequency to breathing.');
assert.equal(firstStep.steps[1].completed, false);
stepBackPreparation(store);
assert.equal(store.getState().preparationRuns[0].steps[0].completed, false, 'Back on the first step must be idempotent.');

const completedStore = makeStore({
  sessions:[{ id:'ses_2', status:'OPEN' }],
  preparationRuns:[{
    id:'prep_done', sessionId:'ses_2', status:'COMPLETED', startedAt:'2026-09-06T11:00:00.000Z',
    steps:[
      { key:'breathing', completed:true, completedAt:'a' },
      { key:'frequency', completed:true, completedAt:'b' },
      { key:'protection', completed:true, completedAt:'c' },
      { key:'permission', completed:true, completedAt:'d' },
    ],
  }],
});
stepBackPreparation(completedStore);
assert.ok(completedStore.getState().preparationRuns[0].steps.every((step) => step.completed), 'Completed preparation must remain immutable from the V2 Back control.');

const indexSource = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
assert.match(indexSource, /stepBackPreparation/);
assert.match(indexSource, /data-v2-preparation-back/);
assert.match(indexSource, /stepBackPreparation\(store\)/);

console.log('ui-v2-preparation-back.test.mjs: ok');
