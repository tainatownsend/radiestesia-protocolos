export const TREATMENT_STATUS_LABELS = Object.freeze({
  PLANNED: 'Planejado',
  IN_PROGRESS: 'Em andamento',
  INTERRUPTED: 'Interrompido',
  COMPLETED: 'Concluído',
});

export function treatmentStatusLabel(value = '') {
  if (TREATMENT_STATUS_LABELS[value]) return TREATMENT_STATUS_LABELS[value];
  const normalized = String(value || '').replace(/_/g, ' ').trim();
  if (!normalized) return 'Em acompanhamento';
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1).toLocaleLowerCase('pt-BR');
}
