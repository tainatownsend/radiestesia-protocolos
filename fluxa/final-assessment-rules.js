export function validateFinalAssessmentInput(input = {}) {
  const frequency = String(input.frequency ?? '').trim();
  if (!frequency) throw new Error('Registre a frequência vibracional da avaliação final.');

  if (input.imbalancePercent === '' || input.imbalancePercent == null) {
    throw new Error('Registre o percentual de desequilíbrio da avaliação final.');
  }
  const imbalancePercent = Number(input.imbalancePercent);
  if (!Number.isFinite(imbalancePercent) || imbalancePercent < 0 || imbalancePercent > 100) {
    throw new Error('O percentual de desequilíbrio deve estar entre 0% e 100%.');
  }
  return { frequency, imbalancePercent };
}
