import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preparationFlow } from './ui-v2/session/preparation-flow.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { postCloseSummary } from './ui-v2/session/post-close-summary.js';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';
import { historyPage } from './ui-v2/history/history-page.js';
import { libraryPage } from './ui-v2/library/library-page.js';
import { treatmentStatusLabel } from './ui-v2/status-labels.js';

const prepHtml = preparationFlow({
  preparation:{ step:3, total:4, stepKey:'protection', frequency:540, frequencyValid:true, protection:'', permission:'' },
}, { error:'' });
assert.doesNotMatch(prepHtml,/migraç/i,'User-facing preparation copy must not expose implementation or migration language.');
assert.match(prepHtml,/Registre o recurso ou proteção/);

const closeHtml = closingFlow({
  assistedName:'Marina',
  findings:[],
  safeClose:{
    assistedNames:['Marina'],
    investigationCompleted:1,
    investigationOpened:1,
    treatmentsWorked:1,
    findings:2,
    notes:0,
    activeReiki:null,
    longitudinal:[
      { title:'Equilíbrio emocional', status:'IN_PROGRESS' },
      { title:'Continuidade', status:'PLANNED' },
    ],
  },
}, { error:'' });
assert.match(closeHtml,/Assistidos desta sessão/);
assert.match(closeHtml,/Em andamento/);
assert.match(closeHtml,/Planejado/);
assert.match(closeHtml,/Pronto para encerrar/);
assert.match(closeHtml,/data-v2-primary>Encerrar sessão/);
assert.doesNotMatch(closeHtml,/>IN_PROGRESS</);
assert.doesNotMatch(closeHtml,/>PLANNED</);

const blockedCloseHtml = closingFlow({
  assistedName:'Marina',
  findings:[],
  safeClose:{
    assistedNames:['Marina'], investigationCompleted:1, investigationOpened:2,
    treatmentsWorked:0, findings:0, notes:0, activeReiki:null, longitudinal:[],
  },
}, { error:'' });
assert.match(blockedCloseHtml,/Há uma investigação em andamento/);
assert.match(blockedCloseHtml,/Conclua a investigação aberta antes de encerrar/);
assert.match(blockedCloseHtml,/Voltar à sessão/);
assert.doesNotMatch(blockedCloseHtml,/data-v2-closing-confirmation/,'Closing note must not be offered while a blocker prevents closure.');
assert.doesNotMatch(blockedCloseHtml,/data-v2-primary>Encerrar sessão/,'Closing must not remain actionable while an investigation is still open.');

const pendingFindingCloseHtml = closingFlow({
  assistedName:'Marina',
  findings:[{ questionId:'q1', title:'Achado pendente' }],
  safeClose:{
    assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1,
    treatmentsWorked:0, findings:0, notes:0, activeReiki:null, longitudinal:[],
  },
}, { error:'' });
assert.match(pendingFindingCloseHtml,/Há 1 achado aguardando revisão/);
assert.match(pendingFindingCloseHtml,/Revise os achados da investigação antes de encerrar/);
assert.match(pendingFindingCloseHtml,/Voltar à sessão/);
assert.doesNotMatch(pendingFindingCloseHtml,/data-v2-closing-confirmation/,'Pending findings must not expose a closing note that cannot be saved yet.');
assert.doesNotMatch(pendingFindingCloseHtml,/data-v2-primary>Encerrar sessão/,'Closing must not remain actionable while positive findings are awaiting review.');

const reikiBlockedHtml = closingFlow({
  assistedName:'Marina', findings:[],
  safeClose:{
    assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1,
    treatmentsWorked:0, findings:0, notes:0, longitudinal:[],
    activeReiki:{ status:'RUNNING', assistedName:'Marina' },
  },
}, { error:'' });
assert.match(reikiBlockedHtml,/Abrir Reiki para concluir/,'Reiki blocker action must describe that it opens the workspace instead of implying instant completion.');
assert.doesNotMatch(reikiBlockedHtml,/data-v2-closing-confirmation/);

const historyHtml = historyPage({ historySessions:[{
  id:'ses_1', status:'CLOSED', startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T11:00:00.000Z',
  assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1, treatmentsWorked:1, findings:1, notes:0,
  longitudinal:[{ title:'Equilíbrio emocional', status:'IN_PROGRESS' }], narrative:[],
}] }, { historySessionId:'ses_1' });
assert.match(historyHtml,/Equilíbrio emocional · Em andamento/);
assert.doesNotMatch(historyHtml,/IN_PROGRESS/);

const postCloseHtml = postCloseSummary({ historySessions:[{
  id:'ses_2', status:'CLOSED', startedAt:'2026-09-06T12:00:00.000Z', endedAt:'2026-09-06T13:00:00.000Z',
  assistedNames:['Marina'], investigationCompleted:1, treatmentsWorked:1, findings:1,
  longitudinal:[{ title:'Continuidade', status:'PLANNED' }],
}] }, 'ses_2');
assert.match(postCloseHtml,/Continuidade/);
assert.match(postCloseHtml,/Planejado/);
assert.match(postCloseHtml,/1<\/strong><span>investigação concluída/);
assert.doesNotMatch(postCloseHtml,/PLANNED/);

const assistedHtml = assistedPicker({ assistedOptions:[{ id:'ast_joao', name:'João', type:'PERSON' }] }, { assistedCreate:false, error:'' });
assert.match(assistedHtml,/data-v2-assisted-search="joão\|joao"/,'Assisted search metadata should support accented and unaccented queries.');
assert.match(assistedHtml,/>Pessoa</);
assert.doesNotMatch(assistedHtml,/>PERSON</);

const libraryHtml = libraryPage({ library:{ assisteds:[{ id:'ast_1', name:'Marina', typeLabel:'Pessoa', birthDate:'1990-01-02', details:'' }] } }, { librarySection:'assisteds' });
assert.match(libraryHtml,/Nascimento · 02\/01\/1990/);
assert.doesNotMatch(libraryHtml,/1990-01-02/,'Acervo should not expose raw ISO date-only values.');

const shell = fs.readFileSync(new URL('./ui-v2/app-shell.js', import.meta.url), 'utf8');
assert.match(shell,/model\.source === 'live' \? 'Sessão guiada' : 'Preview seguro'/);
assert.doesNotMatch(shell,/'Sessão guiada · UI V2'/,'Live header must not expose implementation version labels.');

const documentHtml = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');
assert.match(documentHtml,/<title>Fluxa<\/title>/,'The browser tab must show the product name.');
assert.doesNotMatch(documentHtml,/<title>[^<]*(?:UI V2|Preview)/i,'Implementation and preview labels must not leak into the browser tab.');

assert.equal(treatmentStatusLabel('INTERRUPTED'),'Interrompido');
assert.equal(treatmentStatusLabel('WAITING_REVIEW'),'Waiting review','Unknown status fallback should remain readable instead of exposing underscores.');

console.log('ui-v2-copy-polish.test.mjs: ok');
