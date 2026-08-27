import { createStore } from './store.js';
import { getOpenSession, treatmentNeedsReview, TreatmentStatus } from './domain.js';
import { treatmentComponentResolution } from './remaining.js';

const store = createStore();
let scheduled = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function safeTime(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}
function latest(items = []) {
  return [...items].sort((a, b) => String(b.updatedAt || b.createdAt || b.occurredAt || '').localeCompare(String(a.updatedAt || a.createdAt || a.occurredAt || '')))[0] || null;
}
function activeTreatments(state, assistedId) {
  return (state.treatments || [])
    .filter((item) => item.assistedEntityId === assistedId && item.status === TreatmentStatus.IN_PROGRESS)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}
function currentRecommendation(state) {
  const session = getOpenSession(state);
  const assistedId = session?.currentAssistedEntityId;
  if (!session || !assistedId) return null;

  const treatments = activeTreatments(state, assistedId);
  const ready = treatments.find((item) => treatmentComponentResolution(state, item.id).readyForFinalAssessment);
  if (ready) {
    return {
      kind: 'final',
      treatmentId: ready.id,
      title: `Finalizar ${ready.title || 'tratamento'}`,
      detail: 'Todos os componentes estão resolvidos. A avaliação final já pode ser registrada.',
      action: 'Realizar avaliação final'
    };
  }

  const review = treatments.find((item) => treatmentNeedsReview(state, item));
  if (review) {
    return {
      kind: 'review',
      treatmentId: review.id,
      title: `Revisar ${review.title || 'tratamento'}`,
      detail: 'Há componente disponível para revisão neste tratamento.',
      action: 'Revisar agora'
    };
  }

  const investigation = latest((state.investigations || []).filter((item) => item.assistedEntityId === assistedId && item.status === 'IN_PROGRESS'));
  if (investigation) {
    const name = investigation.protocolSnapshot?.name || investigation.protocolName || investigation.protocolId || 'investigação';
    return {
      kind: 'investigation',
      title: `Continuar ${name}`,
      detail: 'Há uma investigação aberta para este Assistido.',
      action: 'Continuar investigação'
    };
  }

  const active = treatments[0];
  if (active) {
    const resolution = treatmentComponentResolution(state, active.id);
    return {
      kind: 'treatment',
      treatmentId: active.id,
      title: `Continuar ${active.title || 'tratamento'}`,
      detail: resolution.total
        ? `${resolution.resolved} de ${resolution.total} ${resolution.total === 1 ? 'componente resolvido' : 'componentes resolvidos'}.`
        : 'Este tratamento continua em andamento.',
      action: 'Abrir tratamento'
    };
  }

  return {
    kind: 'choose',
    title: 'Escolha a atividade',
    detail: 'Nenhuma pendência exige atenção agora. Escolha a atividade adequada para este momento.',
    action: ''
  };
}

function enhanceHome() {
  const cockpit = document.querySelector('[data-home-cockpit]');
  if (!cockpit) return;
  const state = store.getState();
  const recommendation = currentRecommendation(state);
  if (!recommendation) return;

  const copy = cockpit.querySelector('.home-next-copy');
  if (copy) {
    const eyebrow = copy.querySelector('.eyebrow');
    const heading = copy.querySelector('h1');
    const detail = copy.querySelector('p:not(.eyebrow)');
    if (eyebrow && eyebrow.textContent !== 'Próxima ação recomendada') eyebrow.textContent = 'Próxima ação recomendada';
    if (heading && heading.textContent !== recommendation.title) heading.textContent = recommendation.title;
    if (detail && detail.textContent !== recommendation.detail) detail.textContent = recommendation.detail;
  }

  const actionHost = cockpit.querySelector('.home-next-action') || (() => {
    const host = document.createElement('div');
    host.className = 'home-next-action';
    cockpit.querySelector('.home-cockpit-next')?.appendChild(host);
    return host;
  })();

  const key = `${recommendation.kind}:${recommendation.treatmentId || ''}:${recommendation.action}`;
  if (actionHost.dataset.ocActionKey === key) return;
  actionHost.dataset.ocActionKey = key;
  actionHost.innerHTML = '';
  if (!recommendation.action) return;

  const button = document.createElement('button');
  button.className = 'btn primary';
  button.textContent = recommendation.action;
  if (recommendation.kind === 'investigation') {
    button.dataset.homeResumeInvestigation = 'true';
  } else if (recommendation.treatmentId) {
    button.dataset.ocTreatmentAction = recommendation.kind;
    button.dataset.treatmentId = recommendation.treatmentId;
  }
  actionHost.appendChild(button);
}

