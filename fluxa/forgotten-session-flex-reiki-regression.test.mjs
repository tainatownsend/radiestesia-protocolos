import assert from 'node:assert/strict';
import { correctForgottenSessionClose } from './backlog.js';
import {
  ReikiMode,
  startFlexibleReiki,
  pauseFlexibleReiki,
  completeFlexibleReiki
} from './reiki-flex.js';

function iso(ms) { return new Date(ms).toISOString(); }

function buildState(startedAt) {
  return {
    sessions:[{
      id:'ses_1',
      status:'OPEN',
      startedAt,
      endedAt:null,
      closedRecordedAt:null,
      updatedAt:startedAt,
      currentAssistedEntityId:'ast_1'
    }],
    assistedEntities:[{ id:'ast_1', displayName:'Assistido', archivedAt:null }],
    preparationRuns:[{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED' }],
    settings:{ therapeuticModalities:{ enabled:['REIKI'], custom:[] } },
    reikiApplications:[],
    investigations:[],
    treatments:[],
    closingRuns:[],
    events:[]
  };
}

function makeStore(initialState, recordedAt) {
  let state=structuredClone(initialState);
  let sequence=0;
  return {
    getState:()=>state,
    setState:(updater)=>{ state=updater(state); },
    makeId:(prefix)=>`${prefix}_${++sequence}`,
    nowIso:()=>recordedAt
  };
}

const now=Date.now();
const startedAt=iso(now-2*60*60*1000);
const validEndedAt=iso(now-60*60*1000);
const recordedAt=iso(now-30*60*1000);

let store=makeStore(buildState(startedAt),recordedAt);
const inSession=startFlexibleReiki(store,{
  sessionId:'ses_1',
  assistedEntityId:'ast_1',
  mode:ReikiMode.DISTANCE
});
assert.equal(inSession.status,'RUNNING');
assert.equal(inSession.sessionId,'ses_1');
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',validEndedAt),
  /Conclua a aplicação de Reiki/i,
  'a running Flexible Reiki application linked to the forgotten session must block correction'
);
assert.equal(store.getState().sessions[0].status,'OPEN');
assert.equal(store.getState().closingRuns.length,0);

pauseFlexibleReiki(store,inSession.id);
assert.equal(store.getState().reikiApplications[0].status,'PAUSED');
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',validEndedAt),
  /Conclua a aplicação de Reiki/i,
  'a paused Flexible Reiki application linked to the forgotten session must still block correction'
);
assert.equal(store.getState().closingRuns.length,0);

completeFlexibleReiki(store,inSession.id,'Concluído antes da correção histórica');
assert.equal(store.getState().reikiApplications[0].status,'COMPLETED');
correctForgottenSessionClose(store,'ses_1',validEndedAt);
assert.equal(store.getState().sessions[0].status,'CLOSED','completed Flexible Reiki must no longer block the corrected close');

store=makeStore(buildState(startedAt),recordedAt);
const outside=startFlexibleReiki(store,{
  assistedEntityId:'ast_1',
  mode:ReikiMode.SELF
});
assert.equal(outside.status,'RUNNING');
assert.equal(outside.sessionId,null);
correctForgottenSessionClose(store,'ses_1',validEndedAt);
assert.equal(
  store.getState().sessions[0].status,
  'CLOSED',
  'outside-session Flexible Reiki must not block correction of an unrelated forgotten session'
);
assert.equal(store.getState().reikiApplications[0].status,'RUNNING','unrelated outside-session Reiki must remain untouched');

console.log('forgotten-session-flex-reiki-regression.test.mjs: ok');
