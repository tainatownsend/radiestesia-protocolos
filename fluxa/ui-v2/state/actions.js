import {
  AssistedType,
  answerInvestigation,
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
import { recordHawkinsBaseline } from '../../hawkins-measurement.js';
import { completeStructuredPreparation, updatePreparationDetails } from '../../structured-preparation.js';

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

export function beginSession(store) {
  const session = startSession(store);
  ensurePreparation(store);
  return session;
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
