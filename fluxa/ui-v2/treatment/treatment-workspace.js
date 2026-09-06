import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

function dateLabel(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(value)); }
  catch { return value; }
}

function statusCopy(component) {
  if (component.status === 'COMPLETED') return 'Resolvido';
  if (component.status === 'STOPPED') return 'Encerrado';
  if (component.status === 'REPLACED') return 'Substituído';
  if (component.status === 'INTERRUPTED') return 'Interrompido';
  if (component.status === 'PLANNED') return 'Planejado';
  if (component.due) return 'Pronto para revisão';
  if (component.manualReview) return 'Revisão manual disponível';
  return component.expectedEndAt ? `Revisar ${dateLabel(component.expectedEndAt)}` : 'Em andamento';
}

function componentRow(component) {
  return `
    <article class="v2-component-row">
      <div class="v2-component-row__head">
        <div><strong>${esc(component.name)}</strong><small>${esc(statusCopy(component))}</small></div>
        <span class="v2-status-dot" data-status="${esc(component.status)}">${component.resolved ? '✓' : ''}</span>
      </div>
      <details class="v2-component-details">
        <summary>${component.commandCount} comando${component.commandCount === 1 ? '' : 's'} · ${component.graphCount} gráfico${component.graphCount === 1 ? '' : 's'}</summary>
        <div class="v2-component-detail-list">
          ${(component.commands || []).map((command) => `
            <div><strong>${esc(command.text)}</strong>${(command.graphs || []).map((graph) => `<span>${esc(graph.name)}${graph.expectedEndAt ? ` · ${esc(dateLabel(graph.expectedEndAt))}` : ' · sem prazo automático'}</span>`).join('')}</div>
          `).join('')}
        </div>
      </details>
      ${component.reviewable ? `<button class="v2-btn v2-btn--quiet" type="button" data-v2-review-component="${esc(component.id)}">Revisar componente</button>` : ''}
    </article>
  `;
}

export function treatmentWorkspace(model, ui) {
  const treatment = (model.treatments || []).find((item) => item.id === ui.activeTreatmentId);
  if (!treatment) return '';
  const activePrimary = treatment.status !== 'COMPLETED' && treatment.primaryAction !== 'workspace';
  const body = `
    <div class="v2-treatment-workspace">
      <section class="v2-workspace-summary">
        <div class="v2-progress-ring" aria-label="${treatment.resolved} de ${treatment.total} componentes resolvidos"><strong>${treatment.resolved}/${treatment.total}</strong><span>resolvidos</span></div>
        <div><p class="v2-eyebrow">Progresso</p><strong>${esc(treatment.title)}</strong>${treatment.objective ? `<p class="v2-helper">${esc(treatment.objective)}</p>` : ''}</div>
      </section>
      <section class="v2-component-list" aria-label="Componentes do tratamento">
        ${(treatment.components || []).map(componentRow).join('') || '<p class="v2-helper">Nenhum componente registrado.</p>'}
      </section>
      <section class="v2-card v2-card--soft v2-workspace-note">
        <strong>Como funciona a revisão</strong>
        <p class="v2-copy">Componentes com prazo aparecem quando chegam ao momento de revisão. Componentes sem prazo continuam disponíveis para revisão manual.</p>
      </section>
    </div>
  `;
  return mobileSheet({
    eyebrow: model.assistedName || 'Tratamento',
    title: treatment.title,
    body,
    error: ui.error,
    footerHtml: activePrimary ? `
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-close-sheet>Fechar</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-treatment-action="${esc(treatment.primaryAction)}" data-treatment-id="${esc(treatment.id)}">${esc(treatment.primaryLabel)}</button>
    ` : `
      <span aria-hidden="true"></span>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-close-sheet>Fechar</button>
    `,
  });
}
