import assert from 'node:assert/strict';
import {
  PREPARATION_STEPS,
  createAssistedEntity,
  startInvestigation,
  startPreparation,
  startSession,
  togglePreparationStep,
  completePreparation,
  selectAssistedForSession
} from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';

function makeState() {
  return {
    version: 3,
    meta: {},
    sessions: [],
    assistedEntities: [],
    events: [],
    preparationRuns: [],
    closingRuns: [],
    investigations: [],
    findings: [],
    treatments: [],
    treatmentComponents: [],
    treatmentReviews: [],
    assessments: [],
    reikiApplications: []
  };
}

function fakeStore(start = '2026-08-27T01:00:00.000Z') {
  let state = makeState();
  let now = new Date(start).getTime();
  let seq = 0;
  return {
    getState: () => state,
    setState(updater) {
      state = typeof updater === 'function' ? updater(state) : updater;
      return state;
    },
    makeId(prefix = 'id') {
      seq += 1;
      return `${prefix}_${seq}`;
    },
    nowIso() {
      return new Date(now).toISOString();
    }
  };
}

function prepare(store, sessionId) {
  const run = startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}

const store = fakeStore();
const session = startSession(store);
prepare(store, session.id);
const assistedA = createAssistedEntity(store, { type: 'PERSON', displayName: 'Assistido A', birthDate: '1980-01-01' });
const assistedB = createAssistedEntity(store, { type: 'PERSON', displayName: 'Assistido B', birthDate: '1981-01-01' });

selectAssistedForSession(store, session.id, assistedB.id);
recordHawkinsBaseline(store, { sessionId: session.id, assistedEntityId: assistedB.id, hertz: 470 });
selectAssistedForSession(store, session.id, assistedA.id);

const investigationCountBefore = store.getState().investigations.length;
const startedEventsBefore = store.getState().events.filter((event) => event.eventType === 'INVESTIGATION_STARTED').length;

assert.throws(
  () => startInvestigation(store, session.id, assistedB.id),
  /Assistido atual|selecione o Assistido/i,
  'investigation start must require the explicitly selected current Assisted to match the investigation owner'
);
assert.equal(store.getState().investigations.length, investigationCountBefore, 'rejected start must not create an investigation');
assert.equal(
  store.getState().events.filter((event) => event.eventType === 'INVESTIGATION_STARTED').length,
  startedEventsBefore,
  'rejected start must not write investigation history'
);

console.log('Fluxa investigation start Assisted-context regression: OK');
