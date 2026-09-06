function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
}

function dateTime(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(value)); }
  catch { return String(value); }
}

export function postCloseSummary(model, sessionId) {
  const session = (model.historySessions || []).find((item) => item.id === sessionId) || model.latestClosedSession;
  if (!session) return '';
  return `
    <div class="v2-stack">
      <section class="v2-post-close-hero">
        <span class="v2-post-close-check" aria-hidden="true">✓</span>
        <p class="v2-eyebrow">Sessão encerrada</p>
        <h1 class="v2-title">Registro concluído</h1>
        <p>${esc(session.assistedNames?.join(', ') || 'Atendimento')} · ${esc(dateTime(session.endedAt || session.startedAt))}</p>
      </section>

      <section class="v2-kpis" aria-label="Resumo da sessão encerrada">
        <div class="v2-kpi"><strong>${session.investigationCompleted}</strong><span>investigações concluídas</span></div>
        <div class="v2-kpi"><strong>${session.treatmentsWorked}</strong><span>tratamentos trabalhados</span></div>
        <div class="v2-kpi"><strong>${session.findings}</strong><span>achados registrados</span></div>
      </section>

      ${session.longitudinal?.length ? `
        <section class="v2-card v2-card--soft v2-post-close-continuity">
          <p class="v2-eyebrow">Fica para acompanhar</p>
          <h2>Trabalho longitudinal continua ativo</h2>
          ${session.longitudinal.map((item) => `<div><strong>${esc(item.title)}</strong><span>${esc(item.status)}</span></div>`).join('')}
        </section>
      ` : `
        <section class="v2-card v2-card--soft"><strong>Nenhum tratamento longitudinal pendente desta sessão</strong><p class="v2-copy">O atendimento continua disponível no Histórico.</p></section>
      `}

      <section class="v2-section">
        <div class="v2-post-close-actions">
          <button class="v2-btn v2-btn--primary" type="button" data-v2-history-session="${esc(session.id)}" data-v2-open-history>Ver resumo no Histórico</button>
          <button class="v2-btn v2-btn--ghost" type="button" data-v2-preview-action="start-session">Iniciar novo atendimento</button>
        </div>
      </section>
    </div>
  `;
}
