import assert from 'node:assert/strict';
import { preparationFlow } from './ui-v2/session/preparation-flow.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';

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

console.log('ui-v2-copy-polish.test.mjs: ok');
