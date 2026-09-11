import { mobileSheet } from '../components/mobile-sheet.js';
import { treatmentStatusLabel } from '../status-labels.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
}

function stat(label, value) {
  return `<span class="v2-close-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></span>`;
}

function continuityTitle(item, multiAssisted) {
  return [multiAssisted ? item.assistedName : '', item.title].filter(Boolean).map(esc).join(' · ');
}

export function closingFlow(model, ui) {
  const summary = model.safeClose;
  if (!summary) return '';
  const reikiBlocker = summary.activeReiki;
  const openInvestigationCount = Math.max(0, Number(summary.investigationOpened || 0) - Number(summary.investigationCompleted || 0));
  const fallbackPendingFindings = Array.isArray(model.findings) ? model.findings.length : 0;
  const pendingFindingCount = Math.max(0, Number(summary.pendingFindingCount ?? fallbackPendingFindings) || 0);
  const recoveryBlocker = openInvestigationCount
    ? summary.openInvestigationBlocker
    : (pendingFindingCount ? summary.pendingFindingBlocker : null);
  const recoveryAssistedId = recoveryBlocker?.assistedEntityId || '';
  const recoveryAssistedName = recoveryBlocker?.assistedName || '';
  const hasBlocker = Boolean(reikiBlocker || openInvestigationCount || pendingFindingCount);
  const assistedNames = (summary.assistedNames || []).filter(Boolean);
  const multiAssisted = assistedNames.length > 1;
  const closingContext = assistedNames.length === 1
    ? `${assistedNames[0]} · Revisão da sessão`
    : (assistedNames.length > 1 ? `${assistedNames.length} Assistidos · Revisão da sessão` : 'Revisão da sessão');
  const multiAssistedList = multiAssisted
    ? `<p class="v2-helper v2-close-assisteds"><strong>Assistidos:</strong> ${esc(assistedNames.join(', '))}</p>`
    : '';

  const body = `
    <div class="v2-closing-review">
      ${multiAssistedList}

      <section class="v2-close-summary" aria-label="Resumo antes de encerrar">
        ${stat('investigações concluídas', `${summary.investigationCompleted}/${summary.investigationOpened}`)}
        ${stat('tratamentos trabalhados', summary.treatmentsWorked)}
        ${stat('achados', summary.findings)}
        ${stat('notas', summary.notes)}
      </section>

      ${summary.longitudinal?.length ? `
        <section class="v2-close-section">
          <p class="v2-eyebrow">Continua depois da sessão</p>
          <div class="v2-close-continuity">${summary.longitudinal.map((item) => `<div><strong>${continuityTitle(item, multiAssisted)}</strong><span>${esc(treatmentStatusLabel(item.status))}</span></div>`).join('')}</div>
        </section>
      ` : `
        <section class="v2-close-section v2-close-all-clear"><strong>Nenhum tratamento longitudinal pendente</strong><span>O trabalho registrado nesta sessão permanece no Histórico.</span></section>
      `}

      ${reikiBlocker ? `
        <div class="v2-inline-error" role="alert"><strong>Reiki ainda está ${reikiBlocker.status === 'PAUSED' ? 'pausado' : 'em andamento'}</strong><span>Conclua a aplicação de ${esc(reikiBlocker.assistedName)} antes de encerrar a sessão.</span></div>
      ` : ''}

      ${openInvestigationCount ? `
        <div class="v2-inline-error" role="alert"><strong>${openInvestigationCount === 1 ? 'Há uma investigação em andamento' : `Há ${openInvestigationCount} investigações em andamento`}</strong><span>Conclua ${recoveryAssistedName ? `a investigação de ${esc(recoveryAssistedName)}` : 'a investigação aberta'} antes de encerrar para não perder a continuidade do atendimento.</span></div>
      ` : ''}

      ${pendingFindingCount ? `
        <div class="v2-inline-error" role="alert"><strong>${pendingFindingCount === 1 ? 'Há 1 achado aguardando revisão' : `Há ${pendingFindingCount} achados aguardando revisão`}</strong><span>Revise ${recoveryAssistedName ? `os achados de ${esc(recoveryAssistedName)}` : 'os achados da investigação'} antes de encerrar a sessão.</span></div>
      ` : ''}

      ${!hasBlocker ? `
        <div class="v2-close-ready"><span aria-hidden="true">✓</span><div><strong>Pronto para encerrar</strong><p>Não há investigação, achado pendente ou aplicação de Reiki bloqueando o fechamento.</p></div></div>
        <label class="v2-field">
          <span>Nota de encerramento <small>(opcional)</small></span>
          <textarea rows="2" data-v2-closing-confirmation placeholder="O que será útil lembrar depois?"></textarea>
        </label>
      ` : ''}
    </div>
  `;

  let footerHtml;
  if (reikiBlocker) {
    footerHtml = `
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-close-sheet>Voltar</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-closing-reiki>Abrir Reiki para concluir</button>
    `;
  } else if (openInvestigationCount || pendingFindingCount) {
    footerHtml = recoveryAssistedId ? `
      <span aria-hidden="true"></span>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-select-assisted="${esc(recoveryAssistedId)}" data-v2-closing-blocker-assisted="${esc(recoveryAssistedId)}">${recoveryAssistedName ? `Continuar com ${esc(recoveryAssistedName)}` : 'Voltar à sessão'}</button>
    ` : `
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
    eyebrow: closingContext,
    title: hasBlocker ? 'Há ações pendentes' : 'Encerrar sessão',
    body,
    error: ui.error,
    footerHtml,
  });
}
