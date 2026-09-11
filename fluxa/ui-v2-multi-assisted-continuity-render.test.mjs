import assert from 'node:assert/strict';
import { historyPage } from './ui-v2/history/history-page.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { postCloseSummary } from './ui-v2/session/post-close-summary.js';

const continuity = [
  { id:'trt_marina', title:'Equilíbrio', status:'IN_PROGRESS', assistedName:'Marina' },
  { id:'trt_joao', title:'Integração', status:'PLANNED', assistedName:'João' },
];
const session = {
  id:'ses_multi', status:'CLOSED', startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T11:00:00.000Z',
  assistedNames:['Marina','João'], investigationOpened:0, investigationCompleted:0, treatmentsWorked:2, findings:0, notes:0,
  longitudinal:continuity, narrative:[], closingNote:'', activeReiki:null, pendingFindingCount:0,
};
const model = { historySessions:[session], latestClosedSession:session, findings:[] };

const historyHtml = historyPage(model, { historySessionId:'ses_multi' });
assert.match(historyHtml, /Marina · Equilíbrio · Em andamento/);
assert.match(historyHtml, /João · Integração · Planejado/);

const closingHtml = closingFlow({ ...model, safeClose:session, assistedName:'Marina' }, { error:'' });
assert.match(closingHtml, /Marina · Equilíbrio/);
assert.match(closingHtml, /João · Integração/);

const postCloseHtml = postCloseSummary(model, 'ses_multi');
assert.match(postCloseHtml, /Marina · Equilíbrio/);
assert.match(postCloseHtml, /João · Integração/);

const single = { ...session, id:'ses_single', assistedNames:['Marina'], longitudinal:[continuity[0]] };
const singleHtml = historyPage({ historySessions:[single] }, { historySessionId:'ses_single' });
assert.match(singleHtml, /Equilíbrio · Em andamento/);
assert.ok(!singleHtml.includes('Marina · Equilíbrio · Em andamento'), 'Single-assisted continuity should not repeat the assisted name.');

console.log('ui-v2-multi-assisted-continuity-render.test.mjs: ok');
