export function updatePreparationDetails(store, runId, input = {}) {
  const state = store.getState();
  const run = state.preparationRuns.find((item) => item.id === runId && item.status !== 'COMPLETED');
  if (!run) throw new Error('Preparação não disponível para atualização.');

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
      scale: frequencyScale || null,
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
  const run = state.preparationRuns.find((item) => item.id === runId);
  if (!run) throw new Error('Preparação não encontrada.');
  if (!run.steps?.every((step) => step.completed)) {
    throw new Error('Conclua as quatro etapas da preparação antes de finalizar.');
  }
  if (!run.frequencyMeasurement?.value) {
    throw new Error('Registre a frequência vibracional medida antes de concluir a preparação.');
  }
  const hasProtection = Boolean(run.protection?.toolIds?.length || run.protection?.notes);
  if (!hasProtection) {
    throw new Error('Registre ao menos um gráfico/recurso de proteção ou descreva a proteção utilizada.');
  }
  return true;
}
