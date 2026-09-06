import {
  AssistedType,
  answerInvestigation,
  closeSession,
  confirmFindings,
  createAssistedEntity,
  getOpenSession,
  latestPreparation,
  selectAssistedForSession,
  startInvestigation,
  startPreparation,
  startSession,
  togglePreparationStep,
} from '../../domain.js';
import { recordHawkinsBaseline, requireHawkinsBaseline } from '../../hawkins-measurement.js';
import { completeStructuredPreparation, updatePreparationDetails } from '../../structured-preparation.js';
import { createPlannedTreatment, startPlannedTreatment } from '../../treatment-planning.js';
import { enrichComponentWithTreatmentItem, graphExpectedEndAt } from '../../treatment-item-graphs.js';
import { recordStructuredFinalAssessment, resumeTreatmentPreservingDuration } from '../../backlog.js';
import { completeTreatmentAfterFinalAssessment, recordComponentDismantlingReview } from '../../remaining.js';
import {
  completeFlexibleReiki,
  pauseFlexibleReiki,
  resumeFlexibleReiki,
  startFlexibleReiki,
} from '../../reiki-flex.js';

function currentPreparation(store) {
  const state = store.getState();
  const session = getOpenSession(state);
  return session ? latestPreparation(state, session.id) : null;
}

function ensurePreparation(store) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) throw new Error('Inicie uma sessão antes da preparação.');
  const existing = latestPreparation(state, session.id);
  if (existing) return existing;
  return startPreparation(store, session.id);
}

function markStepComplete(store, runId, stepKey) {
  const run = store.getState().preparationRuns.find((item) => item.id === runId);
  const step = run?.steps?.find((item) => item.key === stepKey);
  if (step && !step.completed) togglePreparationStep(store, runId, stepKey);
}

function mergedPreparationInput(run, patch = {}) {
  return {
    frequencyValue: patch.frequencyValue ?? run.frequencyMeasurement?.value ?? run.frequencyMeasurement?.hertz ?? '',
    protectionToolIds: patch.protectionToolIds ?? run.protection?.toolIds ?? [],
    protectionNotes: patch.protectionNotes ?? run.protection?.notes ?? '',
    permissionNotes: patch.permissionNotes ?? run.permissionNotes ?? '',
  };
}

function composerItems(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new Error('Adicione pelo menos um item ao tratamento.');
  return items.map((item) => {
    const itemLabel = String(item.itemLabel || '').trim();
    if (!itemLabel) throw new Error('Dê um nome para cada item do tratamento.');
    const commands = (item.commands || []).map((command) => ({
      text: String(command.text || '').trim(),
      graphApplications: (command.graphApplications || []).map((graph) => ({
        graphName: String(graph.graphName || '').trim(),
        durationValue: graph.durationValue === '' ? null : graph.durationValue,
        durationUnit: graph.durationUnit || 'DAY',
      })),
    }));
    if (!commands.length || commands.some((command) => !command.text)) {
      throw new Error(`Adicione pelo menos um comando ao item “${itemLabel}”.`);
    }
    if (commands.some((command) => !command.graphApplications.length || command.graphApplications.some((graph) => !graph.graphName))) {
      throw new Error(`Cada comando de “${itemLabel}” precisa de pelo menos um gráfico.`);
    }
    return { itemLabel, commands };
  });
}

function preflightImmediateTreatmentStart(state, session) {
  const prepared = (state.preparationRuns || []).some((run) => run.sessionId === session.id && run.status === 'COMPLETED');
  if (!prepared) throw new Error('Conclua a preparação da sessão antes de iniciar o tratamento.');
  requireHawkinsBaseline(state, {
    sessionId: session.id,
    assistedEntityId: session.currentAssistedEntityId,
  });
}

function normalizePlannedStructuredTiming(store, treatmentId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.treatmentComponents
      .filter((component) => component.treatmentId === treatmentId && component.status === 'PLANNED')
      .forEach((component) => {
        component.startedAt = null;
        component.expectedEndAt = null;
        for (const command of component.commands || []) {
          for (const graph of command.graphApplications || []) {
            graph.startedAt = null;
            graph.expectedEndAt = null;
          }
        }
      });
    return draft;
  });
}

