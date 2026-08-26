import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType, PREPARATION_STEPS,
  completePreparation, createAssistedEntity, createTreatment,
  selectAssistedForSession, startPreparation, startSession, togglePreparationStep
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { replaceStructuredTreatmentComponent } from './treatment-item-operations.js';

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

const before=structuredClone(store.getState());
assert.throws(
  ()=>replaceStructuredTreatmentComponent(store,component.id,{
    component:{sessionId:session.id,treatmentId:treatment.id,name:'Substituição inválida'},
    item:{itemLabel:'Substituição inválida',commands:[{text:'Comando sem gráfico',graphApplications:[]}]}
  }),
  /pelo menos um gráfico/i,
  'invalid structured treatment content must fail before replacement mutates treatment state'
);

const rejected=store.getState();
assert.equal(rejected.treatmentComponents.length,before.treatmentComponents.length,'invalid preflight must not create a replacement component');
assert.equal(rejected.events.length,before.events.length,'invalid preflight must not write replacement history');
assert.equal(rejected.treatmentComponents.find((item)=>item.id===component.id)?.status,before.treatmentComponents.find((item)=>item.id===component.id)?.status,'invalid preflight must preserve original component status');
assert.equal(rejected.treatmentComponents.find((item)=>item.id===component.id)?.replacedByComponentId ?? null,null,'invalid preflight must not link a replacement');

const replacement=replaceStructuredTreatmentComponent(store,component.id,{
  component:{sessionId:session.id,treatmentId:treatment.id,name:'Substituição válida'},
  item:{itemLabel:'Substituição válida',commands:[{text:'Aplicar gráfico',graphApplications:[{graphName:'Gráfico manual'}]}]}
});
assert.equal(replacement?.itemLabel,'Substituição válida');
assert.equal(replacement?.commands?.[0]?.graphApplications?.[0]?.graphName,'Gráfico manual');
assert.equal(store.getState().treatmentComponents.find((item)=>item.id===component.id)?.status,'REPLACED');
assert.equal(store.getState().treatmentComponents.find((item)=>item.id===component.id)?.replacedByComponentId,replacement.id);

console.log('treatment-item-preflight-mutation.test.mjs: ok');
