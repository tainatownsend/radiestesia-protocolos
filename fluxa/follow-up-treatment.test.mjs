import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, TreatmentStatus, createAssistedEntity } from './domain.js';
import { canPlanFollowUpTreatment, createFollowUpTreatment } from './follow-up-treatment.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa ciclo',birthDate:'1988-08-08'});
store.setState((state)=>{
  const draft=structuredClone(state);
  draft.treatments.push({id:'trt_old',assistedEntityId:assisted.id,title:'Ciclo original',status:TreatmentStatus.COMPLETED,completedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),findingIds:[]});
  draft.assessments.push({id:'assess_old',treatmentId:'trt_old',assistedEntityId:assisted.id,needsNewTreatment:true,nextTreatmentWhen:'em 7 dias',createdAt:new Date().toISOString()});
  return draft;
});

assert.equal(canPlanFollowUpTreatment(store.getState(),'trt_old'),true);
assert.throws(()=>createFollowUpTreatment(store,'trt_old',{components:[]}),/componente/);
const next=createFollowUpTreatment(store,'trt_old',{components:[{name:'Novo gráfico',durationValue:7,durationUnit:'DAY'}]});
assert.equal(next.status,TreatmentStatus.PLANNED);
assert.equal(next.previousTreatmentId,'trt_old');
assert.equal(next.recommendedByAssessmentId,'assess_old');
assert.equal(next.plannedFor,'em 7 dias');
const nextComponents=store.getState().treatmentComponents.filter((item)=>item.treatmentId===next.id);
assert.equal(nextComponents.length,1);
assert.equal(nextComponents[0].status,TreatmentStatus.PLANNED);
assert.equal(nextComponents[0].name,'Novo gráfico');
assert.equal(store.getState().treatments.find((t)=>t.id==='trt_old').status,TreatmentStatus.COMPLETED);
assert.equal(canPlanFollowUpTreatment(store.getState(),'trt_old'),false);
assert.throws(()=>createFollowUpTreatment(store,'trt_old',{components:[{name:'Outro'}]}),/já originou/i);
store.setState((state)=>{const draft=structuredClone(state);draft.treatments.find((item)=>item.id===next.id).status=TreatmentStatus.COMPLETED;return draft;});
assert.equal(canPlanFollowUpTreatment(store.getState(),'trt_old'),false,'the same assessment cannot branch into another later cycle');

console.log('follow-up-treatment.test.mjs: ok');
