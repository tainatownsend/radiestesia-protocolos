import assert from 'node:assert/strict';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';

const base = {
  sessionOpen:true,
  assistedSelected:true,
  assistedName:'Marina',
  hawkinsReady:true,
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

const noSessionHtml = treatmentPage({ sessionOpen:false, assistedSelected:false, hawkinsReady:false, treatments:[] });
assert.match(noSessionHtml,/Abra uma sessão para entrar no contexto do Assistido/);
assert.doesNotMatch(noSessionHtml,/Nenhum tratamento para este Assistido/,'No-session state must not pretend an assisted context exists.');

const noAssistedHtml = treatmentPage({ sessionOpen:true, assistedSelected:false, hawkinsReady:false, treatments:[] });
assert.match(noAssistedHtml,/Selecione o Assistido da sessão/);
assert.doesNotMatch(noAssistedHtml,/Nenhum tratamento para este Assistido/);

const emptyAssistedHtml = treatmentPage({ ...base, treatments:[] });
assert.match(emptyAssistedHtml,/Nenhum tratamento para Marina/);

console.log('ui-v2-treatment-page-actions.test.mjs: ok');
