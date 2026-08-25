import assert from 'node:assert/strict';
import { recordOrientingAssessment } from './assessment-protocol-handoff.js';

const catalog=[{id:'root_master',name:'Protocolo Mestre de Causa Raiz',category:'Protocolo Mestre'}];

function fakeStore(assessments){
  let state={
    sessions:[{id:'ses_1',status:'OPEN',currentAssistedEntityId:'ast_1'}],
    preparationRuns:[{id:'prep_1',sessionId:'ses_1',status:'COMPLETED'}],
    assistedEntities:[{id:'ast_1',displayName:'Maria'}],
    assessments:structuredClone(assessments),investigations:[],events:[]
  };
  let seq=0;
  return {
    getState:()=>state,
    setState(updater){state=structuredClone(typeof updater==='function'?updater(state):updater);return state;},
    makeId(prefix){seq+=1;return `${prefix}_${seq}`;},
    nowIso(){return `2026-08-26T00:00:${String(seq).padStart(2,'0')}Z`;}
  };
}

const general={id:'general_1',kind:'GENERAL',sessionId:'ses_1',assistedEntityId:'ast_1',subject:'Medição geral',result:'8'};
const validStore=fakeStore([general]);
const orienting=recordOrientingAssessment(validStore,{sessionId:'ses_1',assistedEntityId:'ast_1',sourceAssessmentId:'general_1',focusAreas:['unclear']},catalog);
assert.equal(orienting.sourceAssessmentId,'general_1','A same-session GENERAL measurement must remain a valid source for orienting assessment handoff.');
assert.equal(validStore.getState().assessments.find((item)=>item.id==='general_1').followUpAssessmentId,orienting.id,'Valid source measurement must retain the forward handoff link.');

for(const source of [
  {id:'hawkins_1',kind:'HAWKINS_FREQUENCY',sessionId:'ses_1',assistedEntityId:'ast_1',hertz:420},
  {id:'orienting_1',kind:'ORIENTING',sessionId:'ses_1',assistedEntityId:'ast_1',result:'Financeiro'}
]){
  const store=fakeStore([source]);
  const before=structuredClone(store.getState());
  assert.throws(()=>recordOrientingAssessment(store,{sessionId:'ses_1',assistedEntityId:'ast_1',sourceAssessmentId:source.id,focusAreas:['unclear']},catalog),/medição geral/i,`${source.kind} must not be accepted as the source measurement for an orienting handoff.`);
  assert.deepEqual(store.getState(),before,'Rejected source kinds must not mutate assessments or history.');
}

console.log('assessment-source-kind-guard.test.mjs: ok');
