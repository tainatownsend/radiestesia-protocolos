import assert from 'node:assert/strict';
import { ORIENTING_ASSESSMENT_AREAS, suggestProtocolsForAreas, recordOrientingAssessment, linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

const catalog = [
  {id:'root_finance',name:'Vida Financeira',category:'Temas essenciais'},
  {id:'root_prosperity',name:'Prosperidade e Abundância',category:'Investigações profundas'},
  {id:'root_career',name:'Carreira / Profissional',category:'Temas essenciais'},
  {id:'root_purpose',name:'Propósito e Caminho de Vida',category:'Investigações profundas'},
  {id:'root_marriage',name:'Casamento / Relacionamento',category:'Temas essenciais'},
  {id:'root_family',name:'Relacionamentos Familiares',category:'Investigações profundas'},
  {id:'root_master',name:'Protocolo Mestre de Causa Raiz',category:'Protocolo Mestre'},
  {id:'root_patterns',name:'Padrões Repetitivos',category:'Investigações profundas'}
];

assert.ok(ORIENTING_ASSESSMENT_AREAS.length >= 12, 'Assessment should cover the agreed broad therapeutic areas.');
assert.deepEqual(
  suggestProtocolsForAreas(['finance'], catalog).map((item) => item.protocolId),
  ['root_finance','root_prosperity'],
  'Financial assessment should suggest the specific financial protocols before generic fallbacks.'
);
assert.deepEqual(
  suggestProtocolsForAreas(['career','relationship'], catalog).map((item) => item.protocolId),
  ['root_career','root_purpose','root_marriage'],
  'Multiple explicit areas should preserve deterministic, deduplicated recommendations.'
);
assert.equal(suggestProtocolsForAreas(['unclear'], catalog)[0]?.protocolId, 'root_master', 'Unclear focus should route to the Master Root Cause Protocol.');
assert.equal(suggestProtocolsForAreas([], catalog)[0]?.protocolId, 'root_master', 'An empty focus should also fall back to the Master Protocol at the suggestion layer.');

function fakeStore(initial) {
  let state = structuredClone(initial); let seq = 0;
  return {
    getState: () => state,
    setState(updater) { state = structuredClone(typeof updater === 'function' ? updater(state) : updater); return state; },
    makeId(prefix) { seq += 1; return `${prefix}_${seq}`; },
    nowIso() { return `2026-08-22T04:00:${String(seq).padStart(2,'0')}Z`; }
  };
}

const baseState = {
  sessions:[{id:'ses_1',status:'OPEN',currentAssistedEntityId:'ast_1'}],
  preparationRuns:[{id:'prep_1',sessionId:'ses_1',status:'COMPLETED'}],
  assistedEntities:[{id:'ast_1',displayName:'Maria'}], assessments:[], events:[]
};
const store = fakeStore(baseState);
const assessment = recordOrientingAssessment(store, {
  sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:['finance'], notes:'Tema principal da sessão.'
}, catalog);
assert.equal(assessment.kind, 'ORIENTING');
assert.equal(assessment.assistedEntityId, 'ast_1');
assert.deepEqual(assessment.focusAreaLabels, ['Financeiro e prosperidade']);
assert.equal(assessment.result, 'Financeiro e prosperidade', 'Existing session reports should receive a readable result instead of an empty assessment row.');
assert.equal(assessment.protocolSuggestions[0].protocolId, 'root_finance');
assert.equal(store.getState().assessments.length, 1, 'Orienting assessment must persist in the existing local assessment history.');
assert.equal(store.getState().events.at(-1).eventType, 'ORIENTING_ASSESSMENT_RECORDED');
assert.deepEqual(store.getState().events.at(-1).metadata.focusAreaLabels, ['Financeiro e prosperidade']);
assert.equal(store.getState().findings, undefined, 'Assessment must not create findings or classify causes automatically.');

const linked = linkOrientingAssessmentToProtocol(store, assessment.id, {
  protocolId:'root_finance', protocolName:'Vida Financeira', investigationId:'inv_9'
});
assert.equal(linked.selectedProtocolId, 'root_finance');
assert.equal(linked.linkedInvestigationId, 'inv_9');
assert.equal(store.getState().events.at(-1).eventType, 'ASSESSMENT_PROTOCOL_SELECTED');

assert.throws(() => recordOrientingAssessment(fakeStore({...baseState, preparationRuns:[]}), {
  sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:['finance']
}, catalog), /preparação/i, 'Assessment must preserve session-preparation safety.');
assert.throws(() => recordOrientingAssessment(fakeStore(baseState), {
  sessionId:'ses_1', assistedEntityId:'ast_2', focusAreas:['finance']
}, catalog), /Assistido atual/i, 'Assessment must not be recorded under a different assisted entity.');
assert.throws(() => recordOrientingAssessment(fakeStore(baseState), {
  sessionId:'ses_1', assistedEntityId:'ast_1', focusAreas:[]
}, catalog), /Selecione pelo menos uma área/i, 'The domain must require an explicit focus or an explicit unclear choice.');

console.log('assessment-protocol-handoff.test.mjs: ok');
