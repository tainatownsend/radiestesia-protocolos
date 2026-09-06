import assert from 'node:assert/strict';
import { reikiWorkspace } from './ui-v2/reiki/reiki-workspace.js';

const baseModel = {
  reikiEnabled: true,
  assistedName: 'Marina',
};
const ui = { error: '' };

const outsideRunning = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_out',
    sessionId: null,
    assistedEntityId: 'ast_joao',
    assistedName: 'João',
    belongsToCurrentSession: false,
    belongsToCurrentAssisted: false,
    status: 'RUNNING',
    modeLabel: 'À distância',
    elapsedSeconds: 120,
  },
}, ui);
assert.match(outsideRunning, /foi iniciada fora de uma sessão/);
assert.match(outsideRunning, /À distância · João/);
assert.match(outsideRunning, /data-v2-reiki-control="pause"/);
assert.doesNotMatch(outsideRunning, /data-v2-reiki-control="pause"[^>]*disabled/,'Outside-session Reiki must remain pausable even while another session is open.');
assert.doesNotMatch(outsideRunning, /data-v2-reiki-control="complete"[^>]*disabled/,'Outside-session Reiki must remain completable.');
assert.doesNotMatch(outsideRunning, /pertence a outro contexto/);

const outsidePaused = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_out',
    sessionId: null,
    assistedEntityId: 'ast_joao',
    assistedName: 'João',
    belongsToCurrentSession: false,
    belongsToCurrentAssisted: false,
    status: 'PAUSED',
    modeLabel: 'À distância',
    elapsedSeconds: 180,
  },
}, ui);
assert.match(outsidePaused, /data-v2-reiki-control="resume"/);
assert.doesNotMatch(outsidePaused, /data-v2-reiki-control="resume"[^>]*disabled/,'Outside-session paused Reiki must remain resumable.');
assert.doesNotMatch(outsidePaused, /data-v2-reiki-control="complete"[^>]*disabled/);

const otherSession = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_other',
    sessionId: 'ses_other',
    assistedEntityId: 'ast_joao',
    assistedName: 'João',
    belongsToCurrentSession: false,
    belongsToCurrentAssisted: false,
    status: 'RUNNING',
    modeLabel: 'Presencial',
    elapsedSeconds: 60,
  },
}, ui);
assert.match(otherSession, /pertence a outro contexto/,'Session-bound Reiki from another context must remain visibly protected.');
assert.match(otherSession, /data-v2-reiki-control="pause"[^>]*disabled/);
assert.match(otherSession, /data-v2-reiki-control="complete"[^>]*disabled/);
assert.doesNotMatch(otherSession, /foi iniciada fora de uma sessão/);

const currentSession = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_current',
    sessionId: 'ses_current',
    assistedEntityId: 'ast_marina',
    assistedName: 'Marina',
    belongsToCurrentSession: true,
    belongsToCurrentAssisted: true,
    status: 'RUNNING',
    modeLabel: 'Presencial',
    elapsedSeconds: 45,
  },
}, ui);
assert.match(currentSession, /vinculada à sessão e ao Assistido atuais/);
assert.doesNotMatch(currentSession, /data-v2-reiki-control="pause"[^>]*disabled/);
assert.doesNotMatch(currentSession, /data-v2-reiki-control="complete"[^>]*disabled/);

console.log('ui-v2-reiki-outside-session.test.mjs: ok');
