import { treatmentStatusLabel } from '../status-labels.js';
import { isContinuityLocked } from '../workflow-continuity.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

function treatmentCard(treatment, { locked = false } = {}) {
  const progress = treatment.total
    ? `${treatment.resolved} de ${treatment.total} componentes resolvidos`
    : 'Composição ainda sem componentes';
  const modality = (treatment.modalities || []).map((item) => item.label).join(' · ');
  const active = treatment.status !== 'COMPLETED';
  const secondaryAction = active && treatment.primaryAction !== 'workspace'
    ? `<button class="v2-btn v2-btn--ghost" type="button" data-v2-treatment-action="workspace" data-treatment-id="${esc(treatment.id)}">Ver componentes</button>`
    : '';
  let actions = '';
  if (locked && active) {
    actions = '<p class="v2-helper">Conclua a etapa em andamento em Hoje antes de alterar este tratamento.</p>';
  } else if (active) {
    actions = `<div class="v2-treatment-card__actions">
      <button class="v2-btn v2-btn--primary" type="button" data-v2-treatment-action="${esc(treatment.primaryAction)}" data-treatment-id="${esc(treatment.id)}">${esc(treatment.primaryLabel)}</button>
      ${secondaryAction}
    </div>`;
  } else {
    actions = `<button class="v2-btn v2-btn--ghost" type="button" data-v2-treatment-action="workspace" data-treatment-id="${esc(treatment.id)}">Ver tratamento</button>`;
  }
  return `
    <article class="v2-treatment-card" data-treatment-id="${esc(treatment.id)}">
      <div class="v2-treatment-card__head">
        <div>
          <span class="v2-status-pill" data-status="${esc(treatment.status)}">${esc(treatmentStatusLabel(treatment.status))}</span>
          <h2>${esc(treatment.title)}</h2>
        </div>
        <span class="v2-progress-count">${treatment.total ? `${treatment.resolved}/${treatment.total}` : '—'}</span>
      </div>
      ${treatment.objective ? `<p class="v2-copy">${esc(treatment.objective)}</p>` : ''}
      <div class="v2-treatment-meta"><span>${esc(progress)}</span>${modality ? `<span>${esc(modality)}</span>` : ''}</div>
      ${actions}
    </article>
  `;
}

function emptyTreatmentState(model) {
  if (!model.sessionOpen) {
    return {
      title: 'Abra uma sessão para entrar no contexto do Assistido',
      copy: 'A fila de Tratamentos acompanha o Assistido selecionado na sessão. Registros de atendimentos anteriores continuam disponíveis no Histórico.',
      actionLabel: 'Abrir sessão em Hoje',
    };
  }
  if (!model.assistedSelected) {
    return {
      title: 'Selecione o Assistido da sessão',
      copy: 'Depois da seleção, o Fluxa mostra aqui os tratamentos desse Assistido e a próxima ação disponível.',
      actionLabel: 'Selecionar em Hoje',
    };
  }
  return {
    title: `Nenhum tratamento para ${model.assistedName || 'este Assistido'}`,
    copy: 'Quando você criar ou planejar um tratamento, ele aparecerá aqui com a próxima ação correta.',
    actionLabel: '',
  };
}

export function treatmentPage(model) {
  const treatments = model.treatments || [];
  const empty = emptyTreatmentState(model);
  const continuityLocked = isContinuityLocked(model.nextActionCode);
  const canCreateTreatment = Boolean(
    model.sessionOpen
    && model.assistedSelected
    && model.hawkinsReady
    && !continuityLocked
  );
  return `
    <div class="v2-stack">
      <section class="v2-section v2-page-heading">
        <div>
          <p class="v2-eyebrow">Tratamentos</p>
          <h1 class="v2-title">Fila de trabalho</h1>
          <p class="v2-copy">Planejados, ativos e prontos para revisão em uma única sequência.</p>
        </div>
        ${canCreateTreatment ? '<button class="v2-btn v2-btn--primary" type="button" data-v2-preview-action="treat">Novo tratamento</button>' : ''}
      </section>
      ${continuityLocked && treatments.length ? '<section class="v2-card v2-card--soft"><strong>Há uma etapa em andamento</strong><p class="v2-copy">A fila fica disponível para consulta. Volte para Hoje para concluir a próxima ação antes de alterar tratamentos.</p></section>' : ''}
      ${treatments.length ? `<section class="v2-treatment-list">${treatments.map((item) => treatmentCard(item, { locked: continuityLocked })).join('')}</section>` : `
        <section class="v2-card v2-card--soft v2-empty-state">
          <strong>${esc(empty.title)}</strong>
          <p class="v2-copy">${esc(empty.copy)}</p>
          ${empty.actionLabel ? `<button class="v2-btn v2-btn--primary" type="button" data-v2-route="today">${esc(empty.actionLabel)}</button>` : ''}
        </section>
      `}
    </div>
  `;
}
