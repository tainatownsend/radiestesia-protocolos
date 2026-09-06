import assert from 'node:assert/strict';
import { deriveHistoryModel } from './ui-v2/history/history-model.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';

const state = {
  sessions:[{ id:'ses_1', status:'OPEN', startedAt:'2026-09-06T10:00:00.000Z', currentAssistedEntityId:'ast_1' }],
  assistedEntities:[
    { id:'ast_1', displayName:'Marina', archivedAt:null },
    { id:'ast_2', displayName:'João', archivedAt:null },
  ],
  events:[], treatments:[], treatmentComponents:[], reikiApplications:[], findings:[],
  investigations:[
    {
      id:'inv_1', currentSessionId:'ses_1', assistedEntityId:'ast_1', status:'COMPLETED',
      answers:[{ questionId:'q1', questionTextSnapshot:'Sem achado', answer:'NO' }],
    },
    {
      id:'inv_2', currentSessionId:'ses_1', assistedEntityId:'ast_2', status:'COMPLETED',
      answers:[{ questionId:'q2', questionTextSnapshot:'Achado de João', answer:'YES' }],
    },
  ],
};

let history = deriveHistoryModel(state);
assert.equal(history.safeClose.pendingFindingCount, 1,'Safe close must count pending findings across every assisted worked in the session.');
assert.deepEqual(new Set(history.safeClose.assistedNames), new Set(['Marina','João']));

let html = closingFlow({ safeClose:history.safeClose, assistedName:'Marina', findings:[] }, { error:'' });
assert.match(html,/Há 1 achado aguardando revisão/,'Closing UI must surface a pending finding that belongs to a non-current assisted.');
assert.doesNotMatch(html,/data-v2-primary>Encerrar sessão/,'Closing must remain unavailable until every assisted finding is reviewed.');

state.findings.push({
  id:'find_2', investigationId:'inv_2', sourceQuestionId:'q2', assistedEntityId:'ast_2',
  title:'Achado de João', status:'DISMISSED', createdAt:'2026-09-06T10:30:00.000Z', dismissedAt:'2026-09-06T10:30:00.000Z',
});
history = deriveHistoryModel(state);
assert.equal(history.safeClose.pendingFindingCount, 0,'A persisted dismissal counts as a completed review without inflating confirmed finding totals.');
assert.equal(history.safeClose.findings, 0);
html = closingFlow({ safeClose:history.safeClose, assistedName:'Marina', findings:[] }, { error:'' });
assert.match(html,/Pronto para encerrar/);
assert.match(html,/data-v2-primary>Encerrar sessão/);

console.log('ui-v2-multi-assisted-close.test.mjs: ok');