function clarifySessionCounters() {
  for (const node of document.querySelectorAll('span,p,small')) {
    const text = node.textContent?.trim();
    if (text === 'tratamentos trabalhados') node.textContent = 'tratamentos trabalhados nesta sessão';
  }
}

function filterCounts(state) {
  const items = state.treatments || [];
  return {
    ACTIVE: items.filter((item) => ['IN_PROGRESS', 'INTERRUPTED'].includes(item.status)).length,
    REVIEW: items.filter((item) => treatmentNeedsReview(state, item)).length,
    PLANNED: items.filter((item) => item.status === 'PLANNED').length,
    COMPLETED: items.filter((item) => item.status === 'COMPLETED').length,
    ALL: items.length
  };
}
function enhanceTreatmentFilters() {
  const host = document.querySelector('[data-treatment-filters]');
  if (!host) return;
  const counts = filterCounts(store.getState());
  const labels = { ACTIVE:'Ativos', REVIEW:'Para revisão', PLANNED:'Planejados', COMPLETED:'Concluídos', ALL:'Todos' };
  for (const button of host.querySelectorAll('[data-treatment-filter]')) {
    const key = button.dataset.treatmentFilter;
    const label = labels[key];
    if (!label) continue;
    const text = `${label} ${counts[key] ?? 0}`;
    if (button.textContent !== text) button.textContent = text;
    button.setAttribute('aria-label', `${label}: ${counts[key] ?? 0}`);
  }
}

function dueComponentCount(state, treatmentId) {
  const now = Date.now();
  return (state.treatmentComponents || []).filter((item) => {
    if (item.treatmentId !== treatmentId || item.status !== TreatmentStatus.IN_PROGRESS) return false;
    const end = safeTime(item.expectedEndAt);
    return end == null || end <= now;
  }).length;
}
function latestAssessment(state, treatmentId) {
  return latest((state.assessments || []).filter((item) => item.treatmentId === treatmentId));
}
function treatmentStatusHtml(state, treatment) {
  const resolution = treatmentComponentResolution(state, treatment.id);
  if (treatment.status === TreatmentStatus.IN_PROGRESS && resolution.readyForFinalAssessment) {
    return `<div class="oc-status-icon" aria-hidden="true">✓</div><div><strong>Avaliação final disponível</strong><span>Todos os ${resolution.total} ${resolution.total === 1 ? 'componente está resolvido' : 'componentes estão resolvidos'}.</span></div>`;
  }
  if (treatment.status === TreatmentStatus.IN_PROGRESS && treatmentNeedsReview(state, treatment)) {
    const due = dueComponentCount(state, treatment.id);
    return `<div class="oc-status-icon" aria-hidden="true">↻</div><div><strong>Revisão disponível</strong><span>${due || 1} ${due === 1 ? 'componente pode ser revisado agora' : 'componentes podem ser revisados agora'}.</span></div>`;
  }
  if (treatment.status === TreatmentStatus.IN_PROGRESS && resolution.total) {
    return `<div class="oc-status-icon" aria-hidden="true">→</div><div><strong>${resolution.resolved} de ${resolution.total} resolvidos</strong><span>${resolution.unresolved} ${resolution.unresolved === 1 ? 'componente ainda está em andamento' : 'componentes ainda estão em andamento'}.</span></div>`;
  }
  if (treatment.status === TreatmentStatus.COMPLETED) {
    const assessment = latestAssessment(state, treatment.id);
    if (!assessment) return `<div class="oc-status-icon" aria-hidden="true">✓</div><div><strong>Tratamento concluído</strong><span>O histórico permanece disponível para consulta.</span></div>`;
    const initial = treatment.hawkinsBaselineHertz;
    const final = treatment.hawkinsFinalHertz ?? assessment.hertz ?? assessment.frequency;
    const hawkins = initial && final ? `Hawkins ${esc(initial)} → ${esc(final)} Hz` : final ? `Hawkins final ${esc(final)} Hz` : '';
    const imbalance = assessment.imbalancePercent != null ? `Desequilíbrio final ${esc(assessment.imbalancePercent)}%` : '';
    const result = [hawkins, imbalance].filter(Boolean).join(' · ');
    const followUp = assessment.needsNewTreatment
      ? `Novo ciclo indicado${assessment.nextTreatmentWhen ? ` · ${esc(assessment.nextTreatmentWhen)}` : ''}.`
      : 'Ciclo encerrado sem novo tratamento indicado.';
    return `<div class="oc-status-icon" aria-hidden="true">✓</div><div><strong>Tratamento concluído</strong><span>${result || 'Avaliação final registrada.'}</span><small>${followUp}</small></div>`;
  }
  return '';
}

