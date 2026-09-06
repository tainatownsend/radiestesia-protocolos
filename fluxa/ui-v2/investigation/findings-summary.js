import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

export function findingsSummary(model, ui = {}) {
  const findings = model.findings || [];
  const body = `
    <div class="v2-stack">
      <section class="v2-section">
        <div>
          <p class="v2-eyebrow">${esc(model.assistedName || 'Assistido')}</p>
          <h3>O que foi encontrado</h3>
          <p class="v2-copy">Confirme somente o que deve seguir como achado. A origem permanece registrada no histórico.</p>
        </div>
        <div class="v2-choice-list">
          ${findings.map((finding) => `
            <label class="v2-choice-row">
              <input type="checkbox" value="${esc(finding.questionId)}" data-v2-finding-choice checked>
              <span>
                <strong>${esc(finding.title)}</strong>
                <small>Triagem rápida · resposta Sim</small>
              </span>
            </label>
          `).join('') || '<div class="v2-empty"><strong>Nenhum achado pendente</strong><p>Você pode continuar o atendimento.</p></div>'}
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Investigação concluída',
    title: 'Revisar achados',
    body,
    primaryLabel: findings.length ? 'Confirmar achados' : 'Continuar',
    secondaryLabel: '',
    error: ui.error,
  });
}
