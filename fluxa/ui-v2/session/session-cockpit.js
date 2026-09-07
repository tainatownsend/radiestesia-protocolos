import { isContinuityLocked } from '../workflow-continuity.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function indicator(label, value, ok = false) {
  return `
    <div class="v2-session-indicator">
      <span>${esc(label)}</span>
      <strong class="${ok ? 'v2-status-ok' : ''}">${esc(value)}</strong>
    </div>
  `;
}

function outsideSessionReikiCard(reiki) {
  const status = reiki.status === 'PAUSED' ? 'Pausado' : 'Em andamento';
  return `
    <section class="v2-card v2-card--soft v2-outside-reiki">
      <p class="v2-eyebrow">Reiki fora da sessão</p>
      <strong>${esc(reiki.assistedName || 'Assistido')} · ${esc(status)}</strong>
      <p class="v2-copy">${esc(reiki.modeLabel || 'Aplicação ativa')} · esta aplicação continua independente do atendimento atual.</p>
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-preview-action="reiki">Abrir Reiki</button>
    </section>
  `;
}

export function sessionCockpit(model) {
  const outsideSessionReiki = model.reiki?.sessionId === null ? model.reiki : null;
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
        ${outsideSessionReiki ? outsideSessionReikiCard(outsideSessionReiki) : ''}
      </div>
    `;
  }

  const assisted = model.assistedSelected ? model.assistedName : 'Sessão em andamento';
  const hawkins = model.hawkinsReady ? String(model.hawkins) : 'Pendente';
  const prerequisitesReady = Boolean(model.prepared && model.assistedSelected && model.hawkinsReady);
  const treatmentCount = model.treatmentCount ?? model.treatmentsWorked ?? 0;
  const investigationCount = model.investigations ?? 0;
  const sessionActivity = `${investigationCount} investigaç${investigationCount === 1 ? 'ão' : 'ões'} · ${treatmentCount} tratamento${treatmentCount === 1 ? '' : 's'} trabalhado${treatmentCount === 1 ? '' : 's'}`;
  const continuityLocked = isContinuityLocked(model.nextActionCode);
  const reikiActionReady = Boolean(outsideSessionReiki || (prerequisitesReady && (model.reikiEnabled || model.reiki)));
  const optionalActions = continuityLocked ? '' : `
      <section class="v2-section">
        <p class="v2-eyebrow">Ações da sessão</p>
        <div class="v2-session-actions">
          <button class="v2-btn" type="button" data-v2-preview-action="investigate" ${prerequisitesReady ? '' : 'disabled'}>Investigar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="treat" ${prerequisitesReady ? '' : 'disabled'}>Tratar</button>
          <button class="v2-btn" type="button" data-v2-preview-action="reiki" ${reikiActionReady ? '' : 'disabled'}>Reiki</button>
        </div>
      </section>
  `;
  const lockedOutsideReikiAccess = continuityLocked && outsideSessionReiki
    ? outsideSessionReikiCard(outsideSessionReiki)
    : '';

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

      ${lockedOutsideReikiAccess}

      <section class="v2-session-snapshot" aria-label="Indicadores compactos da sessão">
        ${indicator('Preparação', model.prepared ? 'Concluída' : 'Pendente', model.prepared)}
        ${indicator('Hawkins', hawkins, model.hawkinsReady)}
        ${indicator('Tratamentos ativos', String(model.activeTreatments ?? 0), (model.activeTreatments ?? 0) > 0)}
        <p class="v2-session-activity">${esc(sessionActivity)}</p>
      </section>

      ${optionalActions}

      <section class="v2-session-close-row">
        <button class="v2-btn v2-btn--ghost" type="button" data-v2-preview-action="close-session">Revisar e encerrar sessão</button>
      </section>
    </div>
  `;
}
