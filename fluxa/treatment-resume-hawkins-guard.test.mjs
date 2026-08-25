import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType, PREPARATION_STEPS,
  closeSession, completePreparation, createAssistedEntity, createTreatment,
  selectAssistedForSession, startPreparation, startSession, togglePreparationStep
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { resumeTreatmentPreservingDuration } from './backlog.js';

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
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa A',birthDate:'1980-01-01'});

const firstSession=startSession(store);
prepare(store,firstSession.id);
selectAssistedForSession(store,firstSession.id,assisted.id);
recordHawkinsBaseline(store,{sessionId:firstSession.id,assistedEntityId:assisted.id,hertz:460});
const { treatment, component }=createTreatment(store,{sessionId:firstSession.id,assistedEntityId:assisted.id,title:'Tratamento longitudinal',componentName:'Componente inicial'});

store.setState((state)=>{
  const draft=structuredClone(state);
  const target=draft.treatments.find((item)=>item.id===treatment.id);
  target.status='INTERRUPTED';
  target.interruptedAt=store.nowIso();
  target.updatedAt=store.nowIso();
  const targetComponent=draft.treatmentComponents.find((item)=>item.id===component.id);
  targetComponent.status='INTERRUPTED';
  targetComponent.interruptedAt=store.nowIso();
  targetComponent.updatedAt=store.nowIso();
  return draft;
});
closeSession(store,firstSession.id);

const secondSession=startSession(store);
prepare(store,secondSession.id);
selectAssistedForSession(store,secondSession.id,assisted.id);
const before=structuredClone(store.getState());
assert.throws(
  ()=>resumeTreatmentPreservingDuration(store,treatment.id),
  /Hawkins|frequência vibracional inicial/i,
  'resuming treatment in a new session must require that session Hawkin baseline'
);
assert.equal(store.getState().treatments.find((item)=>item.id===treatment.id)?.status,'INTERRUPTED');
assert.equal(store.getState().events.length,before.events.length,'rejected treatment resume must not write history');

const baseline=recordHawkinsBaseline(store,{sessionId:secondSession.id,assistedEntityId:assisted.id,hertz:510});
resumeTreatmentPreservingDuration(store,treatment.id);
const state=store.getState();
assert.equal(state.treatments.find((item)=>item.id===treatment.id)?.status,'IN_PROGRESS');
assert.equal(state.treatmentComponents.find((item)=>item.id===component.id)?.status,'IN_PROGRESS');
const resumed=state.events.find((item)=>item.eventType==='TREATMENT_RESUMED'&&item.entityId===treatment.id&&item.sessionId===secondSession.id);
assert.ok(resumed,'valid treatment resume must be written to history');
assert.equal(resumed.assistedEntityId,assisted.id);
assert.equal(resumed.metadata?.hawkinsBaselineAssessmentId,baseline.id);
assert.equal(resumed.metadata?.hawkinsBaselineHertz,510);

console.log('treatment-resume-hawkins-guard.test.mjs: ok');
