import assert from 'node:assert/strict';
import {
  AssistedType,
  PREPARATION_STEPS,
  createAssistedEntity,
  createTreatment,
  pauseReiki,
  selectAssistedForSession,
  startInvestigation,
  startPreparation,
  startReiki,
  startSession,
  togglePreparationStep,
  completePreparation
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';

function makeStore() {
  let seq = 0;
  let now = new Date('2026-08-25T14:00:00.000Z').getTime();
  let state = {
    version:5, meta:{}, sessions:[], assistedEntities:[], events:[], preparationRuns:[], closingRuns:[],
    investigations:[], findings:[], treatments:[], treatmentComponents:[], componentReviews:[], treatmentReviews:[],
    assessments:[], reikiApplications:[], tools:[], customProtocols:[], settings:{ therapeuticModalities:{ enabled:['REIKI'] } }
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
  const run = startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}

const store = makeStore();
const session = startSession(store);
const assistedA = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Assistido A', birthDate:'1980-01-01' });
const assistedB = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Assistido B', birthDate:'1981-01-01' });

assert.throws(() => startReiki(store, session.id, assistedA.id), /preparação/i,
  'Reiki cannot bypass session preparation.');

prepare(store, session.id);
assert.throws(() => startReiki(store, session.id, assistedA.id), /Selecione o Assistido da sessão/i,
  'Reiki cannot bypass current-assisted selection.');

selectAssistedForSession(store, session.id, assistedA.id);
assert.throws(() => startInvestigation(store, session.id, assistedA.id), /Hawkins|frequência vibracional/i,
  'Investigation must require a same-session assisted Hawkins baseline.');
assert.throws(() => createTreatment(store, {
  sessionId:session.id, assistedEntityId:assistedA.id, title:'Tratamento A', componentName:'Componente A'
}), /Hawkins|frequência vibracional/i,
  'Direct treatment must require a same-session assisted Hawkins baseline.');

const baseline = recordHawkinsBaseline(store, { sessionId:session.id, assistedEntityId:assistedA.id, hertz:455 });
const investigation = startInvestigation(store, session.id, assistedA.id);
const { treatment } = createTreatment(store, {
  sessionId:session.id, assistedEntityId:assistedA.id, title:'Tratamento A', componentName:'Componente A'
});

assert.equal(investigation.hawkinsBaselineAssessmentId, baseline.id);
assert.equal(investigation.hawkinsBaselineHertz, 455);
assert.equal(treatment.hawkinsBaselineAssessmentId, baseline.id);
assert.equal(treatment.hawkinsBaselineHertz, 455);

const startEvents = store.getState().events.filter((event) =>
  ['INVESTIGATION_STARTED','TREATMENT_STARTED'].includes(event.eventType)
);
assert.equal(startEvents.length, 2);
for (const event of startEvents) {
  assert.equal(event.sessionId, session.id);
  assert.equal(event.assistedEntityId, assistedA.id);
  assert.equal(event.metadata.hawkinsBaselineAssessmentId, baseline.id);
  assert.equal(event.metadata.hawkinsBaselineHertz, 455);
}

const reiki = startReiki(store, session.id, assistedA.id);
assert.equal(reiki.sessionId, session.id);
assert.equal(reiki.assistedEntityId, assistedA.id);
pauseReiki(store, reiki.id);
selectAssistedForSession(store, session.id, assistedB.id);
assert.throws(() => startReiki(store, session.id, assistedB.id), /já existe uma aplicação de Reiki ativa/i,
  'An active/paused Reiki application cannot be reassigned through a changed assisted context.');
assert.equal(store.getState().reikiApplications.length, 1);

console.log('domain-guard-coherence.test.mjs: ok');
