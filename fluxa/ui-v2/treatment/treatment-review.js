import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

export function treatmentReview(model, ui) {
  const treatment = (model.treatments || []).find((item) => item.id === ui.activeTreatmentId || item.components?.some((component) => component.id === ui.reviewComponentId));
  const component = treatment?.components?.find((item) => item.id === ui.reviewComponentId);
  if (!treatment || !component) return '';
  const commandCount = Number(component.commandCount) || 0;
  const graphCount = Number(component.graphCount) || 0;
  const body = `
    <form class="v2-review-form" data-v2-component-review-form>
      <p class="v2-helper v2-review-summary">${commandCount} comando${commandCount === 1 ? '' : 's'} · ${graphCount} gráfico${graphCount === 1 ? '' : 's'} neste componente</p>

      <fieldset class="v2-choice-group">
        <legend>O que você verificou agora?</legend>
        <label class="v2-choice-card">
          <input type="radio" name="reviewOutcome" value="continue" checked>
          <span><strong>Ainda precisa continuar</strong><small>Registra a revisão e mantém o componente ativo.</small></span>
        </label>
        <label class="v2-choice-card">
          <input type="radio" name="reviewOutcome" value="complete">
          <span><strong>Concluído e pode desmontar</strong><small>Marca o componente como resolvido e libera a próxima etapa.</small></span>
        </label>
      </fieldset>

      <label class="v2-field">
        <span>Notas <small>(opcional)</small></span>
        <textarea rows="3" data-v2-review-notes placeholder="Registre apenas o que será útil depois."></textarea>
      </label>
    </form>
  `;
  return mobileSheet({
    eyebrow: `${model.assistedName || 'Assistido'} · ${treatment.title}`,
    title: `Revisar ${component.name}`,
    body,
    error: ui.error,
    primaryLabel: 'Salvar revisão',
    secondaryLabel: 'Voltar',
  });
}
