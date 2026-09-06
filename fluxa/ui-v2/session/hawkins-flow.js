import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

export function hawkinsFlow(model, ui = {}) {
  const body = `
    <div class="v2-stack">
      <section class="v2-section">
        <div>
          <p class="v2-eyebrow">${esc(model.assistedName || 'Assistido')}</p>
          <h3>Frequência inicial de Hawkins</h3>
          <p class="v2-copy">Registre a medição inicial agora. Ela será reutilizada nesta sessão e servirá como referência para a avaliação final.</p>
        </div>
        <label class="v2-field">
          <span>Frequência inicial</span>
          <div class="v2-unit-input">
            <input type="number" min="0.01" step="any" inputmode="decimal" placeholder="Ex.: 350" required data-v2-hawkins-input>
            <strong>Hz</strong>
          </div>
        </label>
        <div class="v2-inline-note">
          <strong>Uma vez por sessão e Assistido</strong>
          <p>Se já existir uma medição válida nesta sessão, o Fluxa não pedirá novamente.</p>
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Antes de investigar ou tratar',
    title: `Medir ${model.assistedName || 'Assistido'}`,
    body,
    primaryLabel: 'Registrar e continuar',
    secondaryLabel: '',
    error: ui.error,
  });
}
