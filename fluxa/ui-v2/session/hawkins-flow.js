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
          <h3>Calibração inicial de Hawkins</h3>
          <p class="v2-copy">Registre o nível inicial agora. Ele será reutilizado nesta sessão e servirá como referência para a avaliação final.</p>
        </div>
        <label class="v2-field">
          <span>Nível inicial de Hawkins</span>
          <input type="number" min="0.01" step="any" inputmode="decimal" placeholder="Ex.: 350" required data-v2-hawkins-input>
        </label>
        <div class="v2-inline-note">
          <strong>Uma vez por sessão e Assistido</strong>
          <p>Se já existir uma calibração válida nesta sessão, o Fluxa não pedirá novamente.</p>
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Antes de investigar ou tratar',
    title: `Calibrar ${model.assistedName || 'Assistido'}`,
    body,
    primaryLabel: 'Registrar e continuar',
    secondaryLabel: '',
    error: ui.error,
  });
}
