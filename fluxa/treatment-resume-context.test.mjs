import assert from 'node:assert/strict';
import { EventType, TreatmentStatus } from './domain.js';
import { BacklogEventType, resumeTreatmentPreservingDuration } from './backlog.js';

function buildState(overrides = {}) {
  return {
    sessions: [],
    preparationRuns: [],
    treatments: [{
      id: 'trt_1', assistedEntityId: 'ast_1', title: 'Tratamento interrompido',
      status: TreatmentStatus.INTERRUPTED, interruptedAt: '2026-08-21T10:00:00.000Z',
      createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z'
    }],
    treatmentComponents: [{
      id: 'cmp_1', treatmentId: 'trt_1', name: 'Gráfico principal',
      status: TreatmentStatus.INTERRUPTED, expectedEndAt: '2026-08-22T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z'
    }],
    events: [],
    ...overrides
  };
}

function makeStore(initialState) {
  let state = structuredClone(initialState);
  let sequence = 0;
  return {
    getState: () => state,
    setState: (updater) => { state = updater(state); },
    makeId: (prefix) => `${prefix}_${++sequence}`,
    nowIso: () => '2026-08-22T10:00:00.000Z'
  };
}

let store = makeStore(buildState());
assert.throws(
  () => resumeTreatmentPreservingDuration(store, 'trt_1'),
  /Abra e prepare uma sessão/i,
  'resume must not happen outside an open session'
);
assert.equal(store.getState().treatments[0].status, TreatmentStatus.INTERRUPTED);

store = makeStore(buildState({
  sessions: [{ id: 'ses_1', status: 'OPEN', currentAssistedEntityId: 'ast_1' }]
}));
assert.throws(
  () => resumeTreatmentPreservingDuration(store, 'trt_1'),
  /preparação/i,
  'resume must require completed preparation'
);

store = makeStore(buildState({
  sessions: [{ id: 'ses_1', status: 'OPEN', currentAssistedEntityId: null }],
  preparationRuns: [{ id: 'prep_1', sessionId: 'ses_1', status: 'COMPLETED' }]
}));
assert.throws(
  () => resumeTreatmentPreservingDuration(store, 'trt_1'),
  /Selecione o Assistido/i,
  'resume must require an explicit current assisted context'
);

store = makeStore(buildState({
  sessions: [{ id: 'ses_1', status: 'OPEN', currentAssistedEntityId: 'ast_2' }],
  preparationRuns: [{ id: 'prep_1', sessionId: 'ses_1', status: 'COMPLETED' }]
}));
assert.throws(
  () => resumeTreatmentPreservingDuration(store, 'trt_1'),
  /não corresponde ao tratamento/i,
  'resume must not cross assisted contexts'
);
assert.equal(store.getState().events.length, 0, 'blocked resumes must not create history events');

store = makeStore(buildState({
  sessions: [{ id: 'ses_1', status: 'OPEN', currentAssistedEntityId: 'ast_1' }],
  preparationRuns: [{ id: 'prep_1', sessionId: 'ses_1', status: 'COMPLETED' }]
}));
resumeTreatmentPreservingDuration(store, 'trt_1', { preserveRemainingDuration: true });

const state = store.getState();
assert.equal(state.treatments[0].status, TreatmentStatus.IN_PROGRESS);
assert.equal(state.treatments[0].resumedAt, '2026-08-22T10:00:00.000Z');
assert.equal(state.treatmentComponents[0].status, TreatmentStatus.IN_PROGRESS);
assert.equal(
  state.treatmentComponents[0].expectedEndAt,
  '2026-08-23T10:00:00.000Z',
  'the interruption interval must extend the component review time'
);

const resumedEvent = state.events.find((event) => event.eventType === EventType.TREATMENT_RESUMED);
assert.ok(resumedEvent, 'resume must remain visible in history');
assert.equal(resumedEvent.sessionId, 'ses_1');
assert.equal(resumedEvent.assistedEntityId, 'ast_1');
assert.equal(resumedEvent.entityId, 'trt_1');
assert.equal(resumedEvent.metadata.pauseMs, 24 * 60 * 60 * 1000);

const rescheduledEvent = state.events.find((event) => event.eventType === BacklogEventType.COMPONENT_RESCHEDULED);
assert.ok(rescheduledEvent, 'duration preservation must remain auditable');
assert.equal(rescheduledEvent.sessionId, 'ses_1');
assert.equal(rescheduledEvent.assistedEntityId, 'ast_1');
assert.equal(rescheduledEvent.metadata.treatmentId, 'trt_1');

console.log('treatment-resume-context.test.mjs: ok');
