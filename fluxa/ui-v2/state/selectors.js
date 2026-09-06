import { getOpenSession, latestPreparation, TreatmentStatus } from '../../domain.js';
import { hawkinsBaseline } from '../../hawkins-measurement.js';
import { componentReviewAvailable, treatmentComponentResolution } from '../../remaining.js';
import { treatmentItemView } from '../../treatment-item-graphs.js';
import { isReikiEnabled } from '../../reiki-modality.js';
import { ReikiModeLabel, reikiElapsedSecondsFlexible } from '../../reiki-flex.js';

function newest(items = [], key = 'updatedAt') {
  return [...items].sort((a, b) => String(b?.[key] || b?.createdAt || '').localeCompare(String(a?.[key] || a?.createdAt || '')))[0] || null;
}

function activeAssisted(state) {
  return (state.assistedEntities || []).filter((item) => !item.archivedAt);
}

function preparationModel(run) {
  if (!run) {
    return {
      runId: null,
      step: 1,
      total: 4,
      stepKey: 'breathing',
      frequency: '',
      frequencyValid: false,
      protection: '',
      permission: '',
    };
  }
  const steps = run.steps || [];
  const firstIncomplete = steps.findIndex((step) => !step.completed);
  const step = firstIncomplete >= 0 ? firstIncomplete + 1 : 4;
  const stepKey = firstIncomplete >= 0 ? steps[firstIncomplete]?.key : 'permission';
  const hertz = Number(run.frequencyMeasurement?.hertz ?? run.frequencyMeasurement?.value ?? 0);
  const protection = run.protection?.toolSnapshots?.map((item) => item.name).filter(Boolean).join(', ')
    || run.protection?.notes
    || '';
  return {
    runId: run.id,
    step,
    total: Math.max(steps.length, 4),
    stepKey,
    frequency: Number.isFinite(hertz) && hertz > 0 ? hertz : '',
    frequencyValid: Number.isFinite(hertz) && hertz >= 400,
    protection,
    permission: run.permissionNotes || '',
  };
}

function latestSessionInvestigation(state, sessionId, assistedId, status) {
  if (!sessionId || !assistedId) return null;
  return newest((state.investigations || []).filter((item) => (
    item.currentSessionId === sessionId
    && item.assistedEntityId === assistedId
    && (!status || item.status === status)
  )));
}

function pendingInvestigationFindings(state, investigation) {
  if (!investigation || investigation.status !== 'COMPLETED') return [];
  // Any persisted finding record means that positive answer was reviewed. IDENTIFIED/TREATED
  // findings continue into treatment; DISMISSED findings intentionally stay out of the queue.
  const reviewed = new Set((state.findings || [])
    .filter((item) => item.investigationId === investigation.id)
    .map((item) => item.sourceQuestionId));
  return (investigation.answers || [])
    .filter((answer) => answer.answer === 'YES' && !reviewed.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      title: answer.questionTextSnapshot,
      selected: true,
    }));
}

export function pendingSessionFindingBatch(state, sessionId, assistedId) {
  if (!sessionId || !assistedId) return { investigation: null, findings: [] };
  const completed = (state.investigations || [])
    .filter((item) => item.currentSessionId === sessionId && item.assistedEntityId === assistedId && item.status === 'COMPLETED')
    .sort((a, b) => String(a.completedAt || a.updatedAt || a.startedAt || '').localeCompare(String(b.completedAt || b.updatedAt || b.startedAt || '')));
  for (const investigation of completed) {
    const findings = pendingInvestigationFindings(state, investigation);
    if (findings.length) return { investigation, findings };
  }
  return { investigation: null, findings: [] };
}

function availableTreatmentFindings(state, assistedId) {
  if (!assistedId) return [];
  const linked = new Set((state.treatments || [])
    .filter((treatment) => treatment.assistedEntityId === assistedId && treatment.status !== TreatmentStatus.COMPLETED)
    .flatMap((treatment) => treatment.findingIds || []));
  return (state.findings || [])
    .filter((item) => item.assistedEntityId === assistedId && item.status === 'IDENTIFIED' && !linked.has(item.id))
    .map((item) => ({ id: item.id, title: item.title, investigationId: item.investigationId }));
}

