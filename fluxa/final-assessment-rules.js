export function validateFinalAssessmentInput(input = {}) {
  const frequency = String(input.frequency ?? '').trim();
  const hertz = Number(frequency);
  if (!frequency || !Number.isFinite(hertz) || hertz <= 0) {
    throw new Error('Registre a frequência vibracional de Hawkins em Hz com um valor maior que zero.');
  }

  if (input.imbalancePercent === '' || input.imbalancePercent == null) {
    throw new Error('Registre o percentual de desequilíbrio da avaliação final.');
  }
  const imbalancePercent = Number(input.imbalancePercent);
  if (!Number.isFinite(imbalancePercent) || imbalancePercent < 0 || imbalancePercent > 100) {
    throw new Error('O percentual de desequilíbrio deve estar entre 0% e 100%.');
  }
  return { frequency:String(hertz), hertz, imbalancePercent };
}
