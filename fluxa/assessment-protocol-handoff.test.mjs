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

const normalizedCatalog = [
  {id:'root_purpose_variant',name:'  PROPOSITO   E CAMINHO DE VIDA  ',category:'Investigações profundas'},
  {id:'root_master_variant',name:'protocolo mestre de causa raiz',category:'Protocolo Mestre'}
];
const normalizedPurpose = suggestProtocolsForAreas(['purpose'], normalizedCatalog);
assert.equal(normalizedPurpose[0]?.protocolId, 'root_purpose_variant', 'Assessment handoff should tolerate accent, case, and harmless whitespace drift in catalog protocol names.');
assert.equal(normalizedPurpose[0]?.protocolName, '  PROPOSITO   E CAMINHO DE VIDA  ', 'Suggestion snapshots must preserve the actual catalog protocol name after normalized matching.');
assert.equal(normalizedPurpose[0]?.reason, 'Propósito e caminho', 'Normalized name matching must preserve the correct assessment-area reason.');
assert.equal(suggestProtocolsForAreas(['unclear'], normalizedCatalog)[0]?.protocolId, 'root_master_variant', 'Master-protocol fallback should remain discoverable when catalog naming differs only by accents/case/spacing.');

const duplicateNormalizedCatalog = [
  {id:'root_finance_primary',name:'Vida Financeira',category:'Temas essenciais'},
  {id:'root_finance_duplicate',name:'  VIDA   FINANCEIRA  ',category:'Legacy duplicate'},
  {id:'root_prosperity_primary',name:'Prosperidade e Abundância',category:'Investigações profundas'}
];
assert.deepEqual(
  suggestProtocolsForAreas(['finance'], duplicateNormalizedCatalog).map((item) => item.protocolId),
  ['root_finance_primary','root_prosperity_primary'],
  'When normalized catalog labels collide, assessment handoff must preserve the first catalog entry instead of silently switching protocol identity.'
);

const invalidFirstDuplicateCatalog = [
  {name:'Vida Financeira',category:'Malformed legacy row'},
  null,
  {id:'',name:'Prosperidade e Abundância',category:'Malformed legacy row'},
  {id:'root_finance_valid',name:'  VIDA FINANCEIRA  ',category:'Temas essenciais'},
  {id:'root_prosperity_valid',name:'Prosperidade e Abundância',category:'Investigações profundas'}
];
assert.deepEqual(
  suggestProtocolsForAreas(['finance'], invalidFirstDuplicateCatalog).map((item) => item.protocolId),
  ['root_finance_valid','root_prosperity_valid'],
  'Malformed catalog rows must not shadow later valid protocols with the same normalized label.'
);

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
  assistedEntities:[{id:'ast_1',displayName:'Maria'},{id:'ast_2',displayName:'Ana'}],
  assessments:[], investigations:[], events:[]
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

const validInvestigation = {
  id:'inv_9', kind:'ROOT_PROTOCOL', protocolId:'root_finance', assistedEntityId:'ast_1',
  originSessionId:'ses_1', currentSessionId:'ses_1', status:'IN_PROGRESS'
};
store.setState((current) => ({ ...current, investigations:[validInvestigation] }));
const linked = linkOrientingAssessmentToProtocol(store, assessment.id, {
  protocolId:'root_finance', protocolName:'tampered name is ignored', investigationId:'inv_9'
});
assert.equal(linked.selectedProtocolId, 'root_finance');
assert.equal(linked.selectedProtocolName, 'Vida Financeira', 'Persisted protocol name must come from the recorded suggestion snapshot.');
assert.equal(linked.linkedInvestigationId, 'inv_9');
assert.equal(store.getState().events.at(-1).eventType, 'ASSESSMENT_PROTOCOL_SELECTED');
const eventCount = store.getState().events.length;
assert.equal(linkOrientingAssessmentToProtocol(store, assessment.id, { protocolId:'root_finance', investigationId:'inv_9' }).linkedInvestigationId, 'inv_9', 'Repeating the exact link should be idempotent.');
assert.equal(store.getState().events.length, eventCount, 'Idempotent relinking must not duplicate history events.');

