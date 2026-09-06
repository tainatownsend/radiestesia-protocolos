const TREATMENT_EVENT_LABELS = Object.freeze({
  TREATMENT_CREATED: 'Tratamento {title} criado',
  TREATMENT_STARTED: 'Tratamento {title} iniciado',
  TREATMENT_RESUMED: 'Tratamento {title} retomado',
  TREATMENT_INTERRUPTED: 'Tratamento {title} interrompido',
  TREATMENT_REVIEWED: 'Tratamento {title} revisado',
  TREATMENT_FINAL_ASSESSMENT: 'Avaliação final de {title} registrada',
  TREATMENT_COMPLETED: 'Tratamento {title} concluído',
});

const EVENT_LABELS = Object.freeze({
  SESSION_STARTED: 'Sessão iniciada',
  SESSION_CLOSED: 'Sessão encerrada',
  PREPARATION_STARTED: 'Preparação iniciada',
  PREPARATION_COMPLETED: 'Preparação concluída',
  CLOSING_COMPLETED: 'Procedimento de encerramento concluído',
  SESSION_CLOSE_CORRECTED: 'Horário de encerramento corrigido',
  SESSION_ASSISTED_SELECTED: 'Assistido selecionado',
  INVESTIGATION_STARTED: 'Investigação iniciada',
  INVESTIGATION_RESUMED: 'Investigação retomada',
  INVESTIGATION_COMPLETED: 'Investigação concluída',
  FINDING_IDENTIFIED: 'Achado confirmado',
  COMPONENT_PLANNED: 'Componente planejado',
  COMPONENT_STARTED: 'Componente iniciado',
  COMPONENT_COMPLETED: 'Componente concluído',
  COMPONENT_ADDED: 'Componente adicionado',
  COMPONENT_STOPPED: 'Componente encerrado',
  COMPONENT_REPLACED: 'Componente substituído',
  COMPONENT_RESCHEDULED: 'Prazo do componente ajustado',
  COMPONENT_REVIEWED: 'Componente revisado',
  COMPONENT_DISMANTLED: 'Componente desmontado',
  ASSESSMENT_RECORDED: 'Avaliação registrada',
  REIKI_STARTED: 'Reiki iniciado',
  REIKI_PAUSED: 'Reiki pausado',
  REIKI_RESUMED: 'Reiki retomado',
  REIKI_COMPLETED: 'Reiki concluído',
  REIKI_CANCELED: 'Reiki cancelado',
  NOTE_CREATED: 'Anotação registrada',
});

const TREATMENT_PRIORITY = Object.freeze({
  TREATMENT_COMPLETED: 100,
  TREATMENT_FINAL_ASSESSMENT: 90,
  TREATMENT_REVIEWED: 80,
  COMPONENT_DISMANTLED: 75,
  COMPONENT_COMPLETED: 70,
  COMPONENT_REVIEWED: 65,
  TREATMENT_RESUMED: 60,
  TREATMENT_INTERRUPTED: 55,
  TREATMENT_STARTED: 50,
  COMPONENT_STARTED: 45,
  TREATMENT_CREATED: 40,
  COMPONENT_PLANNED: 30,
});

const INVESTIGATION_PRIORITY = Object.freeze({
  INVESTIGATION_COMPLETED: 30,
  INVESTIGATION_RESUMED: 20,
  INVESTIGATION_STARTED: 10,
});

const REIKI_PRIORITY = Object.freeze({
  REIKI_COMPLETED: 50,
  REIKI_CANCELED: 45,
  REIKI_PAUSED: 40,
  REIKI_RESUMED: 30,
  REIKI_STARTED: 20,
});

function byTimeAsc(a, b) {
  return String(a?.occurredAt || a?.createdAt || '').localeCompare(String(b?.occurredAt || b?.createdAt || ''));
}

