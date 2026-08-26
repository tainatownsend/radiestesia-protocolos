import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewTreatment } from './domain.js';
import { recordStructuredFinalAssessment } from './backlog.js';

function makeStore(currentAssistedEntityId){
  let seq=0;
  let state={
    version:5,meta:{},
    sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId}],
    assistedEntities:[{id:'a1',displayName:'A'},{id:'a2',displayName:'B'}],
    events:[],preparationRuns:[{id:'p1',sessionId:'s1',status:'COMPLETED'}],closingRuns:[],
    investigations:[],findings:[],
    treatments:[{id:'t1',assistedEntityId:'a1',status:'IN_PROGRESS',title:'Tratamento A'}],
    treatmentComponents:[{id:'c1',treatmentId:'t1',name:'Componente concluído',status:'COMPLETED'}],componentReviews:[],treatmentReviews:[],assessments:[],reikiApplications:[],tools:[],customProtocols:[],settings:{}
  };
  return {
    getState:()=>state,
    setState(updater){state=typeof updater==='function'?updater(state):updater;return state;},
    makeId(prefix){return `${prefix}_${++seq}`;},
    nowIso(){return '2026-08-22T12:00:00.000Z';}
  };
}

let store=makeStore(null);
assert.throws(()=>reviewTreatment(store,{sessionId:'s1',treatmentId:'t1',verifiedComplete:false,imbalancePercent:20}),/Selecione o Assistido do tratamento/i);
assert.throws(()=>recordStructuredFinalAssessment(store,{sessionId:'s1',treatmentId:'t1',frequency:'6500',imbalancePercent:20}),/Selecione o Assistido do tratamento/i);
assert.equal(store.getState().treatmentReviews.length,0);
assert.equal(store.getState().assessments.length,0);

store=makeStore('a2');
assert.throws(()=>reviewTreatment(store,{sessionId:'s1',treatmentId:'t1',verifiedComplete:false,imbalancePercent:20}),/Assistido atual não corresponde/i);
assert.throws(()=>recordStructuredFinalAssessment(store,{sessionId:'s1',treatmentId:'t1',frequency:'6500',imbalancePercent:20}),/Assistido atual não corresponde/i);
assert.equal(store.getState().events.length,0,'cross-assisted measurements must not create history');

store=makeStore('a1');
const review=reviewTreatment(store,{sessionId:'s1',treatmentId:'t1',verifiedComplete:false,imbalancePercent:20});
const assessment=recordStructuredFinalAssessment(store,{sessionId:'s1',treatmentId:'t1',frequency:'6500',imbalancePercent:15,needsNewTreatment:false});
assert.equal(review.assistedEntityId,'a1');
assert.equal(assessment.assistedEntityId,'a1');
assert.equal(store.getState().treatmentReviews.length,1);
assert.equal(store.getState().assessments.length,1);
assert.ok(store.getState().events.every((event)=>event.assistedEntityId==='a1'&&event.sessionId==='s1'));

const index=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const guard=fs.readFileSync(new URL('./treatment-measurement-context-ui.js',import.meta.url),'utf8');
assert.ok(index.indexOf('treatment-measurement-context-ui.js')<index.indexOf('backlog-ui.js'),'final assessment context guard must register before backlog UI');
assert.match(guard,/data-backlog-final-assessment/);
assert.match(guard,/selectAssistedForSession/,'normal final-assessment flow should explicitly switch to the treatment owner before opening');

console.log('treatment-measurement-context.test.mjs: ok');