function treatmentCounts(state, session, assistedId) {
  if (!session || !assistedId) return { active: 0, touched: 0 };
  const current = (state.treatments || []).filter((item) => item.assistedEntityId === assistedId);
  const currentIds = new Set(current.map((item) => item.id));
  const active = current.filter((item) => [TreatmentStatus.PLANNED, TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED].includes(item.status)).length;
  const touchedIds = new Set((state.events || [])
    .filter((event) => event.sessionId === session.id && event.entityType === 'Treatment' && currentIds.has(event.entityId))
    .map((event) => event.entityId));
  return { active, touched: touchedIds.size };
}

function modalityOptions(state) {
  const labels = {
    REIKI: 'Aplicação de Reiki',
    BACH_FLOWERS: 'Florais de Bach',
    CRYSTALS: 'Cristais',
    RADIONIC_TABLE: 'Mesa radiônica',
  };
  const settings = state.settings?.therapeuticModalities || {};
  const enabled = Array.isArray(settings.enabled) ? settings.enabled : [];
  const custom = Array.isArray(settings.custom) ? settings.custom : [];
  return [
    { id: 'RADIESTHESIA', label: 'Radiestesia', base: true },
    ...enabled.map((id) => ({ id, label: labels[id] || id, base: false })),
    ...custom.map((label, index) => ({ id: `CUSTOM_${index}`, label: String(label), base: false })),
  ];
}

function componentModel(component) {
  const item = treatmentItemView(component);
  const graphCount = item.commands.reduce((sum, command) => sum + (command.graphApplications || []).length, 0);
  const now = Date.now();
  const due = Boolean(component.expectedEndAt && new Date(component.expectedEndAt).getTime() <= now);
  const manualReview = component.status === TreatmentStatus.IN_PROGRESS && !component.expectedEndAt;
  return {
    id: component.id,
    name: item.itemLabel || component.name,
    status: component.status,
    expectedEndAt: component.expectedEndAt || null,
    due,
    manualReview,
    reviewable: componentReviewAvailable(component, now),
    commands: item.commands.map((command) => ({
      id: command.id,
      text: command.text,
      graphs: (command.graphApplications || []).map((graph) => ({
        id: graph.id,
        name: graph.graphName,
        expectedEndAt: graph.expectedEndAt || null,
        noDuration: Boolean(graph.noDuration),
      })),
    })),
    commandCount: item.commands.length,
    graphCount,
  };
}

function treatmentModels(state, assistedId) {
  if (!assistedId) return [];
  return (state.treatments || [])
    .filter((treatment) => treatment.assistedEntityId === assistedId)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .map((treatment) => {
      const components = (state.treatmentComponents || [])
        .filter((component) => component.treatmentId === treatment.id)
        .map(componentModel);
      const resolution = treatmentComponentResolution(state, treatment.id);
      const reviewableCount = components.filter((component) => component.reviewable).length;
      let primaryAction = 'workspace';
      let primaryLabel = 'Ver tratamento';
      if (treatment.status === TreatmentStatus.PLANNED) {
        primaryAction = 'start';
        primaryLabel = 'Iniciar';
      } else if (treatment.status === TreatmentStatus.INTERRUPTED) {
        primaryAction = 'resume';
        primaryLabel = 'Retomar';
      } else if (treatment.status === TreatmentStatus.IN_PROGRESS && resolution.readyForFinalAssessment) {
        primaryAction = 'final';
        primaryLabel = 'Realizar avaliação final';
      } else if (treatment.status === TreatmentStatus.IN_PROGRESS && reviewableCount) {
        primaryAction = 'review';
        primaryLabel = 'Revisar';
      }
      return {
        id: treatment.id,
        title: treatment.title,
        objective: treatment.therapeuticObjective || treatment.planningNotes || '',
        status: treatment.status,
        startedAt: treatment.startedAt || null,
        plannedAt: treatment.plannedAt || null,
        completedAt: treatment.completedAt || null,
        modalities: Array.isArray(treatment.modalitySnapshots) ? treatment.modalitySnapshots : [{ id: 'RADIESTHESIA', label: 'Radiestesia' }],
        findingIds: treatment.findingIds || [],
        components,
        total: resolution.total,
        resolved: resolution.resolved,
        unresolved: resolution.unresolved,
        readyForFinalAssessment: resolution.readyForFinalAssessment,
        reviewableCount,
        primaryAction,
        primaryLabel,
      };
    });
}

