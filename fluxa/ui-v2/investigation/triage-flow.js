import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

export function triageFlow(model, ui = {}) {
  const investigation = model.investigation;
  if (!investigation) return '';
  const questionNumber = Math.min(investigation.currentIndex + 1, investigation.total || 1);
  const body = `
    <div class="v2-stack v2-triage">
      <div class="v2-progress" aria-label="Pergunta ${questionNumber} de ${investigation.total}">
        <div class="v2-progress__meta">
          <span>Pergunta ${questionNumber} de ${investigation.total}</span>
          <span>${esc(investigation.name)}</span>
        </div>
        <div class="v2-progress__bar"><span style="width:${(questionNumber / Math.max(investigation.total, 1)) * 100}%"></span></div>
      </div>
      <section class="v2-question" aria-labelledby="v2-triage-question">
        <p class="v2-eyebrow">${esc(model.assistedName || 'Assistido')}</p>
        <h3 id="v2-triage-question" tabindex="-1" data-v2-autofocus>${esc(investigation.question)}</h3>
        <p class="v2-copy">Responda apenas à pergunta atual. O progresso é salvo automaticamente.</p>
      </section>
    </div>
  `;
  const footerHtml = `
    <button class="v2-btn v2-btn--ghost" type="button" data-v2-triage-back ${investigation.currentIndex <= 0 ? 'disabled' : ''}>Voltar</button>
    <div class="v2-binary-actions" aria-label="Resposta">
      <button class="v2-btn" type="button" data-v2-triage-answer="NO">Não</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-triage-answer="YES">Sim</button>
    </div>
  `;

  return mobileSheet({
    eyebrow: model.assistedName || 'Assistido',
    title: investigation.name,
    body,
    primaryLabel: 'Continuar',
    footerHtml,
    closeLabel: 'Fechar investigação',
    error: ui.error,
  });
}
