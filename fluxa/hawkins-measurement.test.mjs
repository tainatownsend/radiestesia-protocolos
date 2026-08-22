import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateHawkinsHertz,recordHawkinsBaseline,hawkinsBaseline,linkTreatmentHawkinsBaseline,enrichFinalHawkinsAssessment,HAWKINS_KIND,HawkinsPhase } from './hawkins-measurement.js';

function makeStore(){
  let n=0;let state={sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],assistedEntities:[{id:'a1',displayName:'A',archivedAt:null},{id:'a2',displayName:'B',archivedAt:null}],preparationRuns:[{id:'p1',sessionId:'s1',status:'COMPLETED'}],assessments:[],treatments:[],events:[]};
  return {getState:()=>state,setState(fn){state=fn(state);return state;},makeId(prefix){n+=1;return `${prefix}_${n}`;},nowIso(){return `2026-08-22T18:40:${String(n).padStart(2,'0')}Z`;}};
}

assert.equal(validateHawkinsHertz('540'),540);
assert.equal(validateHawkinsHertz('540.5'),540.5);
for(const value of ['',0,-10,'abc'])assert.throws(()=>validateHawkinsHertz(value),/Hawkins em Hz/);

const store=makeStore();
const baseline=recordHawkinsBaseline(store,{sessionId:'s1',assistedEntityId:'a1',hertz:'540'});
assert.equal(baseline.kind,HAWKINS_KIND);assert.equal(baseline.phase,HawkinsPhase.BASELINE);assert.equal(baseline.hertz,540);assert.equal(baseline.scale,'Hz');
assert.equal(hawkinsBaseline(store.getState(),'s1','a1').id,baseline.id);
assert.equal(recordHawkinsBaseline(store,{sessionId:'s1',assistedEntityId:'a1',hertz:'600'}).id,baseline.id,'baseline in the same prepared session must be immutable/idempotent');
assert.equal(store.getState().assessments.length,1);
assert.throws(()=>recordHawkinsBaseline(store,{sessionId:'s1',assistedEntityId:'a2',hertz:500}),/Assistido correto/);

store.setState(state=>({...state,treatments:[...state.treatments,{id:'t1',assistedEntityId:'a1',createdAt:'2026-08-22T18:41:00Z'},{id:'t2',assistedEntityId:'a2',createdAt:'2026-08-22T18:41:01Z'}]}));
linkTreatmentHawkinsBaseline(store,'t1',baseline.id);
assert.equal(store.getState().treatments.find(t=>t.id==='t1').hawkinsBaselineHertz,540);
assert.throws(()=>linkTreatmentHawkinsBaseline(store,'t2',baseline.id),/outro Assistido/);

store.setState(state=>({...state,assessments:[...state.assessments,{id:'final1',treatmentId:'t1',sessionId:'s1',assistedEntityId:'a1',frequency:'720',imbalancePercent:0,occurredAt:'2026-08-22T18:42:00Z',createdAt:'2026-08-22T18:42:00Z'}]}));
const final=enrichFinalHawkinsAssessment(store,'final1');
assert.equal(final.kind,HAWKINS_KIND);assert.equal(final.phase,HawkinsPhase.FINAL);assert.equal(final.hertz,720);assert.equal(final.scale,'Hz');
const treatment=store.getState().treatments.find(t=>t.id==='t1');assert.equal(treatment.hawkinsFinalAssessmentId,'final1');assert.equal(treatment.hawkinsFinalHertz,720);

const closed=makeStore();closed.setState(state=>({...state,sessions:state.sessions.map(s=>({...s,status:'CLOSED'}))}));
assert.throws(()=>recordHawkinsBaseline(closed,{sessionId:'s1',assistedEntityId:'a1',hertz:500}),/Conclua a preparação|sessão aberta/);

const index=await readFile(new URL('./index.html',import.meta.url),'utf8');
const ui=await readFile(new URL('./hawkins-measurement-ui.js',import.meta.url),'utf8');
assert.ok(index.includes('hawkins-measurement.css')&&index.includes('hawkins-measurement-ui.js'),'Hawkins UI assets must load');
assert.ok(index.indexOf('hawkins-measurement-ui.js')<index.indexOf('treatment-create-ui.js'),'Hawkins submit guard must load before treatment creation');
assert.ok(ui.includes('data-hawkins-baseline-form'),'investigation and treatment flows must expose a baseline entry');
assert.ok(ui.includes('data-start-planned-treatment'),'planned treatment start must also require a baseline');
assert.ok(ui.includes('Frequência vibracional de Hawkins (Hz)'),'final assessment must explicitly identify Hawkins Hz');
assert.ok(ui.includes('enrichFinalHawkinsAssessment'),'final treatment measurement must be linked without replacing legacy fields');
console.log('hawkins-measurement.test.mjs: ok');