function currentReikiModel(state, session, assistedId) {
  const active = (state.reikiApplications || []).find((item) => ['RUNNING', 'PAUSED'].includes(item.status));
  if (!active) return null;
  const assisted = activeAssisted(state).find((item) => item.id === active.assistedEntityId);
  return {
    id: active.id,
    sessionId: active.sessionId || null,
    assistedEntityId: active.assistedEntityId,
    assistedName: assisted?.displayName || 'Assistido',
    belongsToCurrentSession: Boolean(session && active.sessionId === session.id),
    belongsToCurrentAssisted: Boolean(assistedId && active.assistedEntityId === assistedId),
    status: active.status,
    mode: active.mode || 'OTHER',
    modeLabel: ReikiModeLabel[active.mode] || 'Outro',
    elapsedSeconds: reikiElapsedSecondsFlexible(active),
    startedAt: active.startedAt,
  };
}

export function nextRecommendation({ session, prepared, assisted, baseline, reiki, treatments, openInvestigation, pendingFindings, treatmentFindings }) {
  if (!session) return {
    code: 'START_SESSION',
    label: 'Iniciar sessão',
    reason: 'Comece o atendimento. O Fluxa vai conduzir preparação, Assistido e próximos passos.',
  };
  if (!prepared) return {
    code: 'PREPARATION',
    label: 'Continuar preparação',
    reason: 'Conclua a preparação do terapeuta antes de iniciar o atendimento.',
  };
  if (reiki?.belongsToCurrentSession) {
    if (!reiki.belongsToCurrentAssisted) return {
      code: 'REIKI_CONTEXT',
      assistedEntityId: reiki.assistedEntityId,
      label: `Voltar para ${reiki.assistedName}`,
      reason: `Há uma aplicação de Reiki ${reiki.status === 'PAUSED' ? 'pausada' : 'em andamento'} vinculada a ${reiki.assistedName}. Restaure esse contexto para continuar com segurança.`,
    };
    return {
      code: 'REIKI_ACTIVE',
      label: reiki.status === 'PAUSED' ? 'Retomar Reiki' : 'Acompanhar Reiki',
      reason: `${reiki.assistedName} · ${reiki.modeLabel} · aplicação ${reiki.status === 'PAUSED' ? 'pausada' : 'em andamento'}.`,
    };
  }
  if (!assisted) return {
    code: 'SELECT_ASSISTED',
    label: 'Selecionar Assistido',
    reason: 'Defina quem está sendo atendido nesta etapa da sessão.',
  };
  if (!baseline) return {
    code: 'HAWKINS',
    label: 'Registrar Hawkins inicial',
    reason: `Registre a frequência inicial de ${assisted.displayName} antes de investigar ou tratar.`,
  };
  // Once an investigation starts, keep that workflow contiguous. A due treatment should not
  // steal the next action between triage questions or between triage completion and findings.
  if (openInvestigation) {
    const total = openInvestigation.protocolSnapshot?.questions?.length || 0;
    return {
      code: 'TRIAGE',
      label: 'Continuar investigação',
      reason: `${openInvestigation.protocolSnapshot?.name || 'Investigação'} · pergunta ${Math.min(openInvestigation.currentIndex + 1, total)} de ${total}.`,
    };
  }
  if (pendingFindings.length) return {
    code: 'FINDINGS',
    label: 'Revisar achados',
    reason: `${pendingFindings.length} achado${pendingFindings.length === 1 ? '' : 's'} aguardando confirmação para o próximo passo.`,
  };
  const finalReady = treatments.find((item) => item.status === TreatmentStatus.IN_PROGRESS && item.readyForFinalAssessment);
  if (finalReady) return {
    code: 'TREATMENT_FINAL',
    treatmentId: finalReady.id,
    label: 'Realizar avaliação final',
    reason: `${finalReady.title} · todos os ${finalReady.total} componentes foram resolvidos.`,
  };
  const reviewReady = treatments.find((item) => item.status === TreatmentStatus.IN_PROGRESS && item.reviewableCount > 0);
  if (reviewReady) return {
    code: 'TREATMENT_REVIEW',
    treatmentId: reviewReady.id,
    label: 'Revisar tratamento',
    reason: `${reviewReady.title} · ${reviewReady.reviewableCount} componente${reviewReady.reviewableCount === 1 ? '' : 's'} pronto${reviewReady.reviewableCount === 1 ? '' : 's'} para revisão.`,
  };
  const activeTreatment = treatments.find((item) => [TreatmentStatus.IN_PROGRESS, TreatmentStatus.INTERRUPTED, TreatmentStatus.PLANNED].includes(item.status));
  if (activeTreatment) return {
    code: 'TREATMENT_WORKSPACE',
    treatmentId: activeTreatment.id,
    label: activeTreatment.primaryLabel,
    reason: `${activeTreatment.title} · ${activeTreatment.resolved} de ${activeTreatment.total} componentes resolvidos.`,
  };
  if (treatmentFindings.length) return {
    code: 'COMPOSE_TREATMENT',
    label: 'Compor tratamento',
    reason: `${treatmentFindings.length} achado${treatmentFindings.length === 1 ? '' : 's'} confirmado${treatmentFindings.length === 1 ? '' : 's'} aguardando tratamento.`,
  };
  return {
    code: 'INVESTIGATE',
    label: 'Iniciar investigação',
    reason: 'Os pré-requisitos estão concluídos. Você pode investigar, tratar ou iniciar Reiki.',
  };
}

