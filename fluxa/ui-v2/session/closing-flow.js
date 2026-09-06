import { mobileSheet } from '../components/mobile-sheet.js';
import { treatmentStatusLabel } from '../status-labels.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
}

function metric(label, value, detail = '') {
  return `<div class="v2-close-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
}

export function closingFlow(model, ui) {
  const summary = model.safeClose;
  if (!summary) return '';
  const reikiBlocker = summary.activeReiki;
  const openInvestigationCount = Math.max(0, Number(summary.investigationOpened || 0) - Number(summary.investigationCompleted || 0));
  const hasBlocker = Boolean(reikiBlocker || openInvestigationCount);
  const body = `
    <div class="v2-closing-review">
      <section class="v2-card v2-card--soft v2-close-context">
        <p class="v2-eyebrow">Assistido(s) trabalhado(s)</p>
        <strong>${esc(summary.assistedNames?.join(', ') || model.assistedName || 'Nenhum Assistido registrado')}</strong>
        <p class="v2-helper">O encerramento fecha somente esta sessão. Tratamentos longitudinais continuam disponíveis.</p>
      </section>

      <section class="v2-close-grid" aria-label="Resumo antes de encerrar">
        ${metric('Investigações', `${summary.investigationCompleted}/${summary.investigationOpened}`, 'concluídas / abertas')}
        ${metric('Tratamentos', summary.treatmentsWorked, 'trabalhados nesta sessão')}
        ${metric('Achados', summary.findings, 'registrados')}
        ${metric('Notas', summary.notes, 'registradas')}
      </section>

      ${summary.longitudinal?.length ? `
        <section class="v2-close-section">
          <p class="v2-eyebrow">Continua depois da sessão</p>
          <div class="v2-close-continuity">${summary.longitudinal.map((item) => `<div><strong>${esc(item.title)}</strong><span>${esc(treatmentStatusLabel(item.status))}</span></div>`).join('')}</div>
        </section>
      ` : `
        <section class="v2-close-section v2-close-all-clear"><strong>Nenhum tratamento longitudinal pendente</strong><span>O trabalho registrado nesta sessão permanece no Histórico.</span></section>
      `}

      ${reikiBlocker ? `
        <div class="v2-inline-error" role="alert"><strong>Reiki ainda está ${reikiBlocker.status === 'PAUSED' ? 'pausado' : 'em andamento'}</strong><span>Conclua a aplicação de ${esc(reikiBlocker.assistedName)} antes de encerrar a sessão.</span></div>
      ` : ''}

      ${openInvestigationCount ? `
        <div class="v2-inline-error" role="alert"><strong>${openInvestigationCount === 1 ? 'Há uma investigação em andamento' : `Há ${openInvestigationCount} investigações em andamento`}</strong><span>Conclua a investigação aberta antes de encerrar para não perder a continuidade do atendimento.</span></div>
      ` : ''}

      ${!hasBlocker ? `
        <div class="v2-close-ready"><span aria-hidden="true">✓</span><div><strong>Pronto para encerrar</strong><p>Não há investigação nem aplicação de Reiki bloqueando o fechamento.</p></div></div>
      ` : ''}

      <label class="v2-field">
        <span>Confirmação / nota de encerramento <small>(opcional)</small></span>
        <textarea rows="2" data-v2-closing-confirmation placeholder="Ex.: procedimento de encerramento concluído"></textarea>
      </label>
    </div>
  `;

  let footerHtml;
  if (reikiBlocker) {
    footerHtml = `
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-close-sheet>Voltar</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-closing-reiki>Concluir Reiki primeiro</button>
    `;
  } else if (openInvestigationCount) {
    footerHtml = `
      <span aria-hidden="true"></span>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-close-sheet>Voltar à sessão</button>
    `;
  } else {
    footerHtml = `
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-close-sheet>Cancelar</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-primary>Encerrar sessão</button>
    `;
  }

  return mobileSheet({
    eyebrow: 'Revisão da sessão',
    title: hasBlocker ? 'Há ações pendentes' : 'Encerrar sessão',
    body,
    error: ui.error,
    footerHtml,
  });
}
