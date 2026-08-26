import { isReikiEnabled } from './reiki-modality.js';

export const ReikiMode = Object.freeze({
  IN_PERSON: 'IN_PERSON',
  DISTANCE: 'DISTANCE',
  SELF: 'SELF',
  OTHER: 'OTHER'
});

export const ReikiModeLabel = Object.freeze({
  IN_PERSON: 'Presencial',
  DISTANCE: 'À distância',
  SELF: 'Autoaplicação',
  OTHER: 'Outro'
});

function addEvent(store, draft, input) {
  draft.events.push({
    id: store.makeId('evt'),
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionId: input.sessionId || null,
    assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(),
    createdAt: store.nowIso(),
    metadata: input.metadata || {}
  });
}

function elapsedSeconds(application, now = Date.now()) {
  const ms = (application.intervals || []).reduce((total, interval) => {
    const start = new Date(interval.startedAt).getTime();
    const end = interval.endedAt ? new Date(interval.endedAt).getTime() : now;
    return total + Math.max(0, end - start);
  }, 0);
  return Math.floor(ms / 1000);
}

function requireAssisted(state, assistedEntityId) {
  const assisted = state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Selecione um assistido válido.');
  return assisted;
}

function requireSessionContext(state, sessionId, assistedEntityId, action) {
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error(action === 'resume' ? 'Reabra uma sessão para retomar esta aplicação vinculada à sessão.' : 'A sessão informada não está aberta.');
  if (!session.currentAssistedEntityId) {
    throw new Error('Selecione o Assistido da aplicação de Reiki nesta sessão.');
  }
  if (session.currentAssistedEntityId !== assistedEntityId) {
    throw new Error('O Assistido atual não corresponde à aplicação de Reiki desta sessão.');
  }
  return session;
}

function requireNewReikiEligibility(state, sessionId = null) {
  if (!isReikiEnabled(state)) throw new Error('Habilite Reiki nas terapias da prática antes de iniciar uma nova aplicação.');
  if (!sessionId) return;
  const prepared = (state.preparationRuns || []).some((run) => run.sessionId === sessionId && run.status === 'COMPLETED');
  if (!prepared) throw new Error('Conclua a preparação da sessão antes de iniciar Reiki.');
}

export function startFlexibleReiki(store, input) {
  const state = store.getState();
  requireAssisted(state, input.assistedEntityId);
  const sessionId = input.sessionId || null;
  requireNewReikiEligibility(state, sessionId);
  if (sessionId) requireSessionContext(state, sessionId, input.assistedEntityId, 'start');
  const existing = state.reikiApplications.find((item) => ['RUNNING','PAUSED'].includes(item.status));
  if (existing) throw new Error('Já existe uma aplicação de Reiki ativa. Conclua ou retome a aplicação atual antes de iniciar outra.');
  const now = store.nowIso();
  const mode = Object.values(ReikiMode).includes(input.mode) ? input.mode : ReikiMode.OTHER;
  const application = {
    id: store.makeId('reiki'),
    sessionId,
    assistedEntityId: input.assistedEntityId,
    mode,
    status: 'RUNNING',
    startedAt: now,
    endedAt: null,
    durationSeconds: null,
    notes: null,
    intervals: [{ id: store.makeId('int'), startedAt: now, endedAt: null }],
    createdAt: now,
    updatedAt: now
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.reikiApplications.push(application);
    addEvent(store, draft, {
      eventType: 'REIKI_STARTED',
      entityType: 'ReikiApplication',
      entityId: application.id,
      sessionId,
      assistedEntityId: application.assistedEntityId,
      metadata: { mode, outsideSession: !sessionId }
    });
    return draft;
  });
  return application;
}

export function pauseFlexibleReiki(store, applicationId) {
  const state = store.getState();
  const application = state.reikiApplications.find((item) => item.id === applicationId && item.status === 'RUNNING');
  if (!application) return;
  if (application.sessionId) requireSessionContext(state, application.sessionId, application.assistedEntityId, 'pause');
  store.setState((current) => {
    const draft = structuredClone(current);
    const app = draft.reikiApplications.find((item) => item.id === applicationId && item.status === 'RUNNING');
    if (!app) return draft;
    const interval = [...(app.intervals || [])].reverse().find((item) => !item.endedAt);
    if (interval) interval.endedAt = store.nowIso();
    app.status = 'PAUSED';
    app.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: 'REIKI_PAUSED', entityType: 'ReikiApplication', entityId: app.id,
      sessionId: app.sessionId, assistedEntityId: app.assistedEntityId,
      metadata: { mode: app.mode || null, outsideSession: !app.sessionId }
    });
    return draft;
  });
}

export function resumeFlexibleReiki(store, applicationId) {
  const state = store.getState();
  const application = state.reikiApplications.find((item) => item.id === applicationId && item.status === 'PAUSED');
  if (!application) throw new Error('Aplicação de Reiki não disponível para retomada.');
  if (application.sessionId) requireSessionContext(state, application.sessionId, application.assistedEntityId, 'resume');
  store.setState((current) => {
    const draft = structuredClone(current);
    const app = draft.reikiApplications.find((item) => item.id === applicationId);
    app.intervals.push({ id: store.makeId('int'), startedAt: store.nowIso(), endedAt: null });
    app.status = 'RUNNING';
    app.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: 'REIKI_RESUMED', entityType: 'ReikiApplication', entityId: app.id,
      sessionId: app.sessionId, assistedEntityId: app.assistedEntityId,
      metadata: { mode: app.mode || null, outsideSession: !app.sessionId }
    });
    return draft;
  });
}

export function completeFlexibleReiki(store, applicationId, notes = '') {
  const state = store.getState();
  const application = state.reikiApplications.find((item) => item.id === applicationId && ['RUNNING','PAUSED'].includes(item.status));
  if (!application) throw new Error('Aplicação de Reiki não disponível para conclusão.');
  if (application.sessionId) requireSessionContext(state, application.sessionId, application.assistedEntityId, 'complete');
  store.setState((current) => {
    const draft = structuredClone(current);
    const app = draft.reikiApplications.find((item) => item.id === applicationId);
    const now = store.nowIso();
    if (app.status === 'RUNNING') {
      const interval = [...(app.intervals || [])].reverse().find((item) => !item.endedAt);
      if (interval) interval.endedAt = now;
    }
    app.status = 'COMPLETED';
    app.endedAt = now;
    app.durationSeconds = elapsedSeconds(app, new Date(now).getTime());
    app.notes = notes.trim() || null;
    app.updatedAt = now;
    addEvent(store, draft, {
      eventType: 'REIKI_COMPLETED', entityType: 'ReikiApplication', entityId: app.id,
      sessionId: app.sessionId, assistedEntityId: app.assistedEntityId,
      metadata: { durationSeconds: app.durationSeconds, mode: app.mode || null, outsideSession: !app.sessionId }
    });
    return draft;
  });
}

export function reikiElapsedSecondsFlexible(application, now = Date.now()) {
  return elapsedSeconds(application, now);
}

export function normalizeRetrospectiveReikiMode(store, applicationId, mode) {
  if (!Object.values(ReikiMode).includes(mode)) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    const app = draft.reikiApplications.find((item) => item.id === applicationId);
    if (!app) return draft;
    app.mode = mode;
    app.updatedAt = store.nowIso();
    return draft;
  });
}