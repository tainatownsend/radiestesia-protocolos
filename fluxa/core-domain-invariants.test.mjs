import assert from 'node:assert/strict';
import {
  AssistedType, PREPARATION_STEPS,
  startSession, startPreparation, togglePreparationStep, completePreparation,
  createAssistedEntity, startInvestigation, createTreatment, reviewTreatment, closeSession
} from './domain.js';
import { addTreatmentComponent } from './backlog.js';

function makeStore() {
  let seq = 0;
  let now = new Date('2026-08-20T10:00:00.000Z').getTime();
  let state = {
    version:5, meta:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[],
    investigations:[], findings:[], treatments:[], treatmentComponents:[], componentReviews:[], treatmentReviews:[],
    assessments:[], reikiApplications:[], tools:[], customProtocols:[], settings:{}
  };
  return {
    getState:()=>state,
    setState(updater){ state=typeof updater==='function'?updater(state):updater; return state; },
    makeId(prefix='id'){ return `${prefix}_${++seq}`; },
    nowIso(){ return new Date(now).toISOString(); },
    advance(ms){ now+=ms; }
  };
}

function prepare(store, sessionId) {
  const run=startPreparation(store,sessionId);
  for(const step of PREPARATION_STEPS) togglePreparationStep(store,run.id,step.key);
  completePreparation(store,run.id);
}

const store=makeStore();
const session=startSession(store);
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa teste',birthDate:'1980-01-01'});

assert.throws(()=>startInvestigation(store,session.id,assisted.id),/preparação/i);
assert.throws(()=>createTreatment(store,{sessionId:session.id,assistedEntityId:assisted.id,title:'Teste',componentName:'A'}),/preparação/i);

prepare(store,session.id);
const investigation=startInvestigation(store,session.id,assisted.id);
assert.equal(investigation.status,'IN_PROGRESS');
const { treatment }=createTreatment(store,{sessionId:session.id,assistedEntityId:assisted.id,title:'Teste',componentName:'A'});
reviewTreatment(store,{sessionId:session.id,treatmentId:treatment.id,verifiedComplete:false,imbalancePercent:20});
assert.equal(store.getState().treatmentReviews.length,1);

store.advance(60*60*1000);
closeSession(store,session.id);
const later=startSession(store);
assert.throws(()=>addTreatmentComponent(store,{sessionId:later.id,treatmentId:treatment.id,name:'B'}),/preparação/i);
assert.throws(()=>reviewTreatment(store,{sessionId:later.id,treatmentId:treatment.id,verifiedComplete:false,imbalancePercent:15}),/preparação/i);

prepare(store,later.id);
const added=addTreatmentComponent(store,{sessionId:later.id,treatmentId:treatment.id,name:'B'});
assert.equal(added.name,'B');
reviewTreatment(store,{sessionId:later.id,treatmentId:treatment.id,verifiedComplete:false,imbalancePercent:15});
assert.equal(store.getState().treatmentReviews.length,2);

console.log('core-domain-invariants.test.mjs: ok');
