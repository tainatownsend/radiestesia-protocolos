import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

export function finalAssessment(model, ui) {
  const treatment = (model.treatments || []).find((item) => item.id === ui.activeTreatmentId);
  if (!treatment) return '';
  const body = `
    <form class="v2-final-form" data-v2-final-form>
      <section class="v2-final-block">
        <div class="v2-section-number">1</div>
        <div>
          <p class="v2-eyebrow">Frequência final</p>
          <p class="v2-helper">Hawkins inicial desta sessão: <strong>${model.hawkins ? `${esc(model.hawkins)} Hz` : 'não disponível'}</strong></p>
          <label class="v2-field"><span>Hawkins final (Hz)</span><input type="number" min="1" inputmode="decimal" data-v2-final-frequency placeholder="Ex.: 540" data-v2-autofocus></label>
        </div>
      </section>

      <section class="v2-final-block">
        <div class="v2-section-number">2</div>
        <div>
          <p class="v2-eyebrow">Estado atual</p>
          <label class="v2-field"><span>Desequilíbrio restante (%)</span><input type="number" min="0" max="100" inputmode="decimal" data-v2-final-imbalance placeholder="0–100"></label>
          <label class="v2-check-row v2-check-row--standalone"><input type="checkbox" data-v2-final-needs-new><span><strong>Precisa de um novo tratamento</strong><small>Marque somente se houver continuidade indicada.</small></span></label>
          <label class="v2-field" data-v2-final-next-wrap><span>Quando revisar / iniciar o próximo</span><input data-v2-final-next placeholder="Ex.: em 7 dias"></label>
        </div>
      </section>

      <section class="v2-final-block">
        <div class="v2-section-number">3</div>
        <div>
          <p class="v2-eyebrow">Registro</p>
          <label class="v2-field"><span>Notas <small>(opcional)</small></span><textarea rows="3" data-v2-final-notes placeholder="O que será útil lembrar no próximo atendimento?"></textarea></label>
        </div>
      </section>

      <div class="v2-completion-note"><strong>${esc(treatment.title)}</strong><span>${treatment.resolved} de ${treatment.total} componentes resolvidos · pronto para conclusão.</span></div>
    </form>
  `;
  return mobileSheet({
    eyebrow: model.assistedName || 'Tratamento',
    title: 'Avaliação final',
    body,
    error: ui.error,
    primaryLabel: 'Concluir tratamento',
    secondaryLabel: 'Voltar',
  });
}
