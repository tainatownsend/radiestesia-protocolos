import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType,
  completePreparation,
  createAssistedEntity,
  selectAssistedForSession,
  startPreparation,
  startSession,
  togglePreparationStep
} from './domain.js';
import {
  ReikiMode,
  completeFlexibleReiki,
  pauseFlexibleReiki,
  resumeFlexibleReiki,
  startFlexibleReiki
} from './reiki-flex.js';

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

const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Assistido Flexible Reiki',birthDate:'1990-01-01'});
const session=startSession(store);
const prep=startPreparation(store,session.id);
for(const step of prep.steps) togglePreparationStep(store,prep.id,step.key);
completePreparation(store,prep.id);

const applicationCount=store.getState().reikiApplications.length;
assert.throws(
  ()=>startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:assisted.id,mode:ReikiMode.IN_PERSON}),
  /Selecione o Assistido/i,
  'session-linked Flexible Reiki must not start without an explicit current Assisted'
);
assert.equal(store.getState().reikiApplications.length,applicationCount,'rejected start must not create an application');

selectAssistedForSession(store,session.id,assisted.id);
const app=startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:assisted.id,mode:ReikiMode.IN_PERSON});

function clearCurrentAssisted() {
  store.setState((state)=>{
    const draft=structuredClone(state);
    const target=draft.sessions.find((item)=>item.id===session.id);
    target.currentAssistedEntityId=null;
    return draft;
  });
}

clearCurrentAssisted();
const runningSnapshot=structuredClone(store.getState().reikiApplications.find((item)=>item.id===app.id));
const runningEvents=store.getState().events.length;
assert.throws(()=>pauseFlexibleReiki(store,app.id),/Selecione o Assistido/i,'running Flexible Reiki must not pause without a current Assisted');
assert.throws(()=>completeFlexibleReiki(store,app.id,'sem contexto'),/Selecione o Assistido/i,'running Flexible Reiki must not complete without a current Assisted');
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===app.id),runningSnapshot,'rejected running actions must preserve the application');
assert.equal(store.getState().events.length,runningEvents,'rejected running actions must not append history');

selectAssistedForSession(store,session.id,assisted.id);
pauseFlexibleReiki(store,app.id);
clearCurrentAssisted();
const pausedSnapshot=structuredClone(store.getState().reikiApplications.find((item)=>item.id===app.id));
const pausedEvents=store.getState().events.length;
assert.throws(()=>resumeFlexibleReiki(store,app.id),/Selecione o Assistido/i,'paused Flexible Reiki must not resume without a current Assisted');
assert.throws(()=>completeFlexibleReiki(store,app.id,'sem contexto'),/Selecione o Assistido/i,'paused Flexible Reiki must not complete without a current Assisted');
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===app.id),pausedSnapshot,'rejected paused actions must preserve the application');
assert.equal(store.getState().events.length,pausedEvents,'rejected paused actions must not append history');

selectAssistedForSession(store,session.id,assisted.id);
resumeFlexibleReiki(store,app.id);
completeFlexibleReiki(store,app.id,'contexto válido');
assert.equal(store.getState().reikiApplications.find((item)=>item.id===app.id).status,'COMPLETED');

console.log('reiki-flex-current-assisted-required.test.mjs: ok');
