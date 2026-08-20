import { EventType, TreatmentStatus } from './domain.js';
import { validateAssistedInput } from './backlog.js';

export const RemainingEventType = Object.freeze({
  COMPONENT_REVIEWED: 'COMPONENT_REVIEWED',
  COMPONENT_DISMANTLED: 'COMPONENT_DISMANTLED',
  ASSISTED_UPDATED: 'ASSISTED_UPDATED',
  ASSISTED_ARCHIVED: 'ASSISTED_ARCHIVED'
});

function addEvent(store, draft, input) {
  const event = {
    id: store.makeId('evt'),
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionId: input.sessionId || null,
    assistedEntityId: input.assistedEntityId || null,
    occurredAt: input.occurredAt || store.nowIso(),
    createdAt: store.nowIso(),
    metadata: input.metadata || {}
  };
  draft.events.push(event);
  return event;
}

function requireOpenSession(state, sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Esta ação exige uma sessão aberta.');
  return session;
}

export function componentReviewAvailable(component, now = Date.now()) {
  return Boolean(
    component &&
    component.status === TreatmentStatus.IN_PROGRESS &&
    component.expectedEndAt &&
    new Date(component.expectedEndAt).getTime() <= now
  );
}

export function recordComponentDismantlingReview(store, input) {
  const state = store.getState();
  requireOpenSession(state, input.sessionId);
  const component = state.treatmentComponents.find((item) => item.id === input.componentId);
  if (!component) throw new Error('Componente não encontrado.');
  if (component.status !== TreatmentStatus.IN_PROGRESS) throw new Error('Este componente não está disponível para revisão.');
  const treatment = state.treatments.find((item) => item.id === component.treatmentId);
  if (!treatment || treatment.status !== TreatmentStatus.IN_PROGRESS) throw new Error('O tratamento não está em andamento.');

  const verifiedComplete = Boolean(input.verifiedComplete);
  const permissionToDismantle = Boolean(input.permissionToDismantle);
  const now = store.nowIso();
  const review = {
    id: store.makeId('crev'),
    treatmentId: treatment.id,
    componentId: component.id,
    sessionId: input.sessionId,
    assistedEntityId: treatment.assistedEntityId,
    verifiedComplete,
    permissionToDismantle,
    notes: input.notes?.trim() || null,
    reviewedAt: now,
    createdAt: now
  };

  store.setState((current) => {
    const draft = structuredClone(current);
    if (!Array.isArray(draft.componentReviews)) draft.componentReviews = [];
    draft.componentReviews.push(review);
    const target = draft.treatmentComponents.find((item) => item.id === component.id);
    addEvent(store, draft, {
      eventType: RemainingEventType.COMPONENT_REVIEWED,
      entityType: 'TreatmentComponentReview',
      entityId: review.id,
      sessionId: input.sessionId,
      assistedEntityId: treatment.assistedEntityId,
      metadata: {
        treatmentId: treatment.id,
        componentId: component.id,
        componentName: component.name,
        verifiedComplete,
        permissionToDismantle
      }
    });

    if (verifiedComplete && permissionToDismantle) {
      target.status = TreatmentStatus.COMPLETED;
      target.completedAt = now;
      target.dismantledAt = now;
      target.updatedAt = now;
      addEvent(store, draft, {
        eventType: RemainingEventType.COMPONENT_DISMANTLED,
        entityType: 'TreatmentComponent',
        entityId: target.id,
        sessionId: input.sessionId,
        assistedEntityId: treatment.assistedEntityId,
        metadata: { treatmentId: treatment.id, name: target.name }
      });
    }
    return draft;
  });
  return review;
}

export function treatmentComponentResolution(state, treatmentId) {
  const components = state.treatmentComponents.filter((item) => item.treatmentId === treatmentId);
  const unresolved = components.filter((item) => [TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  const resolved = components.filter((item) => ['COMPLETED', 'STOPPED', 'REPLACED'].includes(item.status));
  return {
    total: components.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    readyForFinalAssessment: components.length > 0 && unresolved.length === 0
  };
}

export function updateAssistedEntity(store, assistedEntityId, input) {
  validateAssistedInput(input);
  const state = store.getState();
  const existing = state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
  if (!existing) throw new Error('Assistido não encontrado.');
  const now = store.nowIso();

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.assistedEntities.find((item) => item.id === assistedEntityId);
    const before = {
      type: target.type,
      displayName: target.displayName,
      birthDate: target.birthDate || null,
      address: target.address || null,
      identifier: target.identifier || null,
      details: target.details || null,
      members: structuredClone(target.members || [])
    };
    target.type = input.type;
    target.displayName = input.displayName.trim();
    target.birthDate = input.birthDate || null;
    target.address = input.address?.trim() || null;
    target.identifier = input.identifier?.trim() || null;
    target.details = input.details?.trim() || null;
    target.members = Array.isArray(input.members) ? structuredClone(input.members) : [];
    target.updatedAt = now;
    addEvent(store, draft, {
      eventType: RemainingEventType.ASSISTED_UPDATED,
      entityType: 'AssistedEntity',
      entityId: target.id,
      assistedEntityId: target.id,
      metadata: { before, displayName: target.displayName, type: target.type }
    });
    return draft;
  });
}

export function archiveAssistedEntity(store, assistedEntityId, reason = '') {
  const state = store.getState();
  const assisted = state.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
  if (!assisted) throw new Error('Assistido não encontrado.');
  const activeTreatment = state.treatments.some((item) => item.assistedEntityId === assistedEntityId && [TreatmentStatus.PLANNED, TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status));
  const openInvestigation = state.investigations.some((item) => item.assistedEntityId === assistedEntityId && item.status === 'IN_PROGRESS');
  const activeReiki = state.reikiApplications.some((item) => item.assistedEntityId === assistedEntityId && ['RUNNING', 'PAUSED'].includes(item.status));
  if (activeTreatment || openInvestigation || activeReiki) {
    throw new Error('Conclua ou resolva trabalhos ativos antes de arquivar este assistido.');
  }

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.assistedEntities.find((item) => item.id === assistedEntityId);
    const now = store.nowIso();
    target.archivedAt = now;
    target.updatedAt = now;
    draft.sessions.filter((item) => item.status === 'OPEN' && item.currentAssistedEntityId === assistedEntityId)
      .forEach((item) => { item.currentAssistedEntityId = null; item.updatedAt = now; });
    addEvent(store, draft, {
      eventType: RemainingEventType.ASSISTED_ARCHIVED,
      entityType: 'AssistedEntity',
      entityId: target.id,
      assistedEntityId: target.id,
      metadata: { displayName: target.displayName, reason: reason.trim() || null }
    });
    return draft;
  });
}

export function canRunFinalAssessment(state, treatmentId) {
  return treatmentComponentResolution(state, treatmentId).readyForFinalAssessment;
}
