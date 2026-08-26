import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType,
  completePreparation,
  createAssistedEntity,
  pauseReiki,
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
const pausedEventsBefore=store.getState().events.filter((event)=>event.eventType==='REIKI_PAUSED'&&event.entityId===app.id).length;

selectAssistedForSession(store,session.id,other.id);
assert.throws(
  ()=>pauseReiki(store,app.id),
  /Assistido atual não corresponde|Assistido da aplicação/i,
  'in-session Reiki must not pause under a different current Assisted'
);
const rejected=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(rejected.status,before.status,'rejected pause must preserve Reiki status');
assert.deepEqual(rejected.intervals,before.intervals,'rejected pause must preserve timing intervals');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_PAUSED'&&event.entityId===app.id).length,
  pausedEventsBefore,
  'rejected pause must not append history'
);

selectAssistedForSession(store,session.id,assisted.id);
pauseReiki(store,app.id);
const paused=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(paused.status,'PAUSED');
assert.ok(paused.intervals.at(-1)?.endedAt,'valid pause should close the active interval');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_PAUSED'&&event.entityId===app.id).length,
  pausedEventsBefore+1,
  'valid pause should append one history event'
);

console.log('reiki-pause-assisted-guard.test.mjs: ok');
