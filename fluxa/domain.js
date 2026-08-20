export const SessionStatus = Object.freeze({ OPEN: 'OPEN', CLOSED: 'CLOSED' });
export const AssistedType = Object.freeze({
  PERSON: 'PERSON',
  PET: 'PET',
  ENVIRONMENT: 'ENVIRONMENT',
  GROUP: 'GROUP',
  SITUATION: 'SITUATION',
  OTHER: 'OTHER'
});

export const EventType = Object.freeze({
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_CLOSED: 'SESSION_CLOSED',
  PREPARATION_STARTED: 'PREPARATION_STARTED',
  PREPARATION_COMPLETED: 'PREPARATION_COMPLETED',
  ASSISTED_CREATED: 'ASSISTED_CREATED',
  SESSION_ASSISTED_SELECTED: 'SESSION_ASSISTED_SELECTED',
  INVESTIGATION_STARTED: 'INVESTIGATION_STARTED',
  INVESTIGATION_COMPLETED: 'INVESTIGATION_COMPLETED',
  FINDING_IDENTIFIED: 'FINDING_IDENTIFIED',
  TREATMENT_CREATED: 'TREATMENT_CREATED',
  TREATMENT_STARTED: 'TREATMENT_STARTED',
  COMPONENT_STARTED: 'COMPONENT_STARTED',
  NOTE_CREATED: 'NOTE_CREATED'
});

export const PREPARATION_STEPS = Object.freeze([
  { key: 'breathing', label: 'Respiração e presença' },
  { key: 'frequency', label: 'Medir frequência vibracional' },
  { key: 'protection', label: 'Selecionar proteção' },
  { key: 'permission', label: 'Mantra de proteção e permissão' }
]);

export const MVP_PROTOCOL = Object.freeze({
  id: 'protocol_triagem_rapida',
  versionId: 'protocol_triagem_rapida_v1',
  version: 1,
  name: 'Triagem rápida',
  questions: [
    { id: 'q1', text: 'Existe algo prioritário que precisa ser investigado neste momento?' },
    { id: 'q2', text: 'Há algum fator relevante que esteja mantendo este desequilíbrio?' },
    { id: 'q3', text: 'É apropriado iniciar um tratamento para este tema agora?' }
  ]
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
  const session = state.sessions.find((item) => item.id === sessionId && item.status === SessionStatus.OPEN);
  if (!session) throw new Error('Esta ação exige uma sessão aberta.');
  return session;
}

export function getOpenSession(state) {
  return state.sessions.find((session) => session.status === SessionStatus.OPEN) || null;
}

export function startSession(store) {
  const current = store.getState();
  const existing = getOpenSession(current);
  if (existing) return existing;

  const session = {
    id: store.makeId('ses'),
    status: SessionStatus.OPEN,
    startedAt: store.nowIso(),
    endedAt: null,
    closedRecordedAt: null,
    currentAssistedEntityId: null,
    createdAt: store.nowIso(),
    updatedAt: store.nowIso()
  };

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.sessions.push(session);
    addEvent(store, draft, {
      eventType: EventType.SESSION_STARTED,
      entityType: 'Session',
      entityId: session.id,
      sessionId: session.id
    });
    return draft;
  });
  return session;
}

export function closeSession(store, sessionId, endedAt = store.nowIso()) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const session = draft.sessions.find((item) => item.id === sessionId);
    if (!session || session.status !== SessionStatus.OPEN) return draft;
    session.status = SessionStatus.CLOSED;
    session.endedAt = endedAt;
    session.closedRecordedAt = store.nowIso();
    session.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.SESSION_CLOSED,
      entityType: 'Session',
      entityId: session.id,
      sessionId: session.id,
      occurredAt: endedAt
    });
    return draft;
  });
}

export function startPreparation(store, sessionId) {
  requireOpenSession(store.getState(), sessionId);
  const run = {
    id: store.makeId('prep'),
    sessionId,
    status: 'IN_PROGRESS',
    startedAt: store.nowIso(),
    completedAt: null,
    steps: PREPARATION_STEPS.map((step) => ({ ...step, completed: false, completedAt: null }))
  };
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.preparationRuns.push(run);
    addEvent(store, draft, {
      eventType: EventType.PREPARATION_STARTED,
      entityType: 'PreparationRun',
      entityId: run.id,
      sessionId
    });
    return draft;
  });
  return run;
}

