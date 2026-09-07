import assert from 'node:assert/strict';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';
import { isContinuityLocked } from './ui-v2/workflow-continuity.js';

const base = {
  sessionOpen:true,
  assistedSelected:true,
  assistedName:'Marina',
  hawkinsReady:true,
  nextActionCode:'INVESTIGATE',
};

const workspaceHtml = treatmentPage({
  ...base,
  treatments:[{
    id:'trt_1', title:'Equilíbrio emocional', objective:'', status:'IN_PROGRESS',
    resolved:0, total:2, modalities:[{label:'Radiestesia'}],
    primaryAction:'workspace', primaryLabel:'Ver tratamento',
  }],
});
assert.equal((workspaceHtml.match(/data-v2-treatment-action="workspace"/g) || []).length,1,'A workspace-primary treatment must expose only one route to the same workspace.');
assert.doesNotMatch(workspaceHtml,/Ver componentes/,'Duplicate workspace secondary action must stay hidden when workspace is already primary.');
assert.match(workspaceHtml,/data-v2-preview-action="treat">Novo tratamento/,'New treatment remains available when no contiguous workflow is active.');

const reviewHtml = treatmentPage({
  ...base,
  treatments:[{
    id:'trt_2', title:'Revisão', objective:'', status:'IN_PROGRESS',
    resolved:1, total:2, modalities:[{label:'Radiestesia'}],
    primaryAction:'review', primaryLabel:'Revisar',
  }],
});
assert.match(reviewHtml,/data-v2-treatment-action="review"/);
assert.match(reviewHtml,/Ver componentes/,'A genuinely different workspace action remains available beside review.');

const emptyCompositionHtml = treatmentPage({
  ...base,
  treatments:[{
    id:'trt_3', title:'Planejado', objective:'', status:'PLANNED',
    resolved:0, total:0, modalities:[{label:'Radiestesia'}],
    primaryAction:'start', primaryLabel:'Iniciar',
  }],
});
assert.match(emptyCompositionHtml,/class="v2-progress-count">—</,'Empty compositions should not display a misleading 0\/0 progress ratio.');

const triageLockedHtml = treatmentPage({ ...base, nextActionCode:'TRIAGE', treatments:[] });
assert.doesNotMatch(triageLockedHtml,/data-v2-preview-action="treat"/,'Treatment creation must not bypass an investigation in progress.');
const reikiLockedHtml = treatmentPage({ ...base, nextActionCode:'REIKI_ACTIVE', treatments:[] });
assert.doesNotMatch(reikiLockedHtml,/data-v2-preview-action="treat"/,'Treatment creation must not bypass active Reiki.');
assert.equal(isContinuityLocked('FINDINGS'), true);
assert.equal(isContinuityLocked('TREATMENT_FINAL'), true);
assert.equal(isContinuityLocked('INVESTIGATE'), false);

const lockedWithTreatmentHtml = treatmentPage({
  ...base,
  nextActionCode:'TRIAGE',
  treatments:[{
    id:'trt_locked', title:'Consulta segura', objective:'', status:'IN_PROGRESS',
    resolved:0, total:1, modalities:[{label:'Radiestesia'}],
    primaryAction:'workspace', primaryLabel:'Ver tratamento',
  }],
});
assert.match(lockedWithTreatmentHtml,/Há uma etapa em andamento/);
assert.match(lockedWithTreatmentHtml,/data-v2-route="today">Ir para Hoje/,'A locked treatment queue must offer a direct path back to the contiguous workflow.');
assert.doesNotMatch(lockedWithTreatmentHtml,/data-v2-treatment-action="workspace"/,'Locked active treatments must remain read-only.');

const noSessionHtml = treatmentPage({ sessionOpen:false, assistedSelected:false, hawkinsReady:false, treatments:[] });
assert.match(noSessionHtml,/Abra uma sessão para entrar no contexto do Assistido/);
assert.match(noSessionHtml,/data-v2-route="today">Abrir sessão em Hoje/,'No-session empty state must provide a direct recovery path to Hoje.');
assert.doesNotMatch(noSessionHtml,/Nenhum tratamento para este Assistido/,'No-session state must not pretend an assisted context exists.');

const noAssistedHtml = treatmentPage({ sessionOpen:true, assistedSelected:false, hawkinsReady:false, treatments:[] });
assert.match(noAssistedHtml,/Selecione o Assistido da sessão/);
assert.match(noAssistedHtml,/data-v2-route="today">Selecionar em Hoje/,'Missing-assisted empty state must provide a direct recovery path to Hoje.');
assert.doesNotMatch(noAssistedHtml,/Nenhum tratamento para este Assistido/);

const emptyAssistedHtml = treatmentPage({ ...base, treatments:[] });
assert.match(emptyAssistedHtml,/Nenhum tratamento para Marina/);
assert.doesNotMatch(emptyAssistedHtml,/data-v2-route="today"/,'Ready empty treatment state should rely on the existing Novo tratamento action instead of duplicating navigation.');

console.log('ui-v2-treatment-page-actions.test.mjs: ok');