export function deriveV2Model(state) {
  const session = getOpenSession(state);
  const prepRun = session ? latestPreparation(state, session.id) : null;
  const prepared = prepRun?.status === 'COMPLETED';
  const assisted = session?.currentAssistedEntityId
    ? activeAssisted(state).find((item) => item.id === session.currentAssistedEntityId) || null
    : null;
  const baseline = prepared && assisted ? hawkinsBaseline(state, session.id, assisted.id) : null;
  const openInvestigation = latestSessionInvestigation(state, session?.id, assisted?.id, 'IN_PROGRESS');
  const pendingBatch = pendingSessionFindingBatch(state, session?.id, assisted?.id);
  const pendingFindings = pendingBatch.findings;
  const treatmentFindings = availableTreatmentFindings(state, assisted?.id);
  const treatments = treatmentModels(state, assisted?.id);
  const reiki = currentReikiModel(state, session, assisted?.id);
  const recommendation = nextRecommendation({ session, prepared, assisted, baseline, reiki, treatments, openInvestigation, pendingFindings, treatmentFindings });
  const treatment = treatmentCounts(state, session, assisted?.id);
  const investigationCount = session && assisted
    ? (state.investigations || []).filter((item) => item.currentSessionId === session.id && item.assistedEntityId === assisted.id).length
    : 0;

  return {
    source: 'live',
    title: session ? (assisted?.displayName || 'Sessão em andamento') : 'Seu próximo atendimento começa aqui',
    description: session
      ? 'Contexto, pendências e próxima ação em uma única linha de trabalho.'
      : 'Inicie uma sessão quando estiver pronta. O Fluxa conduz o fluxo passo a passo.',
    sessionOpen: Boolean(session),
    sessionId: session?.id || null,
    sessionStartedAt: session?.startedAt || null,
    prepared,
    assistedSelected: Boolean(assisted),
    assistedId: assisted?.id || null,
    assistedName: assisted?.displayName || '',
    assistedOptions: activeAssisted(state)
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .map((item) => ({ id: item.id, name: item.displayName, type: item.type })),
    hawkinsReady: Boolean(baseline),
    hawkins: baseline?.hertz || null,
    hawkinsAssessmentId: baseline?.id || null,
    nextActionCode: recommendation.code,
    nextActionTreatmentId: recommendation.treatmentId || null,
    nextActionAssistedId: recommendation.assistedEntityId || null,
    nextAction: recommendation.label,
    nextReason: recommendation.reason,
    investigations: investigationCount,
    treatmentsWorked: treatment.touched,
    treatments: treatments,
    treatmentCount: treatment.touched,
    activeTreatments: treatment.active,
    treatmentFindings,
    modalityOptions: modalityOptions(state),
    graphOptions: (state.tools || []).filter((tool) => !tool.archivedAt && tool.status !== 'ARCHIVED').map((tool) => tool.name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    reikiEnabled: isReikiEnabled(state),
    reiki,
    preparation: preparationModel(prepRun),
    investigation: openInvestigation ? {
      id: openInvestigation.id,
      name: openInvestigation.protocolSnapshot?.name || 'Investigação',
      currentIndex: openInvestigation.currentIndex,
      total: openInvestigation.protocolSnapshot?.questions?.length || 0,
      question: openInvestigation.protocolSnapshot?.questions?.[openInvestigation.currentIndex]?.text || '',
      answers: structuredClone(openInvestigation.answers || []),
    } : null,
    findings: pendingFindings,
    findingsInvestigationId: pendingFindings.length ? pendingBatch.investigation?.id || null : null,
  };
}
