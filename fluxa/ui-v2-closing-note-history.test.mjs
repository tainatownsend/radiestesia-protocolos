import assert from 'node:assert/strict';
import { deriveHistoryModel } from './ui-v2/history/history-model.js';
import { historyPage } from './ui-v2/history/history-page.js';

function baseState(confirmationSnapshot) {
  return {
    sessions: [{
      id: 'ses_1',
      status: 'CLOSED',
      startedAt: '2026-09-06T10:00:00.000Z',
      endedAt: '2026-09-06T11:00:00.000Z',
      closedRecordedAt: '2026-09-06T11:00:00.000Z',
      currentAssistedEntityId: 'ast_1',
    }],
    assistedEntities: [{ id: 'ast_1', displayName: 'Marina', archivedAt: null }],
    events: [],
    treatments: [],
    treatmentComponents: [],
    investigations: [],
    findings: [],
    reikiApplications: [],
    closingRuns: [{
      id: 'close_1',
      sessionId: 'ses_1',
      status: 'COMPLETED',
      completedAt: '2026-09-06T11:00:00.000Z',
      confirmationSnapshot,
    }],
  };
}

const customText = 'Revisar <João> & "Marina" em 7 dias.';
let history = deriveHistoryModel(baseState(customText));
let session = history.historySessions[0];
assert.equal(session.closingNote, customText, 'A therapist-entered closing note must remain available in session history.');
assert.equal(session.notes, 1, 'A therapist-entered closing note must count as a session note.');

let html = historyPage(history, { historySessionId: 'ses_1' });
assert.match(html, /Nota de encerramento/);
assert.match(html, /Revisar &lt;João&gt; &amp; &quot;Marina&quot; em 7 dias\./, 'Closing note text must be escaped before rendering.');
assert.doesNotMatch(html, /Revisar <João>/, 'Persisted closing text must never render as raw HTML.');
assert.match(html, /<strong>1<\/strong><span>achados \+ notas<\/span>/, 'The detail KPI must include the custom closing note.');

history = deriveHistoryModel(baseState('Procedimento de encerramento concluído'));
session = history.historySessions[0];
assert.equal(session.closingNote, '', 'The automatic closing confirmation must not masquerade as a therapist note.');
assert.equal(session.notes, 0, 'The automatic closing confirmation must not inflate the note count.');

html = historyPage(history, { historySessionId: 'ses_1' });
assert.doesNotMatch(html, /Nota de encerramento/);
assert.match(html, /<strong>0<\/strong><span>achados \+ notas<\/span>/);

console.log('ui-v2-closing-note-history.test.mjs: ok');
