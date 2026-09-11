import assert from 'node:assert/strict';
import { reikiWorkspace } from './ui-v2/reiki/reiki-workspace.js';
import { nextRecommendation } from './ui-v2/state/selectors.js';

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
assert.match(outsideRunning, /João · Reiki/,'The sheet header must preserve the Reiki assisted context.');
assert.match(outsideRunning, /<span>À distância<\/span>/,'The timer should show the application mode without repeating the assisted name.');
assert.doesNotMatch(outsideRunning, /À distância · João/,'The timer must not duplicate the assisted identity already visible in the sheet header.');
assert.match(outsideRunning, /data-v2-reiki-control="pause"/);
assert.doesNotMatch(outsideRunning, /data-v2-reiki-control="pause"[^>]*disabled/,'Outside-session Reiki must remain pausable even while another session is open.');
assert.doesNotMatch(outsideRunning, /data-v2-reiki-control="complete"[^>]*disabled/,'Outside-session Reiki must remain completable.');
assert.doesNotMatch(outsideRunning, /Registro de Reiki pendente/);

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

const staleSession = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_stale',
    sessionId: 'ses_old',
    assistedEntityId: 'ast_joao',
    assistedName: 'João',
    belongsToCurrentSession: false,
    belongsToCurrentAssisted: false,
    status: 'RUNNING',
    modeLabel: 'Presencial',
    elapsedSeconds: 60,
  },
}, ui);
assert.match(staleSession, /Registro de Reiki pendente/);
assert.match(staleSession, /sessão não está mais aberta/);
assert.match(staleSession, /Encerrar registro pendente/);
assert.match(staleSession, /data-v2-reiki-control="complete"/,'Recovery intentionally reuses the existing completion controller action.');
assert.doesNotMatch(staleSession, /data-v2-reiki-control="pause"/,'A stale session-bound record must not offer pause.');
assert.doesNotMatch(staleSession, /data-v2-reiki-control="resume"/,'A stale session-bound record must not offer resume.');
assert.doesNotMatch(staleSession, />Concluir Reiki</,'A stale record must not be described as a therapeutic completion.');

const wrongAssistedCurrentSession = reikiWorkspace({
  ...baseModel,
  reiki: {
    id: 'reiki_current_wrong_assisted',
    sessionId: 'ses_current',
    assistedEntityId: 'ast_joao',
    assistedName: 'João',
    belongsToCurrentSession: true,
    belongsToCurrentAssisted: false,
    status: 'PAUSED',
    modeLabel: 'Presencial',
    elapsedSeconds: 60,
  },
}, ui);
assert.match(wrongAssistedCurrentSession, /outro contexto/,'Current-session Reiki for another assisted must remain protected, not treated as stale.');
assert.match(wrongAssistedCurrentSession, /data-v2-reiki-control="resume"[^>]*disabled/);
assert.match(wrongAssistedCurrentSession, /data-v2-reiki-control="complete"[^>]*disabled/);
assert.doesNotMatch(wrongAssistedCurrentSession, /Encerrar registro pendente/);

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

const outsideReikiRecommendation = nextRecommendation({
  session: { id:'ses_current' },
  prepared: true,
  assisted: { id:'ast_marina', displayName:'Marina' },
  baseline: { id:'hawk_1', hertz:540 },
  reiki: {
    id:'reiki_out',
    sessionId:null,
    assistedEntityId:'ast_joao',
    assistedName:'João',
    belongsToCurrentSession:false,
    belongsToCurrentAssisted:false,
    status:'RUNNING',
  },
  treatments: [],
  openInvestigation: null,
  pendingFindings: [],
  treatmentFindings: [],
});
assert.equal(outsideReikiRecommendation.code, 'INVESTIGATE','Outside-session Reiki must stay secondary and must not steal the current session recommendation.');

const idleRecommendation = nextRecommendation({
  session: null,
  prepared: false,
  assisted: null,
  baseline: null,
  reiki: {
    id:'reiki_out', sessionId:null, belongsToCurrentSession:false, status:'RUNNING', assistedName:'João',
  },
  treatments: [],
  openInvestigation: null,
  pendingFindings: [],
  treatmentFindings: [],
});
assert.equal(idleRecommendation.code, 'START_SESSION','Outside-session Reiki must not replace the normal idle next action.');

console.log('ui-v2-reiki-outside-session.test.mjs: ok');
