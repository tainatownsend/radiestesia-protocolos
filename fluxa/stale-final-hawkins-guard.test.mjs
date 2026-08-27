import assert from 'node:assert/strict';
import { hawkinsFinalForTreatment, HAWKINS_KIND, HawkinsPhase } from './hawkins-measurement.js';
import { canCompleteTreatmentAdministratively } from './administrative-treatment.js';
import { completeTreatmentAfterFinalAssessment } from './remaining.js';

function makeState(finalAt) {
  return {
    sessions:[{ id:'s1', status:'OPEN', currentAssistedEntityId:'a1', startedAt:'2026-08-26T10:00:00.000Z' }],
    preparationRuns:[{ id:'prep1', sessionId:'s1', status:'COMPLETED', completedAt:'2026-08-26T10:05:00.000Z' }],
    assistedEntities:[{ id:'a1', type:'PERSON', displayName:'Maria', birthDate:'1990-01-01', archivedAt:null }],
    treatments:[{ id:'t1', assistedEntityId:'a1', status:'IN_PROGRESS', startedAt:'2026-08-26T10:10:00.000Z' }],
    treatmentComponents:[{ id:'c1', treatmentId:'t1', status:'COMPLETED', startedAt:'2026-08-26T10:15:00.000Z', completedAt:'2026-08-26T13:00:00.000Z', createdAt:'2026-08-26T10:15:00.000Z' }],
    assessments:[{ id:'final1', kind:HAWKINS_KIND, phase:HawkinsPhase.FINAL, treatmentId:'t1', sessionId:'s1', assistedEntityId:'a1', frequency:'520', hertz:520, imbalancePercent:10, needsNewTreatment:false, occurredAt:finalAt, createdAt:finalAt }],
    events:[], componentReviews:[], findings:[], investigations:[], reikiApplications:[]
  };
}

function makeStore(state) {
  let current=structuredClone(state); let n=0;
  return {
    getState:()=>current,
    setState(updater){current=typeof updater==='function'?updater(current):updater;return current;},
    makeId(prefix){n+=1;return `${prefix}_${n}`;},
    nowIso(){return '2026-08-26T14:30:00.000Z';}
  };
}

const staleState=makeState('2026-08-26T12:00:00.000Z');
assert.equal(hawkinsFinalForTreatment(staleState,'t1'),null,'final Hawkins before latest component completion must be stale');
assert.equal(canCompleteTreatmentAdministratively(staleState,'t1'),false,'administrative completion must reject stale final Hawkins');
const staleStore=makeStore(staleState);
assert.throws(
  ()=>completeTreatmentAfterFinalAssessment(staleStore,'t1','s1'),
  /nova avaliação final|atividade mais recente/i,
  'normal completion must reject a final assessment that predates later treatment activity'
);
assert.equal(staleStore.getState().treatments[0].status,'IN_PROGRESS','rejected stale final must not complete treatment');
assert.equal(staleStore.getState().events.length,0,'rejected stale final must not append history');

const freshState=makeState('2026-08-26T14:00:00.000Z');
assert.equal(hawkinsFinalForTreatment(freshState,'t1')?.id,'final1','final Hawkins after latest component activity must remain valid');
assert.equal(canCompleteTreatmentAdministratively(freshState,'t1'),true,'administrative completion must accept current final Hawkins');
const freshStore=makeStore(freshState);
completeTreatmentAfterFinalAssessment(freshStore,'t1','s1');
assert.equal(freshStore.getState().treatments[0].status,'COMPLETED','current final assessment must allow normal completion');
assert.equal(freshStore.getState().events.at(-1).eventType,'TREATMENT_COMPLETED');

const resumedState=makeState('2026-08-26T14:00:00.000Z');
resumedState.treatments[0].resumedAt='2026-08-26T14:10:00.000Z';
assert.equal(hawkinsFinalForTreatment(resumedState,'t1'),null,'resuming treatment after a final measurement must invalidate that final measurement');
assert.equal(canCompleteTreatmentAdministratively(resumedState,'t1'),false,'administrative completion must require a new final Hawkins after resume');

console.log('stale-final-hawkins-guard.test.mjs: ok');
