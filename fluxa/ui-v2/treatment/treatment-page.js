import { treatmentStatusLabel } from '../status-labels.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

function treatmentCard(treatment) {
  const progress = treatment.total
    ? `${treatment.resolved} de ${treatment.total} componentes resolvidos`
    : 'Composição ainda sem componentes';
  const modality = (treatment.modalities || []).map((item) => item.label).join(' · ');
  const active = treatment.status !== 'COMPLETED';
  const secondaryAction = active && treatment.primaryAction !== 'workspace'
    ? `<button class="v2-btn v2-btn--ghost" type="button" data-v2-treatment-action="workspace" data-treatment-id="${esc(treatment.id)}">Ver componentes</button>`
    : '';
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
      ${active ? `<div class="v2-treatment-card__actions">
        <button class="v2-btn v2-btn--primary" type="button" data-v2-treatment-action="${esc(treatment.primaryAction)}" data-treatment-id="${esc(treatment.id)}">${esc(treatment.primaryLabel)}</button>
        ${secondaryAction}
      </div>` : `<button class="v2-btn v2-btn--ghost" type="button" data-v2-treatment-action="workspace" data-treatment-id="${esc(treatment.id)}">Ver tratamento</button>`}
    </article>
  `;
}

export function treatmentPage(model) {
  const treatments = model.treatments || [];
  return `
    <div class="v2-stack">
      <section class="v2-section v2-page-heading">
        <div>
          <p class="v2-eyebrow">Tratamentos</p>
          <h1 class="v2-title">Fila de trabalho</h1>
          <p class="v2-copy">Planejados, ativos e prontos para revisão em uma única sequência.</p>
        </div>
        ${model.sessionOpen && model.assistedSelected && model.hawkinsReady ? '<button class="v2-btn v2-btn--primary" type="button" data-v2-preview-action="treat">Novo tratamento</button>' : ''}
      </section>
      ${treatments.length ? `<section class="v2-treatment-list">${treatments.map(treatmentCard).join('')}</section>` : `
        <section class="v2-card v2-card--soft v2-empty-state">
          <strong>Nenhum tratamento para este Assistido</strong>
          <p class="v2-copy">Quando você criar ou planejar um tratamento, ele aparecerá aqui com a próxima ação correta.</p>
        </section>
      `}
    </div>
  `;
}
