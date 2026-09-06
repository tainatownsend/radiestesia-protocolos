import assert from 'node:assert/strict';
import { deriveV2Model } from './ui-v2/state/selectors.js';

const state = {
  sessions: [{
    id: 'ses_1',
    status: 'OPEN',
    startedAt: '2026-09-06T10:00:00.000Z',
    currentAssistedEntityId: 'ast_marina',
  }],
  assistedEntities: [
    { id: 'ast_marina', displayName: 'Marina', type: 'PERSON', archivedAt: null, createdAt: '2026-09-01T10:00:00.000Z' },
    { id: 'ast_joao', displayName: 'João', type: 'PERSON', archivedAt: null, createdAt: '2026-09-01T11:00:00.000Z' },
  ],
  preparationRuns: [],
  assessments: [],
  investigations: [],
  findings: [],
  treatments: [
    {
      id: 'tr_marina_composed', assistedEntityId: 'ast_marina', title: 'Composto nesta sessão',
      status: 'PLANNED', plannedInSessionId: 'ses_1', findingIds: [], createdAt: '2026-09-06T10:10:00.000Z',
    },
    {
      id: 'tr_marina_old', assistedEntityId: 'ast_marina', title: 'Planejado anteriormente',
      status: 'PLANNED', plannedInSessionId: 'ses_old', findingIds: [], createdAt: '2026-09-01T10:10:00.000Z',
    },
    {
      id: 'tr_marina_component', assistedEntityId: 'ast_marina', title: 'Tocado por componente',
      status: 'IN_PROGRESS', plannedInSessionId: null, findingIds: [], createdAt: '2026-09-01T10:20:00.000Z',
    },
    {
      id: 'tr_marina_review', assistedEntityId: 'ast_marina', title: 'Tocado por revisão',
      status: 'INTERRUPTED', plannedInSessionId: null, findingIds: [], createdAt: '2026-09-01T10:30:00.000Z',
    },
    {
      id: 'tr_joao_composed', assistedEntityId: 'ast_joao', title: 'João nesta sessão',
      status: 'PLANNED', plannedInSessionId: 'ses_1', findingIds: [], createdAt: '2026-09-06T10:40:00.000Z',
    },
  ],
  treatmentComponents: [
    {
      id: 'cmp_marina', treatmentId: 'tr_marina_component', name: 'Componente Marina',
      status: 'IN_PROGRESS', startedAt: '2026-09-06T10:25:00.000Z', expectedEndAt: null,
    },
  ],
  componentReviews: [],
  reikiApplications: [],
  tools: [],
  settings: { therapeuticModalities: { enabled: [], custom: [] } },
  events: [
    // The composed treatment is also touched directly; it must still count only once.
    { id: 'evt_1', sessionId: 'ses_1', entityType: 'Treatment', entityId: 'tr_marina_composed', eventType: 'TREATMENT_STARTED' },
    // Component activity must count even when the event itself is not a Treatment entity.
    { id: 'evt_2', sessionId: 'ses_1', entityType: 'TreatmentComponent', entityId: 'cmp_marina', eventType: 'COMPONENT_STARTED' },
    // Review-style events can carry the treatment provenance in metadata.
    { id: 'evt_3', sessionId: 'ses_1', entityType: 'TreatmentComponentReview', entityId: 'review_1', eventType: 'COMPONENT_REVIEWED', metadata: { treatmentId: 'tr_marina_review' } },
    // Activity from another session must not leak into this session's worked count.
    { id: 'evt_4', sessionId: 'ses_old', entityType: 'Treatment', entityId: 'tr_marina_old', eventType: 'TREATMENT_STARTED' },
  ],
};

let model = deriveV2Model(state);
assert.equal(model.assistedName, 'Marina');
assert.equal(model.treatmentCount, 3, 'Marina must count composition plus component/review activity in this session, without double counting.');
assert.equal(model.treatmentsWorked, 3);
assert.equal(model.activeTreatments, 4, 'Active longitudinal treatments remain distinct from treatments worked in this session.');
assert.ok(model.treatments.some((item) => item.id === 'tr_marina_old'), 'An older longitudinal treatment may remain visible without counting as worked today.');
assert.ok(model.treatments.every((item) => item.id !== 'tr_joao_composed'), 'The current cockpit must not include another assisted treatment list.');

state.sessions[0].currentAssistedEntityId = 'ast_joao';
model = deriveV2Model(state);
assert.equal(model.assistedName, 'João');
assert.equal(model.treatmentCount, 1, 'Switching assisted must switch the worked-treatment metric to that assisted only.');
assert.equal(model.treatmentsWorked, 1);
assert.equal(model.activeTreatments, 1);
assert.deepEqual(model.treatments.map((item) => item.id), ['tr_joao_composed']);

console.log('ui-v2-treatment-worked-counts.test.mjs: ok');