function anchorStructuredTiming(store, treatmentId) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  if (!treatment?.startedAt) return;
  store.setState((current) => {
    const draft = structuredClone(current);
    draft.treatmentComponents
      .filter((component) => component.treatmentId === treatmentId)
      .forEach((component) => {
        let latest = null;
        for (const command of component.commands || []) {
          for (const graph of command.graphApplications || []) {
            graph.startedAt = treatment.startedAt;
            graph.expectedEndAt = graph.noDuration
              ? null
              : graphExpectedEndAt(treatment.startedAt, graph.durationValue, graph.durationUnit);
            if (graph.expectedEndAt && (!latest || graph.expectedEndAt > latest)) latest = graph.expectedEndAt;
          }
        }
        component.startedAt = treatment.startedAt;
        component.expectedEndAt = latest;
        component.updatedAt = store.nowIso();
      });
    return draft;
  });
}

function linkTreatmentDetails(store, treatmentId, input) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  if (!treatment) return;
  const findingIds = [...new Set((input.findingIds || []).filter((id) => {
    const finding = state.findings.find((item) => item.id === id);
    return finding?.assistedEntityId === treatment.assistedEntityId;
  }))];
  const selected = (input.modalities || []).filter((item) => item?.id && item.id !== 'RADIESTHESIA');
  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    if (!target) return draft;
    target.therapeuticObjective = String(input.objective || '').trim() || null;
    target.findingIds = findingIds;
    target.modalities = ['RADIESTHESIA', ...selected.map((item) => item.id)];
    target.modalitySnapshots = [{ id: 'RADIESTHESIA', label: 'Radiestesia' }, ...selected.map((item) => ({ id: item.id, label: item.label || item.id }))];
    target.updatedAt = store.nowIso();
    return draft;
  });
}

function markLinkedFindingsTreated(store, treatmentId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const treatment = draft.treatments.find((item) => item.id === treatmentId);
    if (!treatment) return draft;
    for (const findingId of treatment.findingIds || []) {
      const finding = draft.findings.find((item) => item.id === findingId);
      if (finding) finding.status = 'TREATED';
    }
    return draft;
  });
}

export function beginSession(store) {
  const session = startSession(store);
  ensurePreparation(store);
  return session;
}

export function closeCurrentSessionV2(store, input = {}) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Não há uma sessão aberta para encerrar.');
  const sessionId = session.id;
  closeSession(store, sessionId, {
    confirmation: String(input.confirmation || '').trim() || 'Procedimento de encerramento concluído',
  });
  return sessionId;
}

export function prepareCurrentSession(store) {
  return ensurePreparation(store);
}

export function advancePreparation(store, input = {}) {
  const run = ensurePreparation(store);
  if (run.status === 'COMPLETED') return run;
  const current = run.steps.find((step) => !step.completed);
  if (!current) return completeStructuredPreparation(store, run.id);

  if (current.key === 'breathing') {
    markStepComplete(store, run.id, 'breathing');
    return currentPreparation(store);
  }

  if (current.key === 'frequency') {
    const normalized = String(input.frequencyValue ?? '').trim().replace(',', '.');
    const hertz = Number(normalized);
    if (!normalized || !Number.isFinite(hertz) || hertz <= 0) throw new Error('Registre sua frequência vibracional em Hz.');
    if (hertz < 400) throw new Error(`Sua frequência está em ${hertz} Hz. Para continuar o atendimento, registre pelo menos 400 Hz.`);
    updatePreparationDetails(store, run.id, mergedPreparationInput(run, { frequencyValue: normalized }));
    markStepComplete(store, run.id, 'frequency');
    return currentPreparation(store);
  }

  if (current.key === 'protection') {
    const protectionNotes = String(input.protectionNotes ?? '').trim();
    if (!protectionNotes && !(run.protection?.toolIds || []).length) {
      throw new Error('Registre a proteção utilizada antes de continuar.');
    }
    updatePreparationDetails(store, run.id, mergedPreparationInput(run, { protectionNotes }));
    markStepComplete(store, run.id, 'protection');
    return currentPreparation(store);
  }

  if (current.key === 'permission') {
    const permissionNotes = String(input.permissionNotes ?? '').trim();
    updatePreparationDetails(store, run.id, mergedPreparationInput(run, { permissionNotes }));
    markStepComplete(store, run.id, 'permission');
    return completeStructuredPreparation(store, run.id);
  }

  throw new Error('Etapa de preparação não reconhecida.');
}

export function selectSessionAssisted(store, assistedEntityId) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Inicie uma sessão antes de selecionar o Assistido.');
  selectAssistedForSession(store, session.id, assistedEntityId);
}

