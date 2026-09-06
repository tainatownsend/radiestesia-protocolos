import assert from 'node:assert/strict';
import fs from 'node:fs';
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
assert.equal(history.safeClose.pendingFindingBlocker?.assistedEntityId, 'ast_2');
assert.equal(history.safeClose.pendingFindingBlocker?.assistedName, 'João');

let html = closingFlow({ safeClose:history.safeClose, assistedName:'Marina', findings:[] }, { error:'' });
assert.match(html,/Há 1 achado aguardando revisão/,'Closing UI must surface a pending finding that belongs to a non-current assisted.');
assert.match(html,/Revise os achados de João/,'Closing UI should explain which assisted owns the blocking review.');
assert.match(html,/data-v2-select-assisted="ast_2"/,'Closing recovery must reuse the normal assisted selection path for the blocker owner.');
assert.match(html,/data-v2-closing-blocker-assisted="ast_2"/,'Closing recovery must identify the target as a closing-only exception.');
assert.match(html,/Continuar com João/);
assert.doesNotMatch(html,/data-v2-primary>Encerrar sessão/,'Closing must remain unavailable until every assisted finding is reviewed.');

const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
assert.match(index,/const closingRecoveryIds = \[[\s\S]*openInvestigationBlocker[\s\S]*pendingFindingBlocker[\s\S]*\]\.filter\(Boolean\)/,'Controller must derive the only assisted IDs allowed to bypass the continuity lock from safe-close blockers.');
assert.match(index,/ui\.sheet === 'closing' && closingRecoveryIds\.includes\(assisted\.dataset\.v2SelectAssisted\)/,'Only targeted closing recovery may bypass the regular assisted-switch lock.');

state.findings.push({
  id:'find_2', investigationId:'inv_2', sourceQuestionId:'q2', assistedEntityId:'ast_2',
  title:'Achado de João', status:'DISMISSED', createdAt:'2026-09-06T10:30:00.000Z', dismissedAt:'2026-09-06T10:30:00.000Z',
});
state.investigations[1].status = 'IN_PROGRESS';
history = deriveHistoryModel(state);
assert.equal(history.safeClose.pendingFindingCount, 0,'A persisted dismissal counts as a completed review without inflating confirmed finding totals.');
assert.equal(history.safeClose.findings, 0);
assert.equal(history.safeClose.pendingFindingBlocker, null);
assert.equal(history.safeClose.openInvestigationBlocker?.assistedEntityId, 'ast_2');
assert.equal(history.safeClose.openInvestigationBlocker?.assistedName, 'João');
html = closingFlow({ safeClose:history.safeClose, assistedName:'Marina', findings:[] }, { error:'' });
assert.match(html,/Há uma investigação em andamento/);
assert.match(html,/a investigação de João/,'Open-investigation recovery should identify the assisted whose flow must resume.');
assert.match(html,/data-v2-select-assisted="ast_2"/);
assert.match(html,/Continuar com João/);
assert.doesNotMatch(html,/data-v2-primary>Encerrar sessão/);

state.investigations[1].status = 'COMPLETED';
history = deriveHistoryModel(state);
assert.equal(history.safeClose.openInvestigationBlocker, null);
html = closingFlow({ safeClose:history.safeClose, assistedName:'Marina', findings:[] }, { error:'' });
assert.match(html,/Pronto para encerrar/);
assert.match(html,/data-v2-primary>Encerrar sessão/);
assert.doesNotMatch(html,/data-v2-closing-blocker-assisted/);

console.log('ui-v2-multi-assisted-close.test.mjs: ok');
