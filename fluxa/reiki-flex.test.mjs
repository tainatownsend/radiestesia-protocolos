import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, createAssistedEntity, selectAssistedForSession, startPreparation, startSession, togglePreparationStep, completePreparation } from './domain.js';
import { ReikiMode, startFlexibleReiki, pauseFlexibleReiki, resumeFlexibleReiki, completeFlexibleReiki } from './reiki-flex.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa Reiki',birthDate:'1990-01-01'});
assert.throws(
  ()=>startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE}),
  /Habilite Reiki/i,
  'new outside-session Reiki must respect configured therapeutic modalities at the domain layer'
);
assert.equal(store.getState().reikiApplications.length,0,'rejected Reiki start must not create application history');
store.setState((state)=>{const draft=structuredClone(state);draft.settings.therapeuticModalities={enabled:['REIKI']};return draft;});
const app=startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE});
assert.equal(app.sessionId,null);
assert.equal(app.mode,ReikiMode.DISTANCE);
assert.equal(app.status,'RUNNING');

pauseFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'PAUSED');
assert.throws(()=>startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.IN_PERSON}),/aplicação de Reiki ativa/);
resumeFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'RUNNING');
completeFlexibleReiki(store,app.id,'registro');
const done=store.getState().reikiApplications[0];
assert.equal(done.status,'COMPLETED');
assert.equal(done.sessionId,null);
assert.equal(done.notes,'registro');
assert.ok(store.getState().events.some((e)=>e.eventType==='REIKI_COMPLETED' && e.metadata.outsideSession===true));

const sessionOwner=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Reiki sessão',birthDate:'1992-02-02'});
const other=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Outro contexto',birthDate:'1993-03-03'});
const session=startSession(store);
selectAssistedForSession(store,session.id,other.id);
const countBefore=store.getState().reikiApplications.length;
assert.throws(
  ()=>startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON}),
  /preparação da sessão/i,
  'session Reiki must not start before the session preparation is completed'
);
assert.equal(store.getState().reikiApplications.length,countBefore,'rejected unprepared session Reiki must not create an application');
const prep=startPreparation(store,session.id);
for(const step of prep.steps) togglePreparationStep(store,prep.id,step.key);
completePreparation(store,prep.id);
assert.throws(
  ()=>startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON}),
  /Assistido atual não corresponde/i,
  'session Reiki must not start for a different assisted entity than the explicit session context'
);
assert.equal(store.getState().reikiApplications.length,countBefore,'rejected session Reiki start must not create an application');
assert.equal(store.getState().sessions.find((item)=>item.id===session.id).currentAssistedEntityId,other.id,'rejected start must not replace session context');

selectAssistedForSession(store,session.id,sessionOwner.id);
const sessionApp=startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON});
pauseFlexibleReiki(store,sessionApp.id);
selectAssistedForSession(store,session.id,other.id);
const eventsBeforeResume=store.getState().events.length;
assert.throws(
  ()=>resumeFlexibleReiki(store,sessionApp.id),
  /Assistido atual não corresponde/i,
  'paused session Reiki must not resume while the session points at a different assisted entity'
);
assert.equal(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id).status,'PAUSED');
assert.equal(store.getState().events.length,eventsBeforeResume,'rejected resume must not append history');

selectAssistedForSession(store,session.id,sessionOwner.id);
store.setState((state)=>{const draft=structuredClone(state);draft.settings.therapeuticModalities={enabled:[]};return draft;});
resumeFlexibleReiki(store,sessionApp.id);
assert.equal(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id).status,'RUNNING','existing Reiki must remain resumable after modality is disabled so it can be concluded safely');
completeFlexibleReiki(store,sessionApp.id,'sessão alinhada');

console.log('reiki-flex.test.mjs: ok');
