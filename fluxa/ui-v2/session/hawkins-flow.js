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
        <p class="v2-copy">Registre o nível inicial agora. Ele será reutilizado nesta sessão e servirá como referência para a avaliação final.</p>
        <label class="v2-field">
          <span>Nível inicial de Hawkins</span>
          <input type="number" min="0.01" step="any" inputmode="decimal" placeholder="Ex.: 350" required data-v2-hawkins-input>
        </label>
        <div class="v2-inline-note">
          <strong>Uma calibração por Assistido nesta sessão</strong>
          <p>Se já existir uma calibração válida para este Assistido na sessão atual, o Fluxa não pedirá novamente.</p>
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: `${esc(model.assistedName || 'Assistido')} · Hawkins`,
    title: 'Calibração inicial de Hawkins',
    body,
    primaryLabel: 'Registrar e continuar',
    secondaryLabel: '',
    error: ui.error,
  });
}
