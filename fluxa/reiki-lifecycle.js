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

export function activeReikiApplication(state) {
  return (state.reikiApplications || []).find((item) => ['RUNNING','PAUSED'].includes(item.status)) || null;
}

export function cancelReikiApplication(store, applicationId, reason = '') {
  const state = store.getState();
  const application = (state.reikiApplications || []).find((item) => item.id === applicationId && ['RUNNING','PAUSED'].includes(item.status));
  if (!application) throw new Error('Aplicação de Reiki não disponível para cancelamento.');
  const now = store.nowIso();
  store.setState((current) => {
    const draft = structuredClone(current);
    const app = draft.reikiApplications.find((item) => item.id === applicationId);
    if (app.status === 'RUNNING') {
      const interval = [...(app.intervals || [])].reverse().find((item) => !item.endedAt);
      if (interval) interval.endedAt = now;
    }
    app.status = 'CANCELED';
    app.canceledAt = now;
    app.endedAt = now;
    app.cancelReason = String(reason || '').trim() || null;
    app.updatedAt = now;
    addEvent(store, draft, {
      eventType: 'REIKI_CANCELED',
      entityType: 'ReikiApplication',
      entityId: app.id,
      sessionId: app.sessionId,
      assistedEntityId: app.assistedEntityId,
      metadata: { reason: app.cancelReason, mode: app.mode || null, outsideSession: !app.sessionId }
    });
    return draft;
  });
  return store.getState().reikiApplications.find((item) => item.id === applicationId);
}
