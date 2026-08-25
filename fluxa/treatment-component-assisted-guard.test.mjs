import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType, PREPARATION_STEPS,
  completePreparation, createAssistedEntity, createTreatment,
  selectAssistedForSession, startPreparation, startSession, togglePreparationStep
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { addTreatmentComponent, stopTreatmentComponent } from './backlog.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); }
  getItem(key){ return this.map.has(key)?this.map.get(key):null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

globalThis.localStorage=new MemoryStorage();

function prepare(store,sessionId){
  const run=startPreparation(store,sessionId);
  for(const step of PREPARATION_STEPS) togglePreparationStep(store,run.id,step.key);
  completePreparation(store,run.id);
}

const store=createStore();
const session=startSession(store);
prepare(store,session.id);
const assistedA=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa A',birthDate:'1980-01-01'});
const assistedB=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa B',birthDate:'1981-01-01'});
selectAssistedForSession(store,session.id,assistedA.id);
recordHawkinsBaseline(store,{sessionId:session.id,assistedEntityId:assistedA.id,hertz:470});
const { treatment, component:initialComponent }=createTreatment(store,{sessionId:session.id,assistedEntityId:assistedA.id,title:'Tratamento A',componentName:'Inicial'});

selectAssistedForSession(store,session.id,assistedB.id);
const before=store.getState();
const componentCount=before.treatmentComponents.length;
const eventCount=before.events.length;
assert.throws(
  ()=>addTreatmentComponent(store,{sessionId:session.id,treatmentId:treatment.id,name:'Não deve entrar'}),
  /Assistido atual.*tratamento/i,
  'a prepared session for another Assisted must not mutate this treatment'
);
assert.equal(store.getState().treatmentComponents.length,componentCount,'rejected cross-Assisted component creation must not persist a component');
assert.equal(store.getState().events.length,eventCount,'rejected cross-Assisted component creation must not write history');

const stopBefore=structuredClone(store.getState());
assert.throws(
  ()=>stopTreatmentComponent(store,initialComponent.id,{sessionId:session.id,reason:'Sessão errada'}),
  /Assistido atual.*tratamento/i,
  'a prepared session for another Assisted must not stop this treatment component'
);
assert.equal(store.getState().treatmentComponents.find((item)=>item.id===initialComponent.id)?.status,stopBefore.treatmentComponents.find((item)=>item.id===initialComponent.id)?.status);
assert.equal(store.getState().events.length,stopBefore.events.length,'rejected cross-Assisted stop must not write history');

selectAssistedForSession(store,session.id,assistedA.id);
const added=addTreatmentComponent(store,{sessionId:session.id,treatmentId:treatment.id,name:'Componente válido'});
assert.equal(added.treatmentId,treatment.id);
assert.equal(store.getState().treatmentComponents.some((item)=>item.id===added.id),true);
const event=store.getState().events.find((item)=>item.entityId===added.id&&item.eventType==='COMPONENT_ADDED');
assert.equal(event?.sessionId,session.id);
assert.equal(event?.assistedEntityId,assistedA.id);

stopTreatmentComponent(store,added.id,{sessionId:session.id,reason:'Concluído'});
assert.equal(store.getState().treatmentComponents.find((item)=>item.id===added.id)?.status,'STOPPED');
const stopEvent=store.getState().events.find((item)=>item.entityId===added.id&&item.eventType==='COMPONENT_STOPPED');
assert.equal(stopEvent?.sessionId,session.id);
assert.equal(stopEvent?.assistedEntityId,assistedA.id);

console.log('treatment-component-assisted-guard.test.mjs: ok');