export function latestPreparation(state, sessionId) {
  return [...state.preparationRuns]
    .filter((run) => run.sessionId === sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null;
}

export function togglePreparationStep(store, runId, stepKey) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const run = draft.preparationRuns.find((item) => item.id === runId);
    if (!run || run.status === 'COMPLETED') return draft;
    const step = run.steps.find((item) => item.key === stepKey);
    if (!step) return draft;
    step.completed = !step.completed;
    step.completedAt = step.completed ? store.nowIso() : null;
    return draft;
  });
}

export function completePreparation(store, runId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const run = draft.preparationRuns.find((item) => item.id === runId);
    if (!run || !run.steps.every((step) => step.completed)) return draft;
    run.status = 'COMPLETED';
    run.completedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.PREPARATION_COMPLETED,
      entityType: 'PreparationRun',
      entityId: run.id,
      sessionId: run.sessionId
    });
    return draft;
  });
}

export function createAssistedEntity(store, input) {
  const entity = {
    id: store.makeId('ast'),
    type: input.type,
    displayName: input.displayName.trim(),
    birthDate: input.birthDate || null,
    address: input.address?.trim() || null,
    identifier: input.identifier?.trim() || null,
    details: input.details?.trim() || null,
    members: Array.isArray(input.members) ? input.members : [],
    createdAt: store.nowIso(),
    updatedAt: store.nowIso(),
    archivedAt: null
  };
  if (!entity.displayName) throw new Error('Nome do assistido é obrigatório.');

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.assistedEntities.push(entity);
    addEvent(store, draft, {
      eventType: EventType.ASSISTED_CREATED,
      entityType: 'AssistedEntity',
      entityId: entity.id,
      assistedEntityId: entity.id
    });
    return draft;
  });
  return entity;
}

export function selectAssistedForSession(store, sessionId, assistedEntityId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const session = draft.sessions.find((item) => item.id === sessionId);
    const assisted = draft.assistedEntities.find((item) => item.id === assistedEntityId && !item.archivedAt);
    if (!session || session.status !== SessionStatus.OPEN || !assisted) return draft;
    session.currentAssistedEntityId = assistedEntityId;
    session.updatedAt = store.nowIso();
    addEvent(store, draft, {
      eventType: EventType.SESSION_ASSISTED_SELECTED,
      entityType: 'Session',
      entityId: session.id,
      sessionId,
      assistedEntityId
    });
    return draft;
  });
}

export function startInvestigation(store, sessionId, assistedEntityId) {
  const state = store.getState();
  requireOpenSession(state, sessionId);
  const active = state.investigations.find((item) => item.sessionId === sessionId && item.assistedEntityId === assistedEntityId && item.status === 'IN_PROGRESS');
  if (active) return active;
  const investigation = {
    id: store.makeId('inv'),
    sessionId,
    assistedEntityId,
    protocolId: MVP_PROTOCOL.id,
    protocolVersionId: MVP_PROTOCOL.versionId,
    protocolSnapshot: MVP_PROTOCOL,
    status: 'IN_PROGRESS',
    currentIndex: 0,
    answers: [],
    startedAt: store.nowIso(),
    completedAt: null,
    updatedAt: store.nowIso()
  };
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.investigations.push(investigation);
    addEvent(store, draft, {
      eventType: EventType.INVESTIGATION_STARTED,
      entityType: 'Investigation', entityId: investigation.id, sessionId, assistedEntityId,
      metadata: { protocolName: MVP_PROTOCOL.name, protocolVersionId: MVP_PROTOCOL.versionId }
    });
    return draft;
  });
  return investigation;
}

export function answerInvestigation(store, investigationId, answer) {
  if (!['YES', 'NO'].includes(answer)) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    const investigation = draft.investigations.find((item) => item.id === investigationId);
    if (!investigation || investigation.status !== 'IN_PROGRESS') return draft;
    requireOpenSession(draft, investigation.sessionId);
    const question = investigation.protocolSnapshot.questions[investigation.currentIndex];
    const existing = investigation.answers.find((item) => item.questionId === question.id);
    if (existing) {
      existing.answer = answer;
      existing.answeredAt = store.nowIso();
    } else {
      investigation.answers.push({ questionId: question.id, questionTextSnapshot: question.text, answer, answeredAt: store.nowIso() });
    }
    if (investigation.currentIndex < investigation.protocolSnapshot.questions.length - 1) {
      investigation.currentIndex += 1;
    } else {
      investigation.status = 'COMPLETED';
      investigation.completedAt = store.nowIso();
      addEvent(store, draft, {
        eventType: EventType.INVESTIGATION_COMPLETED,
        entityType: 'Investigation', entityId: investigation.id,
        sessionId: investigation.sessionId, assistedEntityId: investigation.assistedEntityId,
        metadata: { protocolName: investigation.protocolSnapshot.name }
      });
    }
    investigation.updatedAt = store.nowIso();
    return draft;
  });
}

