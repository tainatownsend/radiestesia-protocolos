function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
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
          <p>O Fluxa vai conduzir cada etapa sem exigir que você procure o próximo passo.</p>
          <button class="v2-btn v2-btn--inverse" type="button" data-v2-preview-action="start-session">Iniciar sessão</button>
        </section>
      </div>
    `;
  }

  const assisted = model.assistedSelected ? model.assistedName : 'Assistido ainda não selecionado';
  const hawkins = model.hawkinsReady ? `${model.hawkins} Hz` : 'Pendente';

  return `
    <div class="v2-stack">
      <section class="v2-section">
        <p class="v2-eyebrow">Sessão em andamento</p>
        <h1 class="v2-title">${esc(assisted)}</h1>
        <p class="v2-copy">O Fluxa mantém contexto, pendências e próxima ação em uma única linha de trabalho.</p>
      </section>

      <section class="v2-next-action" aria-labelledby="v2-next-action-title">
        <p class="v2-eyebrow">Próxima ação recomendada</p>
        <h2 id="v2-next-action-title">${esc(model.nextAction || 'Continuar sessão')}</h2>
        <p>${esc(model.nextReason || 'Continue pelo próximo passo do atendimento.')}</p>
        <button class="v2-btn v2-btn--inverse" type="button" data-v2-preview-action="next">${esc(model.nextAction || 'Continuar')}</button>
      </section>

      <section class="v2-kpis" aria-label="Resumo compacto da sessão">
        <div class="v2-kpi"><strong>${model.investigations ?? 0}</strong><span>investigação</span></div>
        <div class="v2-kpi"><strong>${model.treatments ?? 0}</strong><span>tratamento</span></div>
        <div class="v2-kpi"><strong>${esc(hawkins)}</strong><span>Hawkins</span></div>
      </section>

      <section class="v2-card v2-card--soft">
        <p class="v2-eyebrow">Ações da sessão</p>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px">
          <button class="v2-btn" type="button" data-v2-preview-action="investigate">Investigar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="treat">Tratar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="reiki">Reiki</button>
        </div>
      </section>
    </div>
  `;
}