import assert from 'node:assert/strict';
import { nextRecommendation, pendingSessionFindingBatch } from './ui-v2/state/selectors.js';
import { closeCurrentSessionV2, confirmInvestigationFindings } from './ui-v2/state/actions.js';

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

state.findings.push({ investigationId:'inv_new', sourceQuestionId:'q_new', status:'DISMISSED' });
batch = pendingSessionFindingBatch(state, 'ses_1', 'ast_1');
assert.equal(batch.investigation, null, 'A deliberately dismissed positive answer is reviewed and must not return to the pending queue.');
assert.deepEqual(batch.findings, []);

function fakeStore(initial) {
  let value = structuredClone(initial);
  let id = 0;
  return {
    getState: () => value,
    setState(updater) {
      value = typeof updater === 'function' ? updater(value) : updater;
      return value;
    },
    makeId(prefix = 'id') { id += 1; return `${prefix}_${id}`; },
    nowIso() { return new Date().toISOString(); },
  };
}

const reviewStore = fakeStore({
  sessions:[{ id:'ses_review', status:'OPEN', startedAt:new Date(Date.now() - 60_000).toISOString(), currentAssistedEntityId:'ast_1' }],
  assistedEntities:[{ id:'ast_1', type:'PERSON', displayName:'Marina', birthDate:'1990-01-01', archivedAt:null }],
  preparationRuns:[{ id:'prep_1', sessionId:'ses_review', status:'COMPLETED' }],
  investigations:[{
    id:'inv_review', currentSessionId:'ses_review', assistedEntityId:'ast_1', status:'COMPLETED',
    answers:[
      { questionId:'q_keep', questionTextSnapshot:'Achado confirmado', answer:'YES' },
      { questionId:'q_drop', questionTextSnapshot:'Achado descartado', answer:'YES' },
    ],
  }],
  findings:[], events:[], closingRuns:[], reikiApplications:[],
});

assert.throws(() => closeCurrentSessionV2(reviewStore), /Revise os achados pendentes/,'The V2 close action must guard pending finding review even if the UI is bypassed.');
const created = confirmInvestigationFindings(reviewStore, 'inv_review', ['q_keep']);
assert.equal(created.length, 1);
assert.equal(reviewStore.getState().findings.find((item) => item.sourceQuestionId === 'q_keep')?.status, 'IDENTIFIED');
assert.equal(reviewStore.getState().findings.find((item) => item.sourceQuestionId === 'q_drop')?.status, 'DISMISSED','Unchecked positive findings must persist as deliberately dismissed.');
assert.deepEqual(pendingSessionFindingBatch(reviewStore.getState(), 'ses_review', 'ast_1').findings, []);
closeCurrentSessionV2(reviewStore);
assert.equal(reviewStore.getState().sessions[0].status, 'CLOSED','Closing becomes available after every positive answer has been reviewed.');

console.log('ui-v2-investigation-continuity.test.mjs: ok');