export function confirmFindings(store, investigationId, questionIds) {
  const created = [];
  store.setState((state) => {
    const draft = structuredClone(state);
    const investigation = draft.investigations.find((item) => item.id === investigationId);
    if (!investigation || investigation.status !== 'COMPLETED') return draft;
    requireOpenSession(draft, investigation.sessionId);
    for (const questionId of questionIds) {
      const answer = investigation.answers.find((item) => item.questionId === questionId && item.answer === 'YES');
      if (!answer) continue;
      const duplicate = draft.findings.find((item) => item.investigationId === investigationId && item.sourceQuestionId === questionId && item.status !== 'DISMISSED');
      if (duplicate) { created.push(duplicate); continue; }
      const finding = {
        id: store.makeId('find'),
        assistedEntityId: investigation.assistedEntityId,
        investigationId,
        sourceQuestionId: questionId,
        classification: 'FACTOR_RELEVANT',
        title: answer.questionTextSnapshot,
        status: 'IDENTIFIED',
        createdAt: store.nowIso()
      };
      draft.findings.push(finding);
      created.push(finding);
      addEvent(store, draft, {
        eventType: EventType.FINDING_IDENTIFIED,
        entityType: 'Finding', entityId: finding.id,
        sessionId: investigation.sessionId, assistedEntityId: investigation.assistedEntityId,
        metadata: { title: finding.title }
      });
    }
    return draft;
  });
  return created;
}

function addDuration(startedAt, value, unit) {
  const date = new Date(startedAt);
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'MINUTE') date.setMinutes(date.getMinutes() + n);
  if (unit === 'HOUR') date.setHours(date.getHours() + n);
  if (unit === 'DAY') date.setDate(date.getDate() + n);
  if (unit === 'WEEK') date.setDate(date.getDate() + (n * 7));
  if (unit === 'MONTH') date.setMonth(date.getMonth() + n);
  return date.toISOString();
}

export function createTreatment(store, input) {
  const state = store.getState();
  requireOpenSession(state, input.sessionId);
  const startedAt = store.nowIso();
  const treatment = {
    id: store.makeId('trt'),
    assistedEntityId: input.assistedEntityId,
    originSessionId: input.sessionId,
    findingIds: [...new Set(input.findingIds || [])],
    title: input.title?.trim() || 'Tratamento',
    status: 'IN_PROGRESS',
    startedAt,
    completedAt: null,
    interruptedAt: null,
    createdAt: store.nowIso(),
    updatedAt: store.nowIso()
  };
  const component = {
    id: store.makeId('cmp'),
    treatmentId: treatment.id,
    type: 'TOOL',
    name: input.componentName?.trim() || 'Componente terapêutico',
    instructions: input.instructions?.trim() || null,
    status: 'IN_PROGRESS',
    startedAt,
    durationValue: Number(input.durationValue) || null,
    durationUnit: input.durationUnit || null,
    expectedEndAt: addDuration(startedAt, input.durationValue, input.durationUnit),
    completedAt: null,
    interruptedAt: null,
    createdAt: store.nowIso(),
    updatedAt: store.nowIso()
  };

  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatments.push(treatment);
    draft.treatmentComponents.push(component);
    for (const findingId of treatment.findingIds) {
      const finding = draft.findings.find((item) => item.id === findingId);
      if (finding) finding.status = 'TREATED';
    }
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_CREATED,
      entityType: 'Treatment', entityId: treatment.id,
      sessionId: input.sessionId, assistedEntityId: input.assistedEntityId,
      metadata: { title: treatment.title }
    });
    addEvent(store, draft, {
      eventType: EventType.TREATMENT_STARTED,
      entityType: 'Treatment', entityId: treatment.id,
      sessionId: input.sessionId, assistedEntityId: input.assistedEntityId,
      metadata: { title: treatment.title }
    });
    addEvent(store, draft, {
      eventType: EventType.COMPONENT_STARTED,
      entityType: 'TreatmentComponent', entityId: component.id,
      sessionId: input.sessionId, assistedEntityId: input.assistedEntityId,
      metadata: { treatmentId: treatment.id, name: component.name, expectedEndAt: component.expectedEndAt }
    });
    return draft;
  });
  return { treatment, component };
}

export function addSessionNote(store, sessionId, assistedEntityId, body) {
  const text = body.trim();
  if (!text) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    addEvent(store, draft, {
      eventType: EventType.NOTE_CREATED,
      entityType: 'Note', entityId: store.makeId('note'), sessionId, assistedEntityId,
      metadata: { body: text }
    });
    return draft;
  });
}