function byTimeDesc(a, b) {
  return String(b?.startedAt || b?.createdAt || '').localeCompare(String(a?.startedAt || a?.createdAt || ''));
}

function assistedName(state, id) {
  return state.assistedEntities?.find((item) => item.id === id)?.displayName || 'Assistido';
}

function treatmentIdForEvent(state, event) {
  if (event.entityType === 'Treatment') return event.entityId;
  if (event.metadata?.treatmentId) return event.metadata.treatmentId;
  const component = state.treatmentComponents?.find((item) => item.id === event.entityId);
  return component?.treatmentId || null;
}

function sessionAssistedIds(state, session) {
  const ids = new Set();
  if (session?.currentAssistedEntityId) ids.add(session.currentAssistedEntityId);
  for (const event of state.events || []) {
    if (event.sessionId === session.id && event.assistedEntityId) ids.add(event.assistedEntityId);
  }
  for (const investigation of state.investigations || []) {
    if (investigation.currentSessionId === session.id && investigation.assistedEntityId) ids.add(investigation.assistedEntityId);
  }
  for (const reiki of state.reikiApplications || []) {
    if (reiki.sessionId === session.id && reiki.assistedEntityId) ids.add(reiki.assistedEntityId);
  }
  for (const treatment of state.treatments || []) {
    if (treatment.plannedInSessionId === session.id && treatment.assistedEntityId) ids.add(treatment.assistedEntityId);
  }
  return [...ids];
}

function touchedTreatmentIds(state, sessionId) {
  const ids = new Set();
  for (const event of state.events || []) {
    if (event.sessionId !== sessionId) continue;
    const treatmentId = treatmentIdForEvent(state, event);
    if (treatmentId) ids.add(treatmentId);
  }
  for (const treatment of state.treatments || []) {
    if (treatment.plannedInSessionId === sessionId) ids.add(treatment.id);
  }
  return [...ids];
}

function sessionCounts(state, session) {
  const investigations = (state.investigations || []).filter((item) => item.currentSessionId === session.id);
  const investigationOpened = investigations.length;
  const investigationCompleted = investigations.filter((item) => item.status === 'COMPLETED').length;
  const treatmentIds = touchedTreatmentIds(state, session.id);
  const treatmentList = treatmentIds.map((id) => state.treatments?.find((item) => item.id === id)).filter(Boolean);
  const longitudinal = treatmentList.filter((item) => ['PLANNED', 'IN_PROGRESS', 'INTERRUPTED'].includes(item.status));
  const investigationIds = new Set(investigations.map((item) => item.id));
  const findings = (state.findings || []).filter((item) => investigationIds.has(item.investigationId) && item.status !== 'DISMISSED');
  const reviewedAnswers = new Set((state.findings || [])
    .filter((item) => investigationIds.has(item.investigationId) && item.sourceQuestionId)
    .map((item) => `${item.investigationId}:${item.sourceQuestionId}`));
  const pendingFindingCount = investigations.reduce((total, investigation) => total + (investigation.answers || [])
    .filter((answer) => answer.answer === 'YES' && !reviewedAnswers.has(`${investigation.id}:${answer.questionId}`)).length, 0);
  const notes = (state.events || []).filter((event) => event.sessionId === session.id && event.eventType === 'NOTE_CREATED');
  const activeReiki = (state.reikiApplications || []).find((item) => item.sessionId === session.id && ['RUNNING', 'PAUSED'].includes(item.status)) || null;
  const assistedIds = sessionAssistedIds(state, session);
  return {
    assistedIds,
    assistedNames: assistedIds.map((id) => assistedName(state, id)),
    investigationOpened,
    investigationCompleted,
    pendingFindingCount,
    treatmentsWorked: treatmentList.length,
    treatmentIds,
    findings: findings.length,
    notes: notes.length,
    longitudinal: longitudinal.map((item) => ({ id: item.id, title: item.title, status: item.status })),
    activeReiki: activeReiki ? {
      id: activeReiki.id,
      assistedEntityId: activeReiki.assistedEntityId,
      assistedName: assistedName(state, activeReiki.assistedEntityId),
      status: activeReiki.status,
    } : null,
  };
}