function moveDestructiveAction(card) {
  const button = card.querySelector('[data-interrupt-treatment]');
  if (!button || button.closest('[data-oc-more-actions]')) return;
  const row = card.querySelector('.button-row');
  if (!row) return;
  const details = document.createElement('details');
  details.className = 'oc-more-actions';
  details.dataset.ocMoreActions = 'true';
  const summary = document.createElement('summary');
  summary.textContent = 'Mais opções';
  details.appendChild(summary);
  button.classList.remove('danger');
  button.classList.add('oc-destructive-action');
  details.appendChild(button);
  row.appendChild(details);
}
function enhanceTreatmentCards() {
  const state = store.getState();
  for (const card of document.querySelectorAll('.treatment-card[data-treatment-id]')) {
    const treatment = (state.treatments || []).find((item) => item.id === card.dataset.treatmentId);
    if (!treatment) continue;
    const resolution = treatmentComponentResolution(state, treatment.id);
    let status = card.querySelector('[data-operational-status]');
    const html = treatmentStatusHtml(state, treatment);
    if (html) {
      if (!status) {
        status = document.createElement('div');
        status.className = 'oc-treatment-status';
        status.dataset.operationalStatus = 'true';
        const row = card.querySelector('.button-row');
        row?.before(status) || card.appendChild(status);
      }
      if (status.innerHTML !== html) status.innerHTML = html;
    } else {
      status?.remove();
    }

    const finalButton = card.querySelector('[data-final-cycle]');
    if (finalButton && finalButton.textContent !== 'Realizar avaliação final') finalButton.textContent = 'Realizar avaliação final';

    const reviewButton = card.querySelector('[data-review-treatment]');
    if (reviewButton) reviewButton.hidden = Boolean(treatment.status === TreatmentStatus.IN_PROGRESS && resolution.readyForFinalAssessment);

    moveDestructiveAction(card);
  }
}

