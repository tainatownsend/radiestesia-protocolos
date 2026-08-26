import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType, PREPARATION_STEPS,
  completePreparation, createAssistedEntity, createTreatment,
  selectAssistedForSession, startPreparation, startSession, togglePreparationStep
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { replaceTreatmentComponent, stopTreatmentComponent } from './backlog.js';

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
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa A',birthDate:'1980-01-01'});
selectAssistedForSession(store,session.id,assisted.id);
recordHawkinsBaseline(store,{sessionId:session.id,assistedEntityId:assisted.id,hertz:470});
const { treatment, component }=createTreatment(store,{sessionId:session.id,assistedEntityId:assisted.id,title:'Tratamento A',componentName:'Inicial'});

stopTreatmentComponent(store,component.id,{sessionId:session.id,reason:'Finalizado'});
const before=structuredClone(store.getState());

assert.throws(
  ()=>replaceTreatmentComponent(store,component.id,{sessionId:session.id,name:'Não deve ser criado'}),
  /componente.*não disponível.*substituição|componente.*ativo/i,
  'a stopped component must not be replaceable'
);

const after=store.getState();
assert.equal(after.treatmentComponents.length,before.treatmentComponents.length,'rejected replacement must not create a new component');
assert.equal(after.events.length,before.events.length,'rejected replacement must not write history');
assert.equal(after.treatmentComponents.find((item)=>item.id===component.id)?.status,'STOPPED','rejected replacement must preserve the terminal component status');
assert.equal(after.treatmentComponents.find((item)=>item.id===component.id)?.replacedByComponentId ?? null,null,'rejected replacement must not attach a replacement link');
assert.equal(after.treatments.find((item)=>item.id===treatment.id)?.status,before.treatments.find((item)=>item.id===treatment.id)?.status);

console.log('treatment-component-replacement-state-guard.test.mjs: ok');
