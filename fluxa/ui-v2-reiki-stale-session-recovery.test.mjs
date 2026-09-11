import assert from 'node:assert/strict';
import { reikiWorkspace } from './ui-v2/reiki/reiki-workspace.js';
import { nextRecommendation } from './ui-v2/state/selectors.js';

const staleReiki = {
  id: 'reiki_old',
  sessionId: 'ses_old',
  assistedEntityId: 'ast_old',
  assistedName: 'João',
  belongsToCurrentSession: false,
  belongsToCurrentAssisted: false,
  status: 'RUNNING',
  mode: 'DISTANCE',
  modeLabel: 'À distância',
  elapsedSeconds: 125,
  startedAt: '2026-09-06T10:00:00.000Z',
};

const html = reikiWorkspace({
  reikiEnabled: true,
  assistedName: 'Marina',
  reiki: staleReiki,
}, { error: '' });

assert.match(html, /Registro de Reiki pendente/,
  'An active Reiki record from another session must be presented as stale recovery, not as current-session work.');
assert.match(html, /Essa sessão não está mais aberta/,
  'Stale recovery must explain why the old application cannot resume as normal current-session work.');
assert.match(html, /data-v2-reiki-control="complete">Encerrar registro pendente</,
  'Stale recovery must offer one explicit cleanup action.');
assert.doesNotMatch(html, /data-v2-reiki-control="pause"/,
  'A stale Reiki record must never expose Pause as if it belonged to the current session.');
assert.doesNotMatch(html, /data-v2-reiki-control="resume"/,
  'A stale Reiki record must never expose Resume as if it belonged to the current session.');

const recommendation = nextRecommendation({
  session: { id: 'ses_current' },
  prepared: true,
  assisted: { id: 'ast_current', displayName: 'Marina' },
  baseline: { id: 'haw_current' },
  reiki: staleReiki,
  treatments: [],
  openInvestigation: null,
  pendingFindings: [],
  treatmentFindings: [],
});
assert.equal(recommendation.code, 'INVESTIGATE',
  'A Reiki record from another session must not hijack the current session recommendation.');

const currentSessionOtherAssisted = {
  ...staleReiki,
  sessionId: 'ses_current',
  belongsToCurrentSession: true,
};
const currentRecommendation = nextRecommendation({
  session: { id: 'ses_current' },
  prepared: true,
  assisted: { id: 'ast_current', displayName: 'Marina' },
  baseline: { id: 'haw_current' },
  reiki: currentSessionOtherAssisted,
  treatments: [],
  openInvestigation: null,
  pendingFindings: [],
  treatmentFindings: [],
});
assert.equal(currentRecommendation.code, 'REIKI_CONTEXT',
  'A Reiki application from the current session but another assisted must still force assisted-context recovery.');
assert.equal(currentRecommendation.assistedEntityId, 'ast_old');

console.log('ui-v2-reiki-stale-session-recovery.test.mjs: ok');
