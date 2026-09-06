import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preparationFlow } from './ui-v2/session/preparation-flow.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';
import { historyPage } from './ui-v2/history/history-page.js';
import { treatmentStatusLabel } from './ui-v2/status-labels.js';

const prepHtml = preparationFlow({
  preparation:{ step:3, total:4, stepKey:'protection', frequency:540, frequencyValid:true, protection:'', permission:'' },
}, { error:'' });
assert.doesNotMatch(prepHtml,/migraç/i,'User-facing preparation copy must not expose implementation or migration language.');
assert.match(prepHtml,/Registre o recurso ou proteção/);

const closeHtml = closingFlow({
  assistedName:'Marina',
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
assert.match(closeHtml,/Em andamento/);
assert.match(closeHtml,/Planejado/);
assert.doesNotMatch(closeHtml,/>IN_PROGRESS</);
assert.doesNotMatch(closeHtml,/>PLANNED</);

const historyHtml = historyPage({ historySessions:[{
  id:'ses_1', status:'CLOSED', startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T11:00:00.000Z',
  assistedNames:['Marina'], investigationCompleted:1, investigationOpened:1, treatmentsWorked:1, findings:1, notes:0,
  longitudinal:[{ title:'Equilíbrio emocional', status:'IN_PROGRESS' }], narrative:[],
}] }, { historySessionId:'ses_1' });
assert.match(historyHtml,/Equilíbrio emocional · Em andamento/);
assert.doesNotMatch(historyHtml,/IN_PROGRESS/);

const assistedHtml = assistedPicker({ assistedOptions:[{ id:'ast_joao', name:'João', type:'PERSON' }] }, { assistedCreate:false, error:'' });
assert.match(assistedHtml,/data-v2-assisted-search="joão\|joao"/,'Assisted search metadata should support accented and unaccented queries.');
assert.match(assistedHtml,/>Pessoa</);
assert.doesNotMatch(assistedHtml,/>PERSON</);

const shell = fs.readFileSync(new URL('./ui-v2/app-shell.js', import.meta.url), 'utf8');
assert.match(shell,/model\.source === 'live' \? 'Sessão guiada' : 'Preview seguro'/);
assert.doesNotMatch(shell,/'Sessão guiada · UI V2'/,'Live header must not expose implementation version labels.');

assert.equal(treatmentStatusLabel('INTERRUPTED'),'Interrompido');
assert.equal(treatmentStatusLabel('WAITING_REVIEW'),'Waiting review','Unknown status fallback should remain readable instead of exposing underscores.');

console.log('ui-v2-copy-polish.test.mjs: ok');