function linkSafetyStore(investigationOverrides = {}, assessmentOverrides = {}) {
  const orienting = structuredClone({ ...assessment, selectedProtocolId:null, selectedProtocolName:null, linkedInvestigationId:null, ...assessmentOverrides });
  const investigation = { ...validInvestigation, ...investigationOverrides };
  return fakeStore({ ...baseState, assessments:[orienting], investigations:[investigation] });
}
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore(), assessment.id, {
  protocolId:'root_patterns', investigationId:'inv_9'
}), /não pertence às sugestões/i, 'Assessment must not be linked to an arbitrary protocol outside its suggestion snapshot.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore(), assessment.id, {
  protocolId:'root_finance', investigationId:null
}), /inicie ou retome/i, 'Assessment must not claim a protocol selection without a concrete investigation.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore({ protocolId:'root_prosperity' }), assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /não corresponde/i, 'Linked investigation must match the selected protocol.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore({ assistedEntityId:'ast_2' }), assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /outro Assistido/i, 'Cross-assisted investigation links must be blocked.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore({ currentSessionId:'ses_other' }), assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /sessão atual/i, 'Cross-session investigation links must be blocked.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore({ kind:'BRANCHING' }), assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /não é um protocolo terapêutico válido/i, 'Assessment handoff must link only to the root therapeutic protocol flow.');
assert.throws(() => linkOrientingAssessmentToProtocol(linkSafetyStore({}, { linkedInvestigationId:'inv_old', selectedProtocolId:'root_finance' }), assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /já está vinculada/i, 'An existing assessment link must not be silently reassigned.');

const switchedAssistedStore = linkSafetyStore();
switchedAssistedStore.setState((current) => ({ ...current, sessions:current.sessions.map((item) => ({ ...item, currentAssistedEntityId:'ast_2' })) }));
assert.throws(() => linkOrientingAssessmentToProtocol(switchedAssistedStore, assessment.id, {
  protocolId:'root_finance', investigationId:'inv_9'
}), /Assistido atual/i, 'Assessment link must respect the current assisted entity at link time.');

const generalAssessment = { id:'assess_general', kind:'GENERAL', sessionId:'ses_1', assistedEntityId:'ast_1', subject:'Frequência vibracional', result:'8500', createdAt:'2026-08-22T03:50:00Z' };
const chainedStore = fakeStore({ ...baseState, assessments:[generalAssessment] });
const chained = recordOrientingAssessment(chainedStore, {
  sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
}, catalog);
assert.equal(chained.sourceAssessmentId, 'assess_general', 'A general measurement can explicitly hand off into an orienting assessment.');
assert.equal(chainedStore.getState().assessments.find((item) => item.id === 'assess_general').followUpAssessmentId, chained.id, 'The source assessment should retain the forward link without being overwritten.');
assert.equal(chainedStore.getState().events.at(-1).metadata.sourceAssessmentId, 'assess_general');
const chainedAssessmentCount = chainedStore.getState().assessments.length;
const chainedEventCount = chainedStore.getState().events.length;
assert.throws(() => recordOrientingAssessment(chainedStore, {
  sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['finance']
}, catalog), /já possui um próximo passo/i, 'A source measurement must not overwrite its existing handoff with a second orienting assessment.');
assert.equal(chainedStore.getState().assessments.length, chainedAssessmentCount, 'Rejected duplicate handoff must not create another assessment.');
assert.equal(chainedStore.getState().events.length, chainedEventCount, 'Rejected duplicate handoff must not create history events.');
assert.equal(chainedStore.getState().assessments.find((item) => item.id === 'assess_general').followUpAssessmentId, chained.id, 'Rejected duplicate handoff must preserve the original forward link.');
assert.throws(() => recordOrientingAssessment(fakeStore({ ...baseState, assessments:[{...generalAssessment, sessionId:'other'}] }), {
  sessionId:'ses_1', assistedEntityId:'ast_1', sourceAssessmentId:'assess_general', focusAreas:['patterns']
}, catalog), /avaliação de origem/i, 'Cross-session assessment handoff must be blocked.');

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
