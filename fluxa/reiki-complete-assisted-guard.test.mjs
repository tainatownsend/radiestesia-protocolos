import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType,
  completePreparation,
  completeReiki,
  createAssistedEntity,
  selectAssistedForSession,
  startPreparation,
  startReiki,
  startSession,
  togglePreparationStep
} from './domain.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
store.setState((state)=>{
  const draft=structuredClone(state);
  draft.settings.therapeuticModalities={enabled:['REIKI']};
  return draft;
});

const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Assistido Reiki',birthDate:'1990-01-01'});
const other=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Outro assistido',birthDate:'1991-01-01'});
const session=startSession(store);
const prep=startPreparation(store,session.id);
for(const step of prep.steps) togglePreparationStep(store,prep.id,step.key);
completePreparation(store,prep.id);
selectAssistedForSession(store,session.id,assisted.id);

const app=startReiki(store,session.id,assisted.id);
const before=structuredClone(store.getState().reikiApplications.find((item)=>item.id===app.id));
const completedEventsBefore=store.getState().events.filter((event)=>event.eventType==='REIKI_COMPLETED'&&event.entityId===app.id).length;

selectAssistedForSession(store,session.id,other.id);
assert.throws(
  ()=>completeReiki(store,app.id,'finalização indevida'),
  /Assistido atual não corresponde|Assistido da aplicação/i,
  'in-session Reiki must not complete under a different current Assisted'
);
const rejected=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(rejected.status,before.status,'rejected completion must preserve Reiki status');
assert.deepEqual(rejected.intervals,before.intervals,'rejected completion must preserve timing intervals');
assert.equal(rejected.endedAt,before.endedAt,'rejected completion must not set an end time');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_COMPLETED'&&event.entityId===app.id).length,
  completedEventsBefore,
  'rejected completion must not append history'
);

selectAssistedForSession(store,session.id,assisted.id);
completeReiki(store,app.id,'finalização correta');
const completed=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(completed.status,'COMPLETED');
assert.ok(completed.endedAt,'valid completion should record an end time');
assert.equal(completed.notes,'finalização correta');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_COMPLETED'&&event.entityId===app.id).length,
  completedEventsBefore+1,
  'valid completion should append one history event'
);

console.log('reiki-complete-assisted-guard.test.mjs: ok');
