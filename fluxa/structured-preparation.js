import { completePreparation } from './domain.js';

const THERAPIST_MIN_HAWKINS_HZ = 400;

function requireOpenPreparationSession(state, runId) {
  const run = state.preparationRuns.find((item) => item.id === runId && item.status !== 'COMPLETED');
  if (!run) throw new Error('Preparação não disponível para atualização.');
  const session = (state.sessions || []).find((item) => item.id === run.sessionId && item.status === 'OPEN');
  if (!session) throw new Error('Esta ação exige que a sessão da preparação esteja aberta.');
  return run;
}

function parseHawkinsHertz(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const hertz = Number(normalized);
  if (!normalized || !Number.isFinite(hertz) || hertz <= 0) {
    throw new Error('Registre a frequência vibracional do terapeuta em Hz.');
  }
  return hertz;
}

export function updatePreparationDetails(store, runId, input = {}) {
  const state = store.getState();
  requireOpenPreparationSession(state, runId);

  const frequencyValue = String(input.frequencyValue ?? '').trim();
  const frequencyScale = String(input.frequencyScale ?? '').trim();
  const protectionToolIds = Array.isArray(input.protectionToolIds) ? [...new Set(input.protectionToolIds.filter(Boolean))] : [];
  const protectionNotes = String(input.protectionNotes ?? '').trim();
  const permissionNotes = String(input.permissionNotes ?? '').trim();
  const protectionToolSnapshots = protectionToolIds.map((toolId) => {
    const tool = (state.tools || []).find((item) => item.id === toolId);
    return tool ? { id:tool.id, type:tool.type, name:tool.name } : { id:toolId, type:null, name:'Recurso não disponível' };
  });

  store.setState((current) => {
    const draft = structuredClone(current);
    const target = draft.preparationRuns.find((item) => item.id === runId);
    target.frequencyMeasurement = frequencyValue ? {
      value: frequencyValue,
      hertz: Number(String(frequencyValue).replace(',', '.')),
      scale: frequencyScale || 'Hz',
      subject: 'THERAPIST',
      recordedAt: store.nowIso()
    } : null;
    target.protection = {
      toolIds: protectionToolIds,
      toolSnapshots: protectionToolSnapshots,
      notes: protectionNotes || null
    };
    target.permissionNotes = permissionNotes || null;
    target.updatedAt = store.nowIso();
    return draft;
  });
}

export function validateStructuredPreparation(state, runId) {
  const run = requireOpenPreparationSession(state, runId);
  if (!run.steps?.every((step) => step.completed)) {
    throw new Error('Conclua as quatro etapas da preparação antes de finalizar.');
  }
  const therapistHertz = parseHawkinsHertz(run.frequencyMeasurement?.hertz ?? run.frequencyMeasurement?.value);
  if (therapistHertz < THERAPIST_MIN_HAWKINS_HZ) {
    throw new Error(`Sua frequência vibracional está em ${therapistHertz} Hz. Para iniciar investigações ou tratamentos, registre uma frequência de pelo menos ${THERAPIST_MIN_HAWKINS_HZ} Hz.`);
  }
  const hasProtection = Boolean(run.protection?.toolIds?.length || run.protection?.notes);
  if (!hasProtection) {
    throw new Error('Registre ao menos um gráfico/recurso de proteção ou descreva a proteção utilizada.');
  }
  return true;
}

export function completeStructuredPreparation(store, runId) {
  validateStructuredPreparation(store.getState(), runId);
  completePreparation(store, runId);
  const completed = store.getState().preparationRuns.find((item) => item.id === runId);
  if (completed?.status !== 'COMPLETED') throw new Error('Não foi possível concluir a preparação.');
  return completed;
}
