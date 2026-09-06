import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveHistoryModel, narrativeForSession } from './ui-v2/history/history-model.js';
import { historyPage } from './ui-v2/history/history-page.js';

const state = {
  sessions: [{ id:'ses_1', status:'OPEN', startedAt:'2026-09-06T10:00:00.000Z', endedAt:null, currentAssistedEntityId:'ast_1' }],
  assistedEntities: [{ id:'ast_1', displayName:'Marina', archivedAt:null }],
  investigations: [{ id:'inv_1', currentSessionId:'ses_1', assistedEntityId:'ast_1', status:'COMPLETED', protocolSnapshot:{name:'Triagem rápida'}, answers:[{answer:'YES'}] }],
  findings: [{ id:'find_1', investigationId:'inv_1', status:'IDENTIFIED', title:'Fator relevante' }],
  treatments: [
    { id:'trt_1', assistedEntityId:'ast_1', title:'Equilíbrio', status:'IN_PROGRESS' },
    { id:'trt_2', assistedEntityId:'ast_1', title:'Próximo ciclo', status:'PLANNED', plannedInSessionId:'ses_1', plannedAt:'2026-09-06T10:22:00.000Z' },
  ],
  treatmentComponents: [
    { id:'cmp_1', treatmentId:'trt_1', name:'Crença', status:'COMPLETED' },
    { id:'cmp_2', treatmentId:'trt_1', name:'Emoção', status:'IN_PROGRESS' },
    { id:'cmp_3', treatmentId:'trt_2', name:'Integração', status:'PLANNED' },
  ],
  reikiApplications: [{ id:'reiki_1', sessionId:'ses_1', assistedEntityId:'ast_1', status:'PAUSED' }],
  closingRuns: [],
  events: [
    { id:'evt_1', eventType:'SESSION_STARTED', entityType:'Session', entityId:'ses_1', sessionId:'ses_1', occurredAt:'2026-09-06T10:00:00.000Z', metadata:{} },
    { id:'evt_2', eventType:'INVESTIGATION_STARTED', entityType:'Investigation', entityId:'inv_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:05:00.000Z', metadata:{protocolName:'Triagem rápida'} },
    { id:'evt_3', eventType:'INVESTIGATION_COMPLETED', entityType:'Investigation', entityId:'inv_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:08:00.000Z', metadata:{protocolName:'Triagem rápida'} },
    { id:'evt_4', eventType:'TREATMENT_STARTED', entityType:'Treatment', entityId:'trt_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:10:00.000Z', metadata:{} },
    { id:'evt_5', eventType:'COMPONENT_COMPLETED', entityType:'TreatmentComponent', entityId:'cmp_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:20:00.000Z', metadata:{treatmentId:'trt_1'} },
    { id:'evt_6', eventType:'NOTE_CREATED', entityType:'Note', entityId:'note_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:21:00.000Z', metadata:{body:'Acompanhar na próxima sessão'} },
    { id:'evt_7', eventType:'REIKI_STARTED', entityType:'ReikiApplication', entityId:'reiki_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:25:00.000Z', metadata:{} },
    { id:'evt_8', eventType:'REIKI_PAUSED', entityType:'ReikiApplication', entityId:'reiki_1', sessionId:'ses_1', assistedEntityId:'ast_1', occurredAt:'2026-09-06T10:30:00.000Z', metadata:{} },
  ],
};

let model = deriveHistoryModel(state);
assert.equal(model.safeClose.assistedNames[0], 'Marina');
assert.equal(model.safeClose.investigationOpened, 1);
assert.equal(model.safeClose.investigationCompleted, 1);
assert.equal(model.safeClose.treatmentsWorked, 2, 'Treatments planned during the session must appear in safe close.');
assert.equal(model.safeClose.findings, 1);
assert.equal(model.safeClose.notes, 1);
assert.equal(model.safeClose.longitudinal.length, 2);
assert.equal(model.safeClose.activeReiki.status, 'PAUSED');

const narrative = narrativeForSession(state, 'ses_1');
const treatment = narrative.find((item) => item.kind === 'treatment' && item.treatmentId === 'trt_1');
assert.ok(treatment);
assert.match(treatment.title, /Tratamento Equilíbrio/);
assert.equal(treatment.relatedCount, 1);
assert.equal(treatment.detail, '1 de 2 componentes resolvidos');
const planned = narrative.find((item) => item.treatmentId === 'trt_2');
assert.ok(planned, 'A planned-only treatment needs a narrative history row even though core planning events are sessionless.');
assert.equal(planned.title, 'Tratamento Próximo ciclo planejado');
assert.equal(planned.detail, '1 componente preparado');
const investigation = narrative.find((item) => item.kind === 'investigation');
assert.equal(investigation.relatedCount, 1);
assert.ok(narrative.every((item) => item.title !== 'Atividade registrada'));

state.sessions[0].status = 'CLOSED';
state.sessions[0].endedAt = '2026-09-06T10:40:00.000Z';
state.sessions[0].closedRecordedAt = '2026-09-06T10:40:00.000Z';
state.reikiApplications[0].status = 'COMPLETED';
state.closingRuns.push({
  id:'closing_default',
  sessionId:'ses_1',
  status:'COMPLETED',
  confirmationSnapshot:'Procedimento de encerramento concluído',
  completedAt:'2026-09-06T10:40:00.000Z',
});
model = deriveHistoryModel(state);
assert.equal(model.safeClose, null);
assert.equal(model.latestClosedSession.id, 'ses_1');
assert.equal(model.latestClosedSession.closingNote, '', 'Automatic closing confirmation must not be presented as a therapist-authored note.');
assert.equal(model.latestClosedSession.notes, 1, 'Automatic closing confirmation must not inflate the visible note count.');

state.closingRuns.push({
  id:'closing_custom',
  sessionId:'ses_1',
  status:'COMPLETED',
  confirmationSnapshot:'Rever <strong>limites</strong> na próxima sessão.',
  completedAt:'2026-09-06T10:41:00.000Z',
});
model = deriveHistoryModel(state);
assert.equal(model.latestClosedSession.closingNote, 'Rever <strong>limites</strong> na próxima sessão.');
assert.equal(model.latestClosedSession.notes, 2, 'A therapist-authored closing note is part of the session note count.');
const detailHtml = historyPage(model, { historySessionId:'ses_1' });
assert.match(detailHtml, /Nota de encerramento/);
assert.match(detailHtml, /Rever &lt;strong&gt;limites&lt;\/strong&gt; na próxima sessão\./);
assert.doesNotMatch(detailHtml, /Rever <strong>limites<\/strong>/, 'Closing notes must be HTML-escaped before rendering.');

const actions = fs.readFileSync(new URL('./ui-v2/state/actions.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('./ui-v2/app-shell.js', import.meta.url), 'utf8');
const closing = fs.readFileSync(new URL('./ui-v2/session/closing-flow.js', import.meta.url), 'utf8');
assert.match(actions, /closeSession/);
assert.match(actions, /closeCurrentSessionV2/);
assert.match(actions, /plannedInSessionId/);
assert.match(actions, /sessionId: session\.id/);
assert.match(closing, /Concluir Reiki primeiro/);
assert.match(closing, /Continua depois da sessão/);
assert.match(index, /justClosedSessionId/);
assert.match(index, /historySessionId/);
assert.match(shell, /historyPage/);
assert.doesNotMatch(index, /MutationObserver/);

console.log('ui-v2-closing-history.test.mjs: ok');