function toggleNextCycle(form) {
  const check = form.querySelector('[name="needsNewTreatment"]');
  const field = form.querySelector('[data-next-cycle-field]');
  if (!check || !field) return;
  field.hidden = !check.checked;
  const input = field.querySelector('[name="nextTreatmentWhen"]');
  if (input) input.disabled = !check.checked;
}
function enhanceFinalAssessment() {
  const form = document.querySelector('#final-assessment-form,#final-cycle-form');
  if (!form) return;

  const state = store.getState();
  const treatmentId = form.dataset.treatment;
  const treatment = (state.treatments || []).find((item) => item.id === treatmentId);
  form.classList.add('oc-final-form');

  if (!form.querySelector('[data-oc-final-baseline]')) {
    const baseline = treatment?.hawkinsBaselineHertz;
    const section = document.createElement('section');
    section.className = 'oc-final-baseline';
    section.dataset.ocFinalBaseline = 'true';
    section.innerHTML = `<p class="eyebrow">Como este ciclo começou</p><div class="oc-baseline-value"><span>Medição Hawkins inicial</span><strong>${baseline ? `${esc(baseline)} Hz` : 'Não vinculada'}</strong></div><small>${baseline ? 'Use a mesma escala na medição final para comparar a evolução.' : 'A medição inicial não está vinculada a este tratamento; registre a avaliação final normalmente.'}</small>`;
    form.prepend(section);
  }

  const frequency = form.querySelector('[name="frequency"]');
  const frequencyField = frequency?.closest('.field');
  if (frequencyField && !form.querySelector('[data-oc-current-heading]')) {
    const heading = document.createElement('div');
    heading.className = 'oc-current-heading';
    heading.dataset.ocCurrentHeading = 'true';
    heading.innerHTML = '<p class="eyebrow">Como está agora</p><strong>Registre a medição final</strong>';
    frequencyField.before(heading);
  }
  const frequencyLabel = frequencyField?.querySelector('label');
  if (frequencyLabel) frequencyLabel.textContent = 'Frequência vibracional de Hawkins — medição final (Hz)';
  const helper = frequencyField?.querySelector('.hawkins-helper');
  if (helper) helper.textContent = 'Use a mesma escala e o mesmo método da medição inicial.';

  const imbalance = form.querySelector('[name="imbalancePercent"]');
  const imbalanceLabel = imbalance?.closest('.field')?.querySelector('label');
  if (imbalanceLabel) imbalanceLabel.textContent = 'Desequilíbrio atual (%)';

  const check = form.querySelector('[name="needsNewTreatment"]');
  const checkRow = check?.closest('.check-row');
  if (checkRow) {
    const label = checkRow.querySelector('span');
    if (label) label.textContent = 'Um novo ciclo será necessário';
    if (!form.querySelector('[data-oc-decision-heading]')) {
      const heading = document.createElement('div');
      heading.className = 'oc-decision-heading';
      heading.dataset.ocDecisionHeading = 'true';
      heading.innerHTML = '<p class="eyebrow">Decisão</p><strong>O ciclo pode ser encerrado?</strong><span>Se nenhum novo ciclo for necessário, deixe a opção abaixo desmarcada.</span>';
      checkRow.before(heading);
    }
  }

  const next = form.querySelector('[name="nextTreatmentWhen"]')?.closest('.field');
  if (next) {
    next.dataset.nextCycleField = 'true';
    const label = next.querySelector('label');
    if (label) label.textContent = 'Quando pretende iniciar ou reavaliar o próximo ciclo?';
  }
  toggleNextCycle(form);

  const notes = form.querySelector('[name="notes"]')?.closest('.field');
  const notesLabel = notes?.querySelector('label');
  if (notesLabel) notesLabel.textContent = 'Observações finais';

  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.textContent !== 'Concluir tratamento') submit.textContent = 'Concluir tratamento';
}

function enhance() {
  enhanceHome();
  clarifySessionCounters();
  enhanceTreatmentFilters();
  enhanceTreatmentCards();
  enhanceFinalAssessment();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
store.subscribe(schedule);
queueMicrotask(schedule);

document.addEventListener('change', (event) => {
  if (!event.target.matches('#final-assessment-form [name="needsNewTreatment"],#final-cycle-form [name="needsNewTreatment"]')) return;
  toggleNextCycle(event.target.form);
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-oc-treatment-action]');
  if (!button) return;
  const treatmentId = button.dataset.treatmentId;
  const mode = button.dataset.ocTreatmentAction;
  document.querySelector('[data-route="treatments"]')?.click();
  const attempt = (count = 0) => {
    const card = document.querySelector(`.treatment-card[data-treatment-id="${CSS.escape(treatmentId)}"]`);
    if (!card && count < 30) {
      requestAnimationFrame(() => attempt(count + 1));
      return;
    }
    if (!card) return;
    card.scrollIntoView({ behavior:'smooth', block:'center' });
    card.classList.add('oc-focus-treatment');
    setTimeout(() => card.classList.remove('oc-focus-treatment'), 1600);
    if (mode === 'final') card.querySelector('[data-final-cycle]')?.click();
    if (mode === 'review') card.querySelector('[data-review-treatment]')?.click();
  };
  requestAnimationFrame(() => attempt());
}, true);
