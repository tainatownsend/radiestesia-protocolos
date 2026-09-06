function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function statusLine(label, value, ok) {
  return `
    <div class="v2-status-line">
      <span>${esc(label)}</span>
      <strong class="${ok ? 'v2-status-ok' : ''}">${esc(value)}</strong>
    </div>
  `;
}

export function sessionCockpit(model) {
  if (!model.sessionOpen) {
    return `
      <div class="v2-stack">
        <section class="v2-section">
          <p class="v2-eyebrow">Hoje</p>
          <h1 class="v2-title">${esc(model.title)}</h1>
          <p class="v2-copy">${esc(model.description)}</p>
        </section>
        <section class="v2-next-action">
          <p class="v2-eyebrow">Próxima ação</p>
          <h2>Iniciar sessão</h2>
          <p>O Fluxa conduz preparação, Assistido e próximos passos sem exigir que você procure o caminho.</p>
          <button class="v2-btn v2-btn--inverse" type="button" data-v2-preview-action="start-session">Iniciar sessão</button>
        </section>
      </div>
    `;
  }

  const assisted = model.assistedSelected ? model.assistedName : 'Sessão em andamento';
  const hawkins = model.hawkinsReady ? `${model.hawkins} Hz` : 'Pendente';
  const prerequisitesReady = Boolean(model.prepared && model.assistedSelected && model.hawkinsReady);

  return `
    <div class="v2-stack">
      <section class="v2-section">
        <p class="v2-eyebrow">Sessão em andamento</p>
        <h1 class="v2-title">${esc(assisted)}</h1>
        <p class="v2-copy">${esc(model.description || 'Contexto, pendências e próxima ação em uma única linha de trabalho.')}</p>
      </section>

      <section class="v2-next-action" aria-labelledby="v2-next-action-title">
        <p class="v2-eyebrow">Próxima ação recomendada</p>
        <h2 id="v2-next-action-title">${esc(model.nextAction || 'Continuar sessão')}</h2>
        <p>${esc(model.nextReason || 'Continue pelo próximo passo do atendimento.')}</p>
        <button class="v2-btn v2-btn--inverse" type="button" data-v2-preview-action="next">${esc(model.nextAction || 'Continuar')}</button>
      </section>

      <section class="v2-card v2-session-state" aria-label="Estado da sessão">
        ${statusLine('Preparação', model.prepared ? 'Concluída' : 'Pendente', model.prepared)}
        ${statusLine('Assistido', model.assistedSelected ? model.assistedName : 'Pendente', model.assistedSelected)}
        ${statusLine('Hawkins inicial', hawkins, model.hawkinsReady)}
      </section>

      <section class="v2-kpis" aria-label="Resumo compacto da sessão">
        <div class="v2-kpi"><strong>${model.investigations ?? 0}</strong><span>investigações nesta sessão</span></div>
        <div class="v2-kpi"><strong>${model.treatments ?? 0}</strong><span>tratamentos trabalhados</span></div>
        <div class="v2-kpi"><strong>${model.activeTreatments ?? 0}</strong><span>tratamentos ativos</span></div>
      </section>

      <section class="v2-section">
        <p class="v2-eyebrow">Ações da sessão</p>
        <div class="v2-session-actions">
          <button class="v2-btn" type="button" data-v2-preview-action="investigate" ${prerequisitesReady ? '' : 'disabled'}>Investigar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="treat" ${model.source === 'live' ? 'disabled title="Treatment Composer entra na próxima migração"' : ''}>Tratar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="reiki" ${model.source === 'live' ? 'disabled title="Reiki entra depois do Treatment Workspace"' : ''}>Reiki</button>
        </div>
      </section>
    </div>
  `;
}
