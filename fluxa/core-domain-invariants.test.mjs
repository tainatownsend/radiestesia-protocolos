import assert from 'node:assert/strict';
import {
  AssistedType, PREPARATION_STEPS,
  startSession, startPreparation, togglePreparationStep, completePreparation,
  createAssistedEntity, startInvestigation, createTreatment, reviewTreatment, closeSession,
  startReiki, pauseReiki, recordReikiRetrospective, addSessionNote
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

{
  const store=makeStore();
  const session=startSession(store);
  const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa teste',birthDate:'1980-01-01'});

  assert.throws(()=>startInvestigation(store,session.id,assisted.id),/preparação/i);
  assert.throws(()=>createTreatment(store,{sessionId:session.id,assistedEntityId:assisted.id,title:'Teste',componentName:'A'}),/preparação/i);

  prepare(store,session.id);
  const investigation=startInvestigation(store,session.id,assisted.id);
  assert.equal(investigation.status,'IN_PROGRESS');
  const { treatment }=createTreatment(store,{sessionId:session.id,assistedEntityId:assisted.id,title:'Teste',componentName:'A'});
  assert.throws(()=>reviewTreatment(store,{sessionId:session.id,treatmentId:treatment.id,verifiedComplete:true,imbalancePercent:20}),/revisão dos componentes.*avaliação final/i);
  assert.equal(store.getState().treatments.find((item)=>item.id===treatment.id).status,'IN_PROGRESS','legacy review must not complete treatment');
  assert.throws(()=>reviewTreatment(store,{sessionId:session.id,treatmentId:treatment.id,verifiedComplete:false,imbalancePercent:101}),/0% e 100%/i);
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
}

{
  const store=makeStore();
  const session=startSession(store);
  assert.throws(()=>closeSession(store,session.id,{endedAt:'not-a-date'}),/horário de encerramento válido/i);
  assert.throws(()=>closeSession(store,session.id,{endedAt:'2026-08-20T09:59:59.000Z'}),/anterior ao início/i);
  assert.throws(()=>closeSession(store,session.id,{endedAt:'2999-01-01T00:00:00.000Z'}),/futuro/i);
  assert.equal(store.getState().sessions[0].status,'OPEN');
}

{
  const store=makeStore();
  const session=startSession(store); prepare(store,session.id);
  const a=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Assistido A',birthDate:'1980-01-01'});
  const b=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Assistido B',birthDate:'1981-01-01'});
  store.setState((state)=>{const draft=structuredClone(state);draft.findings.push({id:'finding_b',assistedEntityId:b.id,investigationId:'inv_b',status:'IDENTIFIED',title:'Achado B'});return draft;});
  assert.throws(
    ()=>createTreatment(store,{sessionId:session.id,assistedEntityId:a.id,findingIds:['finding_b'],title:'Inválido',componentName:'A'}),
    /pertencer ao assistido selecionado/i
  );
  assert.equal(store.getState().treatments.length,0);
}

{
  const store=makeStore();
  const session=startSession(store);
  const a=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Reiki A',birthDate:'1980-01-01'});
  const b=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Reiki B',birthDate:'1981-01-01'});
  assert.throws(()=>startReiki(store,session.id,'missing'),/assistido válido/i);
  const first=startReiki(store,session.id,a.id);
  assert.equal(startReiki(store,session.id,a.id).id,first.id,'same Reiki context should remain idempotent');
  pauseReiki(store,first.id);
  assert.throws(
    ()=>startReiki(store,session.id,b.id),
    /já existe uma aplicação de Reiki ativa/i,
    'a different assisted context must never receive another active Reiki application'
  );
  assert.equal(store.getState().reikiApplications.length,1);
  assert.throws(()=>recordReikiRetrospective(store,{assistedEntityId:'missing',durationMinutes:10}),/assistido válido/i);
}

{
  const store=makeStore();
  const session=startSession(store);
  const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Notas',birthDate:'1980-01-01'});
  assert.throws(()=>addSessionNote(store,session.id,'missing','Teste'),/assistido válido/i);
  addSessionNote(store,session.id,assisted.id,'Nota válida');
  assert.equal(store.getState().events.filter((event)=>event.eventType==='NOTE_CREATED').length,1);
  closeSession(store,session.id);
  assert.throws(()=>addSessionNote(store,session.id,assisted.id,'Depois do fechamento'),/sessão aberta/i);
}

console.log('core-domain-invariants.test.mjs: ok');
