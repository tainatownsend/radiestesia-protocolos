import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveV2Model } from './ui-v2/state/selectors.js';
import { treatmentWorkspace } from './ui-v2/treatment/treatment-workspace.js';

const base = () => ({
  sessions: [{ id:'ses_1', status:'OPEN', startedAt:'2026-09-06T01:00:00.000Z', currentAssistedEntityId:'ast_1' }],
  assistedEntities: [{ id:'ast_1', displayName:'Marina', type:'PERSON', createdAt:'2026-09-01T00:00:00.000Z', archivedAt:null }],
  events: [],
  preparationRuns: [{ id:'prep_1', sessionId:'ses_1', status:'COMPLETED', startedAt:'2026-09-06T01:00:01.000Z', completedAt:'2026-09-06T01:02:00.000Z', steps:[{key:'breathing',completed:true},{key:'frequency',completed:true},{key:'protection',completed:true},{key:'permission',completed:true}] }],
  closingRuns: [], investigations: [], findings: [], treatments: [], treatmentComponents: [], componentReviews: [], treatmentReviews: [],
  assessments: [{ id:'assess_1', kind:'HAWKINS_FREQUENCY', phase:'BASELINE', sessionId:'ses_1', assistedEntityId:'ast_1', hertz:420, occurredAt:'2026-09-06T01:03:00.000Z' }],
  reikiApplications: [], tools: [], customProtocols: [], settings:{ therapeuticModalities:{ enabled:['REIKI'], custom:[] } },
});

const state = base();
state.treatments.push({ id:'trt_1', assistedEntityId:'ast_1', title:'Equilíbrio', status:'PLANNED', findingIds:[], plannedAt:'2026-09-06T01:04:00.000Z', createdAt:'2026-09-06T01:04:00.000Z', updatedAt:'2026-09-06T01:04:00.000Z' });
state.treatmentComponents.push({ id:'cmp_1', treatmentId:'trt_1', name:'Crença', status:'PLANNED', commands:[], expectedEndAt:null, createdAt:'2026-09-06T01:04:00.000Z', updatedAt:'2026-09-06T01:04:00.000Z' });
let model = deriveV2Model(state);
assert.equal(model.nextActionCode, 'TREATMENT_WORKSPACE');
assert.equal(model.treatments[0].primaryAction, 'start');

state.treatments[0].status = 'IN_PROGRESS';
state.treatments[0].startedAt = '2026-09-06T01:05:00.000Z';
state.treatmentComponents[0].status = 'IN_PROGRESS';
state.treatmentComponents[0].startedAt = '2026-09-06T01:05:00.000Z';
model = deriveV2Model(state);
assert.equal(model.nextActionCode, 'TREATMENT_REVIEW');
assert.equal(model.treatments[0].reviewableCount, 1, 'No-deadline components remain manually reviewable.');

state.treatmentComponents[0].status = 'COMPLETED';
state.treatmentComponents[0].completedAt = '2026-09-06T01:10:00.000Z';
model = deriveV2Model(state);
assert.equal(model.nextActionCode, 'TREATMENT_FINAL');
assert.equal(model.treatments[0].readyForFinalAssessment, true);

const completedWorkspace = treatmentWorkspace(model, { activeTreatmentId:'trt_1', error:'' });
assert.match(completedWorkspace,/aria-label="Componente resolvido">✓</,'Resolved component visual state must derive from persisted component status.');
assert.match(completedWorkspace,/1\/1/);

const emptyWorkspace = treatmentWorkspace({ assistedName:'Marina', treatments:[{
  id:'trt_empty', title:'Planejado', objective:'', status:'PLANNED', resolved:0, total:0,
  primaryAction:'start', primaryLabel:'Iniciar', components:[],
}] }, { activeTreatmentId:'trt_empty', error:'' });
assert.match(emptyWorkspace,/aria-label="Nenhum componente registrado"/);
assert.match(emptyWorkspace,/<strong>—<\/strong><span>componentes<\/span>/);
assert.doesNotMatch(emptyWorkspace,/0\/0/);

const reikiState = base();
reikiState.reikiApplications.push({ id:'reiki_1', sessionId:'ses_1', assistedEntityId:'ast_1', mode:'IN_PERSON', status:'RUNNING', startedAt:'2026-09-06T01:06:00.000Z', intervals:[{id:'int_1',startedAt:'2026-09-06T01:06:00.000Z',endedAt:null}], createdAt:'2026-09-06T01:06:00.000Z', updatedAt:'2026-09-06T01:06:00.000Z' });
model = deriveV2Model(reikiState);
assert.equal(model.nextActionCode, 'REIKI_ACTIVE');
assert.equal(model.reiki.belongsToCurrentSession, true);

const composer = fs.readFileSync(new URL('./ui-v2/treatment/treatment-composer.js', import.meta.url), 'utf8');
const actions = fs.readFileSync(new URL('./ui-v2/state/actions.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
assert.match(composer, /Salvar como planejado/);
assert.match(composer, /Iniciar tratamento/);
assert.match(composer, /Composição/);
assert.match(actions, /createPlannedTreatment/);
assert.match(actions, /startPlannedTreatment/);
assert.match(actions, /normalizePlannedStructuredTiming/);
assert.match(actions, /anchorStructuredTiming/);
assert.match(actions, /recordComponentDismantlingReview/);
assert.match(actions, /completeTreatmentAfterFinalAssessment/);
assert.match(actions, /startFlexibleReiki/);
assert.doesNotMatch(index, /MutationObserver/);

console.log('ui-v2-treatment-workspace.test.mjs: ok');
