import assert from 'node:assert/strict';
import { nextRecommendation, pendingSessionFindingBatch } from './ui-v2/state/selectors.js';

const base = {
  session:{ id:'ses_1' },
  prepared:true,
  assisted:{ id:'ast_1', displayName:'Marina' },
  baseline:{ id:'assess_1' },
  reiki:null,
  treatments:[],
  openInvestigation:null,
  pendingFindings:[],
  treatmentFindings:[],
};

const dueTreatment = {
  id:'trt_1', title:'Tratamento ativo', status:'IN_PROGRESS', total:1, resolved:0,
  readyForFinalAssessment:false, reviewableCount:1, primaryLabel:'Revisar',
};
const openInvestigation = {
  id:'inv_open', currentIndex:1,
  protocolSnapshot:{ name:'Triagem rápida', questions:[{},{},{}] },
};

assert.equal(nextRecommendation({ ...base, treatments:[dueTreatment], openInvestigation }).code, 'TRIAGE', 'An investigation already in progress must not be displaced by a treatment review.');
assert.equal(nextRecommendation({ ...base, treatments:[dueTreatment], pendingFindings:[{ questionId:'q1' }] }).code, 'FINDINGS', 'Fresh findings must stay in the investigation flow before unrelated treatment work.');
assert.equal(nextRecommendation({ ...base, treatments:[dueTreatment] }).code, 'TREATMENT_REVIEW');

const state = {
  investigations:[
    {
      id:'inv_old', currentSessionId:'ses_1', assistedEntityId:'ast_1', status:'COMPLETED', completedAt:'2026-09-06T10:00:00.000Z',
      answers:[{ questionId:'q_old', questionTextSnapshot:'Achado antigo', answer:'YES' }],
    },
    {
      id:'inv_new', currentSessionId:'ses_1', assistedEntityId:'ast_1', status:'COMPLETED', completedAt:'2026-09-06T11:00:00.000Z',
      answers:[{ questionId:'q_new', questionTextSnapshot:'Achado novo', answer:'YES' }],
    },
  ],
  findings:[],
};

let batch = pendingSessionFindingBatch(state, 'ses_1', 'ast_1');
assert.equal(batch.investigation.id, 'inv_old', 'The oldest unresolved completed investigation is surfaced first so it cannot be buried by a newer run.');
assert.deepEqual(batch.findings.map((item) => item.questionId), ['q_old']);

state.findings.push({ investigationId:'inv_old', sourceQuestionId:'q_old', status:'IDENTIFIED' });
batch = pendingSessionFindingBatch(state, 'ses_1', 'ast_1');
assert.equal(batch.investigation.id, 'inv_new');
assert.deepEqual(batch.findings.map((item) => item.questionId), ['q_new']);

console.log('ui-v2-investigation-continuity.test.mjs: ok');
