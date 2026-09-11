import assert from 'node:assert/strict';
import { historyPage } from './ui-v2/history/history-page.js';

const emptyHtml = historyPage({ historySessions:[] }, { historySessionId:null });
assert.match(emptyHtml,/Nenhuma sessão registrada/);
assert.match(emptyHtml,/data-v2-route="today">Ir para Hoje/,'Empty History must offer a direct path back to the session cockpit.');

const populatedHtml = historyPage({
  historySessions:[{
    id:'ses_1', status:'CLOSED', assistedNames:['Marina'], startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T10:30:00.000Z',
    investigationCompleted:1, investigationOpened:1, treatmentsWorked:1, findings:0, notes:0, narrative:[], longitudinal:[], closingNote:'',
  }],
}, { historySessionId:null });
assert.doesNotMatch(populatedHtml,/data-v2-route="today">Ir para Hoje/,'History with sessions should remain focused on the session list.');
assert.match(populatedHtml,/data-v2-history-session="ses_1">Ver detalhes/,'History cards must describe their action as opening historical detail, not resuming a session.');
assert.doesNotMatch(populatedHtml,/>Abrir sessão</,'History cards must not imply they resume clinical work.');

console.log('ui-v2-history-empty-state.test.mjs: ok');