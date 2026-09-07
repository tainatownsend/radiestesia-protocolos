import assert from 'node:assert/strict';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { historyPage } from './ui-v2/history/history-page.js';
import { treatmentReview } from './ui-v2/treatment/treatment-review.js';

function occurrences(source, text) {
  return source.split(text).length - 1;
}

const reviewHtml = treatmentReview({
  assistedName:'Marina',
  treatments:[{
    id:'trt_1', title:'Equilíbrio emocional',
    components:[{ id:'cmp_1', name:'Crença de escassez', commandCount:1, graphCount:2 }],
  }],
}, { activeTreatmentId:'trt_1', reviewComponentId:'cmp_1', error:'' });
assert.match(reviewHtml, /Marina · Equilíbrio emocional/);
assert.match(reviewHtml, /Revisar Crença de escassez/);
assert.equal(occurrences(reviewHtml, 'Crença de escassez'), 1,
  'The reviewed component belongs in the sticky title and must not be repeated in a nested context card.');
assert.doesNotMatch(reviewHtml, /v2-review-context/);
assert.doesNotMatch(reviewHtml, /v2-card v2-card--soft/,
  'Component review must stay flat instead of nesting a context card inside a sheet.');
assert.match(reviewHtml, /1 comando · 2 gráficos neste componente/);

const closeHtml = closingFlow({
  assistedName:'Marina', findings:[],
  safeClose:{
    assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1,
    treatmentsWorked:2, findings:3, notes:1, longitudinal:[], activeReiki:null,
  },
}, { error:'' });
assert.match(closeHtml, /Marina · Revisão da sessão/);
assert.equal(occurrences(closeHtml, 'Marina'), 1,
  'Single-Assisted closing should keep identity in the sticky context instead of repeating an Assistidos card.');
assert.match(closeHtml, /class="v2-close-summary"/);
assert.doesNotMatch(closeHtml, /v2-close-metric|v2-close-context/,
  'Closing summary must use a compact readout rather than dashboard-like metric cards.');
assert.match(closeHtml, />Nota de encerramento /);
assert.doesNotMatch(closeHtml, /Confirmação \/ nota de encerramento/);

const multiCloseHtml = closingFlow({
  findings:[],
  safeClose:{
    assistedNames:['Marina','João'], investigationCompleted:0, investigationOpened:0,
    treatmentsWorked:0, findings:0, notes:0, longitudinal:[], activeReiki:null,
  },
}, { error:'' });
assert.match(multiCloseHtml, /2 Assistidos · Revisão da sessão/);
assert.match(multiCloseHtml, /Assistidos:<\/strong> Marina, João/,
  'Multi-Assisted closing still needs the explicit identity list because a count alone is insufficient context.');

const historyHtml = historyPage({ historySessions:[{
  id:'ses_1', status:'CLOSED', startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T11:00:00.000Z',
  assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1,
  treatmentsWorked:2, findings:3, notes:1, closingNote:'Retomar limites.',
  longitudinal:[{ title:'Equilíbrio', status:'IN_PROGRESS' }],
  narrative:[{ id:'n1', title:'Investigação concluída', detail:'1 resposta positiva', occurredAt:'2026-09-06T10:15:00.000Z', audit:[], relatedCount:0 }],
}] }, { historySessionId:'ses_1' });
assert.match(historyHtml, /class="v2-history-summary"/);
assert.doesNotMatch(historyHtml, /v2-history-kpis|class="v2-kpi"/,
  'History detail must read like a narrative, not a KPI dashboard.');
assert.match(historyHtml, /class="v2-history-continuity-block"/);
assert.match(historyHtml, /class="v2-history-closing-note"/);
assert.doesNotMatch(historyHtml, /v2-card v2-card--soft[^>]*v2-history-closing-note/);
assert.match(historyHtml, /<p class="v2-eyebrow">Evolução<\/p><h2>Linha do tempo<\/h2>/);

console.log('ui-v2-density-hierarchy.test.mjs: ok');
