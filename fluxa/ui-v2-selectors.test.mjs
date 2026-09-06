import assert from 'node:assert/strict';
import { deriveV2Model } from './ui-v2/state/selectors.js';

function baseState() {
  return {
    sessions: [],
    assistedEntities: [],
    events: [],
    preparationRuns: [],
    closingRuns: [],
    investigations: [],
    findings: [],
    treatments: [],
    treatmentComponents: [],
    componentReviews: [],
    treatmentReviews: [],
    assessments: [],
    reikiApplications: [],
    tools: [],
    customProtocols: [],
    settings: {},
  };
}

const state = baseState();
assert.equal(deriveV2Model(state).nextActionCode, 'START_SESSION');

state.sessions.push({ id: 'ses_1', status: 'OPEN', startedAt: '2026-09-06T01:00:00.000Z', currentAssistedEntityId: null });
assert.equal(deriveV2Model(state).nextActionCode, 'PREPARATION');

state.preparationRuns.push({
  id: 'prep_1',
  sessionId: 'ses_1',
  status: 'COMPLETED',
  startedAt: '2026-09-06T01:00:01.000Z',
  completedAt: '2026-09-06T01:02:00.000Z',
  steps: [
    { key: 'breathing', completed: true },
    { key: 'frequency', completed: true },
    { key: 'protection', completed: true },
    { key: 'permission', completed: true },
  ],
  frequencyMeasurement: { hertz: 540, value: '540' },
  protection: { toolIds: [], notes: '4 Círculos' },
  permissionNotes: null,
});
assert.equal(deriveV2Model(state).nextActionCode, 'SELECT_ASSISTED');

state.assistedEntities.push({ id: 'ast_1', displayName: 'Marina', type: 'PERSON', createdAt: '2026-09-01T00:00:00.000Z', archivedAt: null });
state.sessions[0].currentAssistedEntityId = 'ast_1';
assert.equal(deriveV2Model(state).nextActionCode, 'HAWKINS');

state.assessments.push({
  id: 'assess_1',
  kind: 'HAWKINS_FREQUENCY',
  phase: 'BASELINE',
  sessionId: 'ses_1',
  assistedEntityId: 'ast_1',
  hertz: 420,
  occurredAt: '2026-09-06T01:03:00.000Z',
});
assert.equal(deriveV2Model(state).nextActionCode, 'INVESTIGATE');

state.investigations.push({
  id: 'inv_1',
  originSessionId: 'ses_1',
  currentSessionId: 'ses_1',
  assistedEntityId: 'ast_1',
  status: 'IN_PROGRESS',
  currentIndex: 1,
  answers: [{ questionId: 'q1', questionTextSnapshot: 'Pergunta 1', answer: 'YES' }],
  protocolSnapshot: {
    name: 'Triagem rápida',
    questions: [
      { id: 'q1', text: 'Pergunta 1' },
      { id: 'q2', text: 'Pergunta 2' },
      { id: 'q3', text: 'Pergunta 3' },
    ],
  },
  startedAt: '2026-09-06T01:04:00.000Z',
  updatedAt: '2026-09-06T01:05:00.000Z',
});
const triage = deriveV2Model(state);
assert.equal(triage.nextActionCode, 'TRIAGE');
assert.equal(triage.investigation.currentIndex, 1);
assert.equal(triage.investigation.question, 'Pergunta 2');

state.investigations[0].status = 'COMPLETED';
state.investigations[0].completedAt = '2026-09-06T01:06:00.000Z';
state.investigations[0].answers = [
  { questionId: 'q1', questionTextSnapshot: 'Pergunta 1', answer: 'YES' },
  { questionId: 'q2', questionTextSnapshot: 'Pergunta 2', answer: 'NO' },
  { questionId: 'q3', questionTextSnapshot: 'Pergunta 3', answer: 'YES' },
];
const findings = deriveV2Model(state);
assert.equal(findings.nextActionCode, 'FINDINGS');
assert.deepEqual(findings.findings.map((item) => item.questionId), ['q1', 'q3']);

state.findings.push({ investigationId: 'inv_1', sourceQuestionId: 'q1', status: 'IDENTIFIED' });
state.findings.push({ investigationId: 'inv_1', sourceQuestionId: 'q3', status: 'IDENTIFIED' });
assert.equal(deriveV2Model(state).nextActionCode, 'INVESTIGATE');

console.log('ui-v2-selectors.test.mjs: ok');
