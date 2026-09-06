import assert from 'node:assert/strict';
import { deriveV2Model } from './ui-v2/state/selectors.js';

const state = {
  sessions:[{ id:'ses_1', status:'OPEN', startedAt:'2026-09-06T10:00:00.000Z', currentAssistedEntityId:'ast_1' }],
  assistedEntities:[
    { id:'ast_1', type:'PERSON', displayName:'Marina', createdAt:'2026-09-01T00:00:00.000Z', updatedAt:'2026-09-01T00:00:00.000Z', archivedAt:null },
    { id:'ast_2', type:'PERSON', displayName:'João', createdAt:'2026-09-01T00:00:00.000Z', updatedAt:'2026-09-01T00:00:00.000Z', archivedAt:null },
  ],
  preparationRuns:[], assessments:[], reikiApplications:[], findings:[], treatmentComponents:[], tools:[], settings:{},
  investigations:[
    { id:'inv_m', currentSessionId:'ses_1', assistedEntityId:'ast_1', status:'COMPLETED', answers:[] },
    { id:'inv_j1', currentSessionId:'ses_1', assistedEntityId:'ast_2', status:'COMPLETED', answers:[] },
    { id:'inv_j2', currentSessionId:'ses_1', assistedEntityId:'ast_2', status:'COMPLETED', answers:[] },
  ],
  treatments:[
    { id:'trt_m', assistedEntityId:'ast_1', title:'Marina 1', status:'COMPLETED', createdAt:'2026-09-06T10:10:00.000Z', updatedAt:'2026-09-06T10:10:00.000Z' },
    { id:'trt_j1', assistedEntityId:'ast_2', title:'João 1', status:'COMPLETED', createdAt:'2026-09-06T10:11:00.000Z', updatedAt:'2026-09-06T10:11:00.000Z' },
    { id:'trt_j2', assistedEntityId:'ast_2', title:'João 2', status:'COMPLETED', createdAt:'2026-09-06T10:12:00.000Z', updatedAt:'2026-09-06T10:12:00.000Z' },
  ],
  events:[
    { id:'evt_m', eventType:'TREATMENT_STARTED', entityType:'Treatment', entityId:'trt_m', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:10:00.000Z' },
    { id:'evt_j1', eventType:'TREATMENT_STARTED', entityType:'Treatment', entityId:'trt_j1', sessionId:'ses_1', assistedEntityId:'ast_2', occurredAt:'2026-09-06T10:11:00.000Z' },
    { id:'evt_j2', eventType:'TREATMENT_STARTED', entityType:'Treatment', entityId:'trt_j2', sessionId:'ses_1', assistedEntityId:'ast_2', occurredAt:'2026-09-06T10:12:00.000Z' },
  ],
};

let model = deriveV2Model(state);
assert.equal(model.assistedName, 'Marina');
assert.equal(model.investigations, 1, 'Hoje must show only Marina investigations while Marina is the current assisted.');
assert.equal(model.treatmentsWorked, 1, 'Hoje must show only Marina treatments worked while Marina is the current assisted.');
assert.equal(model.treatmentCount, 1);

state.sessions[0].currentAssistedEntityId = 'ast_2';
model = deriveV2Model(state);
assert.equal(model.assistedName, 'João');
assert.equal(model.investigations, 2, 'Switching assisted must switch the cockpit activity counters to João.');
assert.equal(model.treatmentsWorked, 2, 'Treatment activity must follow the current assisted instead of the whole session.');
assert.equal(model.treatmentCount, 2);

console.log('ui-v2-multi-assisted-cockpit-counts.test.mjs: ok');