function highestEvent(events, priorities = {}) {
  return [...events].sort((a, b) => (priorities[b.eventType] || 0) - (priorities[a.eventType] || 0) || byTimeAsc(b, a))[0] || null;
}

function rawAuditEvent(event) {
  const label = EVENT_LABELS[event.eventType]
    || String(event.eventType || 'Registro').toLocaleLowerCase('pt-BR').replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase());
  const detail = event.metadata?.title
    || event.metadata?.protocolName
    || event.metadata?.componentName
    || event.metadata?.name
    || event.metadata?.body
    || '';
  return { id: event.id, type: event.eventType, label, detail, occurredAt: event.occurredAt };
}

function treatmentGroup(state, treatmentId, events) {
  const treatment = state.treatments?.find((item) => item.id === treatmentId);
  const title = treatment?.title || 'tratamento';
  const lead = highestEvent(events, TREATMENT_PRIORITY) || events.at(-1);
  const template = TREATMENT_EVENT_LABELS[lead?.eventType] || 'Tratamento {title} atualizado';
  const components = (state.treatmentComponents || []).filter((item) => item.treatmentId === treatmentId);
  const resolved = components.filter((item) => ['COMPLETED', 'STOPPED', 'REPLACED'].includes(item.status)).length;
  return {
    id: `treatment:${treatmentId}`,
    kind: 'treatment',
    title: template.replace('{title}', title),
    detail: components.length ? `${resolved} de ${components.length} componentes resolvidos` : '',
    occurredAt: lead?.occurredAt || events.at(-1)?.occurredAt,
    relatedCount: Math.max(0, events.length - 1),
    audit: events.map(rawAuditEvent),
    treatmentId,
  };
}

function plannedTreatmentGroup(state, treatment) {
  const components = (state.treatmentComponents || []).filter((item) => item.treatmentId === treatment.id);
  const occurredAt = treatment.plannedAt || treatment.createdAt || treatment.updatedAt;
  return {
    id: `treatment-planned:${treatment.id}`,
    kind: 'treatment',
    title: `Tratamento ${treatment.title || 'sem nome'} planejado`,
    detail: components.length ? `${components.length} componente${components.length === 1 ? '' : 's'} preparado${components.length === 1 ? '' : 's'}` : 'Composição salva para iniciar depois',
    occurredAt,
    relatedCount: 0,
    audit: [{
      id: `planned:${treatment.id}`,
      type: 'TREATMENT_PLANNED',
      label: 'Tratamento planejado',
      detail: treatment.title || '',
      occurredAt,
    }],
    treatmentId: treatment.id,
  };
}

function investigationGroup(state, investigationId, events) {
  const investigation = state.investigations?.find((item) => item.id === investigationId);
  const lead = highestEvent(events, INVESTIGATION_PRIORITY) || events.at(-1);
  const label = EVENT_LABELS[lead?.eventType] || 'Investigação atualizada';
  const yesCount = (investigation?.answers || []).filter((item) => item.answer === 'YES').length;
  const protocol = investigation?.protocolSnapshot?.name || lead?.metadata?.protocolName || 'Investigação';
  return {
    id: `investigation:${investigationId}`,
    kind: 'investigation',
    title: `${label} · ${protocol}`,
    detail: investigation?.status === 'COMPLETED' ? `${yesCount} resposta${yesCount === 1 ? '' : 's'} positiva${yesCount === 1 ? '' : 's'}` : '',
    occurredAt: lead?.occurredAt || events.at(-1)?.occurredAt,
    relatedCount: Math.max(0, events.length - 1),
    audit: events.map(rawAuditEvent),
  };
}

