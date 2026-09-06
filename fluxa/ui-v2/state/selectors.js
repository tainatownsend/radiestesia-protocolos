import { getOpenSession, latestPreparation, TreatmentStatus } from '../../domain.js';
import { hawkinsBaseline } from '../../hawkins-measurement.js';

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
  const existing = new Set((state.findings || [])
    .filter((item) => item.investigationId === investigation.id && item.status !== 'DISMISSED')
    .map((item) => item.sourceQuestionId));
  return (investigation.answers || [])
    .filter((answer) => answer.answer === 'YES' && !existing.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      title: answer.questionTextSnapshot,
      selected: true,
    }));
}

function treatmentCounts(state, session, assistedId) {
  if (!session || !assistedId) return { active: 0, touched: 0 };
  const current = (state.treatments || []).filter((item) => item.assistedEntityId === assistedId);
  const active = current.filter((item) => [TreatmentStatus.PLANNED, TreatmentStatus.IN_PROGRESS].includes(item.status)).length;
  const touchedIds = new Set((state.events || [])
    .filter((event) => event.sessionId === session.id && event.entityType === 'Treatment')
    .map((event) => event.entityId));
  return { active, touched: touchedIds.size };
}

function nextRecommendation({ session, prepared, assisted, baseline, openInvestigation, pendingFindings }) {
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
  return {
    code: 'INVESTIGATE',
    label: 'Iniciar investigação',
    reason: 'Os pré-requisitos estão concluídos. Você pode seguir para uma investigação guiada.',
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
  const completedInvestigation = latestSessionInvestigation(state, session?.id, assisted?.id, 'COMPLETED');
  const pendingFindings = pendingInvestigationFindings(state, completedInvestigation);
  const recommendation = nextRecommendation({ session, prepared, assisted, baseline, openInvestigation, pendingFindings });
  const treatment = treatmentCounts(state, session, assisted?.id);
  const investigationCount = session
    ? (state.investigations || []).filter((item) => item.currentSessionId === session.id).length
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
    nextAction: recommendation.label,
    nextReason: recommendation.reason,
    investigations: investigationCount,
    treatments: treatment.touched,
    activeTreatments: treatment.active,
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
    findingsInvestigationId: pendingFindings.length ? completedInvestigation?.id || null : null,
  };
}
