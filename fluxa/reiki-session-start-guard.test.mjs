import assert from 'node:assert/strict';
import { requireSessionReikiStart } from './reiki-session-guard.js';

function state(overrides={}){
  return {
    sessions:[{id:'ses_1',status:'OPEN',currentAssistedEntityId:'ast_1'}],
    preparationRuns:[{id:'prep_1',sessionId:'ses_1',status:'COMPLETED'}],
    settings:{therapeuticModalities:{enabled:['REIKI']}},
    ...overrides
  };
}

assert.equal(requireSessionReikiStart(state(),{sessionId:'ses_1',assistedEntityId:'ast_1'}).id,'ses_1');
assert.throws(
  ()=>requireSessionReikiStart(state({settings:{therapeuticModalities:{enabled:['CRYSTALS']}}}),{sessionId:'ses_1',assistedEntityId:'ast_1'}),
  /Habilite Reiki/i,
  'in-session Reiki must respect configured modalities'
);
assert.throws(
  ()=>requireSessionReikiStart(state({preparationRuns:[]}),{sessionId:'ses_1',assistedEntityId:'ast_1'}),
  /preparação/i,
  'in-session Reiki must not bypass therapist preparation'
);
assert.throws(
  ()=>requireSessionReikiStart(state(),{sessionId:'ses_1',assistedEntityId:'ast_2'}),
  /Assistido correto/i,
  'in-session Reiki must remain bound to the selected assisted context'
);
assert.throws(
  ()=>requireSessionReikiStart(state({sessions:[{id:'ses_1',status:'CLOSED',currentAssistedEntityId:'ast_1'}]}),{sessionId:'ses_1',assistedEntityId:'ast_1'}),
  /sessão aberta/i,
  'in-session Reiki must require an open session'
);

console.log('reiki-session-start-guard.test.mjs: ok');