function reikiGroup(state, reikiId, events) {
  const app = state.reikiApplications?.find((item) => item.id === reikiId);
  const lead = highestEvent(events, REIKI_PRIORITY) || events.at(-1);
  const label = EVENT_LABELS[lead?.eventType] || 'Reiki atualizado';
  const durationSeconds = Number(lead?.metadata?.durationSeconds);
  const duration = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? `${Math.round(durationSeconds / 60)} min` : '';
  const assisted = app?.assistedEntityId || lead?.assistedEntityId;
  return {
    id: `reiki:${reikiId}`,
    kind: 'reiki',
    title: label,
    detail: [assisted ? assistedName(state, assisted) : '', duration].filter(Boolean).join(' · '),
    occurredAt: lead?.occurredAt || events.at(-1)?.occurredAt,
    relatedCount: Math.max(0, events.length - 1),
    audit: events.map(rawAuditEvent),
  };
}

export function narrativeForSession(state, sessionId) {
  const sessionEvents = (state.events || []).filter((event) => event.sessionId === sessionId).sort(byTimeAsc);
  const groups = new Map();
  const singles = [];

  sessionEvents.forEach((event, index) => {
    const treatmentId = treatmentIdForEvent(state, event);
    if (treatmentId && (event.eventType?.startsWith('TREATMENT_') || event.eventType?.startsWith('COMPONENT_'))) {
      const key = `treatment:${treatmentId}`;
      if (!groups.has(key)) groups.set(key, { kind:'treatment', id:treatmentId, events:[] });
      groups.get(key).events.push(event);
      return;
    }
    if (event.eventType?.startsWith('INVESTIGATION_')) {
      const key = `investigation:${event.entityId}`;
      if (!groups.has(key)) groups.set(key, { kind:'investigation', id:event.entityId, events:[] });
      groups.get(key).events.push(event);
      return;
    }
    if (event.eventType?.startsWith('REIKI_')) {
      const key = `reiki:${event.entityId}`;
      if (!groups.has(key)) groups.set(key, { kind:'reiki', id:event.entityId, events:[] });
      groups.get(key).events.push(event);
      return;
    }
    const raw = rawAuditEvent(event);
    singles.push({
      id: raw.id || `event:${index}`,
      kind: 'event',
      title: raw.label,
      detail: raw.detail || (event.assistedEntityId ? assistedName(state, event.assistedEntityId) : ''),
      occurredAt: raw.occurredAt,
      relatedCount: 0,
      audit: [raw],
    });
  });

  const summarized = [...groups.values()].map((group) => {
    if (group.kind === 'treatment') return treatmentGroup(state, group.id, group.events);
    if (group.kind === 'investigation') return investigationGroup(state, group.id, group.events);
    return reikiGroup(state, group.id, group.events);
  });
  const groupedTreatmentIds = new Set([...groups.values()].filter((group) => group.kind === 'treatment').map((group) => group.id));
  const plannedOnly = (state.treatments || [])
    .filter((treatment) => treatment.plannedInSessionId === sessionId && !groupedTreatmentIds.has(treatment.id))
    .map((treatment) => plannedTreatmentGroup(state, treatment));
  return [...summarized, ...plannedOnly, ...singles].sort((a, b) => String(a.occurredAt || '').localeCompare(String(b.occurredAt || '')));
}

function sessionModel(state, session) {
  const counts = sessionCounts(state, session);
  return {
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    closedRecordedAt: session.closedRecordedAt || null,
    ...counts,
    narrative: narrativeForSession(state, session.id),
  };
}

export function deriveHistoryModel(state) {
  const sessions = [...(state.sessions || [])].sort(byTimeDesc).map((session) => sessionModel(state, session));
  const openSession = sessions.find((session) => session.status === 'OPEN') || null;
  return {
    historySessions: sessions,
    safeClose: openSession,
    latestClosedSession: sessions.find((session) => session.status === 'CLOSED') || null,
  };
}