export function createAndSelectPerson(store, input = {}) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Inicie uma sessão antes de criar o Assistido.');
  const entity = createAssistedEntity(store, {
    type: AssistedType.PERSON,
    displayName: String(input.displayName || '').trim(),
    birthDate: input.birthDate || '',
  });
  selectAssistedForSession(store, session.id, entity.id);
  return entity;
}

export function recordSessionHawkins(store, hertz) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) throw new Error('Selecione o Assistido antes da medição de Hawkins.');
  return recordHawkinsBaseline(store, {
    sessionId: session.id,
    assistedEntityId: session.currentAssistedEntityId,
    hertz,
  });
}

export function beginTriage(store) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) throw new Error('Selecione o Assistido antes de investigar.');
  return startInvestigation(store, session.id, session.currentAssistedEntityId);
}

export function answerTriage(store, investigationId, answer) {
  answerInvestigation(store, investigationId, answer);
}

export function stepBackTriage(store, investigationId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const investigation = draft.investigations.find((item) => item.id === investigationId && item.status === 'IN_PROGRESS');
    if (!investigation || investigation.currentIndex <= 0) return draft;
    investigation.currentIndex -= 1;
    investigation.updatedAt = store.nowIso();
    return draft;
  });
}

export function confirmInvestigationFindings(store, investigationId, questionIds) {
  return confirmFindings(store, investigationId, questionIds);
}

export function saveTreatmentDraft(store, input = {}, { start = false } = {}) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) throw new Error('Selecione o Assistido antes de compor o tratamento.');
  const items = composerItems(input);
  if (start) preflightImmediateTreatmentStart(state, session);
  const treatment = createPlannedTreatment(store, {
    assistedEntityId: session.currentAssistedEntityId,
    title: String(input.title || '').trim(),
    notes: String(input.objective || '').trim(),
    components: items.map((item) => ({
      name: item.itemLabel,
      instructions: item.commands.map((command) => command.text).join('\n'),
    })),
  });
  const components = store.getState().treatmentComponents.filter((item) => item.treatmentId === treatment.id);
  components.forEach((component, index) => enrichComponentWithTreatmentItem(store, component.id, items[index]));
  normalizePlannedStructuredTiming(store, treatment.id);
  linkTreatmentDetails(store, treatment.id, input);
  if (start) startPlannedTreatmentV2(store, treatment.id);
  return treatment;
}

export function startPlannedTreatmentV2(store, treatmentId) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Abra uma sessão antes de iniciar o tratamento planejado.');
  startPlannedTreatment(store, treatmentId, session.id);
  anchorStructuredTiming(store, treatmentId);
  markLinkedFindingsTreated(store, treatmentId);
}

export function reviewTreatmentComponentV2(store, input = {}) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Abra uma sessão antes de revisar o componente.');
  return recordComponentDismantlingReview(store, {
    sessionId: session.id,
    componentId: input.componentId,
    verifiedComplete: Boolean(input.verifiedComplete),
    permissionToDismantle: Boolean(input.permissionToDismantle),
    notes: input.notes || '',
  });
}

export function resumeTreatmentV2(store, treatmentId) {
  return resumeTreatmentPreservingDuration(store, treatmentId, { preserveRemainingDuration: true });
}

export function finalizeTreatmentV2(store, treatmentId, input = {}) {
  const session = getOpenSession(store.getState());
  if (!session) throw new Error('Abra uma sessão antes da avaliação final.');
  const assessment = recordStructuredFinalAssessment(store, {
    treatmentId,
    sessionId: session.id,
    frequency: input.frequency,
    imbalancePercent: input.imbalancePercent,
    needsNewTreatment: Boolean(input.needsNewTreatment),
    nextTreatmentWhen: input.nextTreatmentWhen || '',
    notes: input.notes || '',
  });
  completeTreatmentAfterFinalAssessment(store, treatmentId, session.id);
  return assessment;
}

export function startSessionReiki(store, mode = 'IN_PERSON') {
  const session = getOpenSession(store.getState());
  if (!session?.currentAssistedEntityId) throw new Error('Selecione o Assistido antes de iniciar Reiki.');
  return startFlexibleReiki(store, {
    sessionId: session.id,
    assistedEntityId: session.currentAssistedEntityId,
    mode,
  });
}

export function pauseSessionReiki(store, applicationId) {
  return pauseFlexibleReiki(store, applicationId);
}

export function resumeSessionReiki(store, applicationId) {
  return resumeFlexibleReiki(store, applicationId);
}

export function completeSessionReiki(store, applicationId, notes = '') {
  return completeFlexibleReiki(store, applicationId, notes);
}
