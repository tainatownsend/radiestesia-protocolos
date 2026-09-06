import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

export function preparationFlow(model) {
  const prep = model.preparation;
  const frequencyState = prep.frequencyValid
    ? `<small class="v2-status-ok">✓ Adequada para continuar</small>`
    : `<small class="v2-status-warn">Nova medição necessária antes de continuar</small>`;

  const body = `
    <div class="v2-stack">
      <div class="v2-progress" aria-label="Etapa ${prep.step} de ${prep.total}">
        <div class="v2-progress__meta"><span>Etapa ${prep.step} de ${prep.total}</span><span>Preparação</span></div>
        <div class="v2-progress__bar"><span style="width:${(prep.step / prep.total) * 100}%"></span></div>
      </div>

      <section class="v2-section" aria-labelledby="v2-prep-summary">
        <div>
          <p class="v2-eyebrow">Preparação do terapeuta</p>
          <h3 id="v2-prep-summary">Confirme a etapa final</h3>
        </div>

        <div class="v2-card">
          <div class="v2-summary-row">
            <div>
              <strong>Frequência do terapeuta</strong>
              <small>${esc(prep.frequency)} Hz · ${esc(prep.frequencyLabel)}</small>
              ${frequencyState}
            </div>
            <button class="v2-btn v2-btn--ghost" type="button" data-v2-edit="frequency">Alterar</button>
          </div>

          <div class="v2-summary-row">
            <div>
              <strong>Proteção</strong>
              <small>${esc(prep.protection)}</small>
            </div>
            <button class="v2-btn v2-btn--ghost" type="button" data-v2-edit="protection">Alterar</button>
          </div>

          <div class="v2-summary-row">
            <div>
              <strong>Permissão</strong>
              <small>${esc(prep.permission)}</small>
            </div>
            <button class="v2-btn v2-btn--ghost" type="button" data-v2-edit="permission">Alterar</button>
          </div>
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Preparação da sessão',
    title: 'Antes de começar',
    body,
    primaryLabel: 'Concluir preparação',
    secondaryLabel: '',
  });
}