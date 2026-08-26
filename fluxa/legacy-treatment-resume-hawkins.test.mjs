import assert from 'node:assert/strict';
import {
  PREPARATION_STEPS,
  TreatmentStatus,
  closeSession,
  completePreparation,
  createAssistedEntity,
  createTreatment,
  interruptTreatment,
  resumeTreatment,
  selectAssistedForSession,
  startPreparation,
  startSession,
  togglePreparationStep
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';

function makeState() {
  return {
    version:3, meta:{}, settings:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[],
    investigations:[], findings:[], treatments:[], treatmentComponents:[], treatmentReviews:[], assessments:[], reikiApplications:[]
  };
}

function fakeStore(start='2026-08-25T10:00:00.000Z') {
  let state=makeState(); let now=new Date(start).getTime(); let seq=0;
  return {
    getState:()=>state,
    setState(updater){ state=typeof updater==='function' ? updater(state) : updater; return state; },
    makeId(prefix='id'){ seq+=1; return `${prefix}_${seq}`; },
    nowIso(){ return new Date(now).toISOString(); },
    setNow(iso){ now=new Date(iso).getTime(); }
  };
}

function prepare(store, sessionId) {
  const run=startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}

function snapshotResumeState(store, treatmentId) {
  const state=store.getState();
  return {
    treatment:structuredClone(state.treatments.find((item)=>item.id===treatmentId)),
    components:structuredClone(state.treatmentComponents.filter((item)=>item.treatmentId===treatmentId)),
    resumeEvents:state.events.filter((item)=>item.eventType==='TREATMENT_RESUMED'&&item.entityId===treatmentId).length
  };
}

const store=fakeStore();
const originalSession=startSession(store);
prepare(store, originalSession.id);
const assisted=createAssistedEntity(store,{type:'PERSON',displayName:'Assistido A',birthDate:'1985-01-01'});
selectAssistedForSession(store, originalSession.id, assisted.id);
recordHawkinsBaseline(store,{sessionId:originalSession.id,assistedEntityId:assisted.id,hertz:440});
const { treatment, component }=createTreatment(store,{sessionId:originalSession.id,assistedEntityId:assisted.id,title:'Tratamento longitudinal',componentName:'Gráfico A'});
interruptTreatment(store,treatment.id,'pausa entre sessões');
closeSession(store,originalSession.id,{endedAt:'2026-08-25T11:00:00.000Z'});

store.setNow('2026-08-25T12:00:00.000Z');
const nextSession=startSession(store);
let before=snapshotResumeState(store,treatment.id);
assert.throws(()=>resumeTreatment(store,treatment.id),/preparação/i,'legacy resume must require a prepared current session');
assert.deepEqual(snapshotResumeState(store,treatment.id),before,'failed resume before preparation must not mutate treatment, components, or history');

prepare(store,nextSession.id);
before=snapshotResumeState(store,treatment.id);
assert.throws(()=>resumeTreatment(store,treatment.id),/Assistido/i,'legacy resume must require the treatment Assisted to be selected');
assert.deepEqual(snapshotResumeState(store,treatment.id),before,'failed resume without Assisted must not mutate treatment, components, or history');

const other=createAssistedEntity(store,{type:'PERSON',displayName:'Assistido B',birthDate:'1990-02-02'});
selectAssistedForSession(store,nextSession.id,other.id);
before=snapshotResumeState(store,treatment.id);
assert.throws(()=>resumeTreatment(store,treatment.id),/não corresponde/i,'legacy resume must reject a different current Assisted');
assert.deepEqual(snapshotResumeState(store,treatment.id),before,'failed resume for another Assisted must not mutate treatment, components, or history');

selectAssistedForSession(store,nextSession.id,assisted.id);
before=snapshotResumeState(store,treatment.id);
assert.throws(()=>resumeTreatment(store,treatment.id),/Hawkins|frequência vibracional/i,'legacy resume must require a new Hawkins baseline in the current session');
assert.deepEqual(snapshotResumeState(store,treatment.id),before,'failed resume without current-session Hawkins must not mutate treatment, components, or history');

const baseline=recordHawkinsBaseline(store,{sessionId:nextSession.id,assistedEntityId:assisted.id,hertz:470});
resumeTreatment(store,treatment.id);
const state=store.getState();
const resumed=state.treatments.find((item)=>item.id===treatment.id);
const resumedComponent=state.treatmentComponents.find((item)=>item.id===component.id);
assert.equal(resumed.status,TreatmentStatus.IN_PROGRESS);
assert.equal(resumedComponent.status,TreatmentStatus.IN_PROGRESS);
const event=state.events.find((item)=>item.eventType==='TREATMENT_RESUMED'&&item.entityId===treatment.id&&item.sessionId===nextSession.id);
assert.ok(event,'legacy resume must write session-bound resume history');
assert.equal(event.assistedEntityId,assisted.id);
assert.equal(event.metadata.hawkinsBaselineAssessmentId,baseline.id);
assert.equal(event.metadata.hawkinsBaselineHertz,470);

console.log('legacy-treatment-resume-hawkins.test.mjs: ok');
