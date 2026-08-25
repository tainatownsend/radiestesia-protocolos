import assert from 'node:assert/strict';
import {
  PREPARATION_STEPS,
  startSession,
  closeSession,
  startPreparation,
  togglePreparationStep,
  completePreparation,
  createAssistedEntity,
  selectAssistedForSession,
  startInvestigation,
  resumeInvestigation,
  answerInvestigation
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';

function makeState() {
  return {
    version:3, meta:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[],
    investigations:[], findings:[], treatments:[], treatmentComponents:[], treatmentReviews:[], assessments:[], reikiApplications:[]
  };
}

function fakeStore(start='2026-08-25T10:00:00.000Z') {
  let state=makeState();
  let now=new Date(start).getTime();
  let seq=0;
  return {
    getState:()=>state,
    setState(updater){state=typeof updater==='function'?updater(state):updater;return state;},
    makeId(prefix='id'){seq+=1;return `${prefix}_${seq}`;},
    nowIso(){return new Date(now).toISOString();},
    setNow(iso){now=new Date(iso).getTime();}
  };
}

function prepare(store,sessionId){
  const run=startPreparation(store,sessionId);
  for(const step of PREPARATION_STEPS) togglePreparationStep(store,run.id,step.key);
  completePreparation(store,run.id);
}

function baseline(store,sessionId,assistedEntityId,hertz){
  selectAssistedForSession(store,sessionId,assistedEntityId);
  return recordHawkinsBaseline(store,{sessionId,assistedEntityId,hertz});
}

const store=fakeStore();
const first=startSession(store);
const assisted=createAssistedEntity(store,{type:'PERSON',displayName:'Teste longitudinal',birthDate:'1980-01-01'});
prepare(store,first.id);
const firstBaseline=baseline(store,first.id,assisted.id,430);
const investigation=startInvestigation(store,first.id,assisted.id);
answerInvestigation(store,investigation.id,'YES');
assert.equal(investigation.hawkinsBaselineAssessmentId,firstBaseline.id);
closeSession(store,first.id,{endedAt:'2026-08-25T11:00:00.000Z'});

store.setNow('2026-08-25T15:00:00.000Z');
const second=startSession(store);
prepare(store,second.id);
selectAssistedForSession(store,second.id,assisted.id);

const beforeEvents=store.getState().events.length;
assert.throws(
  ()=>resumeInvestigation(store,investigation.id,second.id),
  /Hawkins|frequência vibracional/i,
  'Legacy investigation resume must require a Hawkins baseline from the new session.'
);
assert.equal(store.getState().events.length,beforeEvents,'Rejected resume must not create history events.');
assert.equal(store.getState().investigations.find((item)=>item.id===investigation.id).currentSessionId,first.id,'Rejected resume must preserve the original current session.');

const secondBaseline=recordHawkinsBaseline(store,{sessionId:second.id,assistedEntityId:assisted.id,hertz:475});
resumeInvestigation(store,investigation.id,second.id);
const resumed=store.getState().investigations.find((item)=>item.id===investigation.id);
assert.equal(resumed.originSessionId,first.id,'Resume must preserve original investigation provenance.');
assert.equal(resumed.currentSessionId,second.id);
assert.equal(resumed.hawkinsBaselineAssessmentId,firstBaseline.id,'Original investigation baseline must remain intact.');
assert.equal(resumed.currentHawkinsBaselineAssessmentId,secondBaseline.id,'Current-session baseline provenance must be stored separately.');
assert.equal(resumed.currentHawkinsBaselineHertz,475);

const resumedEvent=store.getState().events.find((event)=>event.eventType==='INVESTIGATION_RESUMED'&&event.entityId===investigation.id&&event.sessionId===second.id);
assert.ok(resumedEvent,'Successful cross-session resume must create a history event.');
assert.equal(resumedEvent.metadata.originSessionId,first.id);
assert.equal(resumedEvent.metadata.hawkinsBaselineAssessmentId,secondBaseline.id);
assert.equal(resumedEvent.metadata.hawkinsBaselineHertz,475);

answerInvestigation(store,investigation.id,'NO');
assert.equal(store.getState().investigations.find((item)=>item.id===investigation.id).answers.length,2,'Answering after a valid resumed baseline must continue normally.');

console.log('legacy-investigation-resume-hawkins.test.mjs: ok');
