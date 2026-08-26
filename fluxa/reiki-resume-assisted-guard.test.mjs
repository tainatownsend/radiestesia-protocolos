import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType,
  completePreparation,
  createAssistedEntity,
  pauseReiki,
  resumeReiki,
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
pauseReiki(store,app.id);
const paused=structuredClone(store.getState().reikiApplications.find((item)=>item.id===app.id));
const resumedEventsBefore=store.getState().events.filter((event)=>event.eventType==='REIKI_RESUMED'&&event.entityId===app.id).length;

selectAssistedForSession(store,session.id,other.id);
assert.throws(
  ()=>resumeReiki(store,app.id),
  /Assistido atual não corresponde|Assistido da aplicação/i,
  'paused in-session Reiki must not resume under a different current Assisted'
);
const rejected=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(rejected.status,'PAUSED','rejected resume must keep Reiki paused');
assert.deepEqual(rejected.intervals,paused.intervals,'rejected resume must not append a timing interval');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_RESUMED'&&event.entityId===app.id).length,
  resumedEventsBefore,
  'rejected resume must not append history'
);

selectAssistedForSession(store,session.id,assisted.id);
resumeReiki(store,app.id);
const resumed=store.getState().reikiApplications.find((item)=>item.id===app.id);
assert.equal(resumed.status,'RUNNING');
assert.equal(resumed.intervals.length,paused.intervals.length+1,'valid resume should append one active interval');
assert.equal(
  store.getState().events.filter((event)=>event.eventType==='REIKI_RESUMED'&&event.entityId===app.id).length,
  resumedEventsBefore+1,
  'valid resume should append one history event'
);

console.log('reiki-resume-assisted-guard.test.mjs: ok');
