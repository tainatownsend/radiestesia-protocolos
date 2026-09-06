import { createStore } from './store.js';
import { getOpenSession, treatmentNeedsReview, TreatmentStatus } from './domain.js';
import { treatmentComponentResolution } from './remaining.js';
import { resumeTreatmentPreservingDuration } from './backlog.js';

const store = createStore();
let scheduled = false;
let bootRouteHandled = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function manualReviewReady(state, treatment) {
  if (!treatment || treatment.status !== TreatmentStatus.IN_PROGRESS) return false;
  return (state.treatmentComponents || []).some((component) => component.treatmentId === treatment.id && component.status === TreatmentStatus.IN_PROGRESS && !component.expectedEndAt);
}
function reviewReady(state, treatment) {
  return treatmentNeedsReview(state, treatment) || manualReviewReady(state, treatment);
}
function treatmentForCard(state, card) {
  return (state.treatments || []).find((item) => item.id === card.dataset.treatmentId) || null;
}
function ensureManualReviewActions() {
  const state = store.getState();
  const reviewFilter = document.querySelector('[data-treatment-filter="REVIEW"].primary');
  for (const card of document.querySelectorAll('.treatment-card[data-treatment-id]')) {
    const treatment = treatmentForCard(state, card);
    if (!treatment || !manualReviewReady(state, treatment)) continue;
    const resolution = treatmentComponentResolution(state, treatment.id);
    if (resolution.readyForFinalAssessment) continue;
    let review = card.querySelector('[data-review-treatment]');
    if (!review) {
      const row = card.querySelector('.button-row');
      if (!row) continue;
      review = document.createElement('button');
      review.type = 'button';
      review.className = 'btn primary small mx3-action-primary';
      review.dataset.reviewTreatment = treatment.id;
      review.dataset.fluxaManualReview = 'true';
      review.textContent = 'Revisar';
      const components = row.querySelector('[data-backlog-manage-components]');
      components?.before(review) || row.prepend(review);
    }
    if (reviewFilter) card.hidden = false;
    let status = card.querySelector('[data-fluxa-manual-review-status]');
    if (!status) {
      status = document.createElement('div');
      status.className = 'oc-treatment-status';
      status.dataset.fluxaManualReviewStatus = 'true';
      status.innerHTML = '<div class="oc-status-icon" aria-hidden="true">↻</div><div><strong>Revisão manual disponível</strong><span>Este componente não possui prazo automático; revise quando o trabalho estiver pronto para conferência.</span></div>';
      card.querySelector('.button-row')?.before(status);
    }
  }
}
function enhanceReviewFilterCount() {
  const state = store.getState();
  const button = document.querySelector('[data-treatment-filter="REVIEW"]');
  if (!button) return;
  const count = (state.treatments || []).filter((treatment) => reviewReady(state, treatment)).length;
  const text = `Para revisão ${count}`;
  if (button.textContent !== text) button.textContent = text;
  button.setAttribute('aria-label', `Para revisão: ${count}`);
}
function ensureAssistedInTaskHeaders() {
  const state = store.getState();
  const session = getOpenSession(state);
  const assisted = (state.assistedEntities || []).find((item) => item.id === session?.currentAssistedEntityId);
  if (!assisted) return;
  for (const sheet of document.querySelectorAll('.fluxa-managed-sheet')) {
    const relevant = sheet.querySelector('#treatment-form,#final-assessment-form,#final-cycle-form,[data-hawkins-baseline-form],#reiki-session-start-form,.question-panel,#findings-form,#branch-findings-form');
    if (!relevant) continue;
    const head = sheet.querySelector(':scope > .sheet-head');
    if (!head || head.querySelector('[data-fluxa-sheet-assisted]')) continue;
    const context = document.createElement('small');
    context.dataset.fluxaSheetAssisted = 'true';
    context.className = 'fluxa-sheet-assisted';
    context.textContent = assisted.displayName || 'Assistido';
    const copy = head.querySelector(':scope > div');
    copy?.appendChild(context);
  }
}
function ensureTreatmentPrerequisiteCopy() {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) return;
  const assistedId = session.currentAssistedEntityId;
  for (const card of document.querySelectorAll('.treatment-card[data-treatment-id]')) {
    const treatment = treatmentForCard(state, card);
    if (!treatment) continue;
    const start = card.querySelector('[data-start-planned-treatment]');
    if (!start) continue;
    let helper = card.querySelector('[data-fluxa-planned-prereq]');
    const reasons = [];
    if (!assistedId) reasons.push('escolher o Assistido');
    else if (assistedId !== treatment.assistedEntityId) reasons.push('trocar para o Assistido deste tratamento');
    const prepared = (state.preparationRuns || []).some((run) => run.sessionId === session.id && run.status === 'COMPLETED');
    if (!prepared) reasons.push('concluir a preparação');
    if (!reasons.length) { helper?.remove(); continue; }
    if (!helper) {
      helper = document.createElement('small');
      helper.className = 'muted';
      helper.dataset.fluxaPlannedPrereq = 'true';
      start.before(helper);
    }
    helper.textContent = `Antes de iniciar: ${reasons.join(' e ')}.`;
  }
}
function prioritizeOpenSessionOnBoot() {
  if (bootRouteHandled) return;
  const session = getOpenSession(store.getState());
  if (!session) { bootRouteHandled = true; return; }
  const nav = document.querySelector('[data-workspace-nav-shell]');
  if (!nav) return;
  bootRouteHandled = true;
  const active = nav.querySelector('[data-workspace-route].active')?.dataset.workspaceRoute;
  if (active && active !== 'today') nav.querySelector('[data-workspace-route="today"]')?.click();
}
function enhance() {
  ensureManualReviewActions();
  enhanceReviewFilterCount();
  ensureAssistedInTaskHeaders();
  ensureTreatmentPrerequisiteCopy();
  prioritizeOpenSessionOnBoot();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
store.subscribe(schedule);
window.addEventListener('fluxa:state-changed', schedule);
queueMicrotask(schedule);

/* A recommendation from Hoje must never be hidden by a sticky treatment filter.
   Window capture runs before the older document-capture navigation handler. */
window.addEventListener('click', (event) => {
  const recommended = event.target.closest?.('[data-oc-treatment-action]');
  if (recommended) {
    const revealAll = (attempt = 0) => {
      const all = document.querySelector('[data-treatment-filter="ALL"]');
      if (all) {
        if (!all.classList.contains('primary')) all.click();
        return;
      }
      if (attempt < 30) requestAnimationFrame(() => revealAll(attempt + 1));
    };
    requestAnimationFrame(() => revealAll());
  }

  const resume = event.target.closest?.('[data-resume-treatment]');
  if (!resume) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    resumeTreatmentPreservingDuration(store, resume.dataset.resumeTreatment, { preserveRemainingDuration:true });
    window.dispatchEvent(new CustomEvent('fluxa:state-changed'));
  } catch (error) {
    window.alert(error.message);
  }
}, true);
