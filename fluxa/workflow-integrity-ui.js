import { createStore } from './store.js';
import { treatmentComponentResolution } from './remaining.js';
import { requirePreparedSessionState } from './session-rules.js';

const store = createStore();

function currentOpenSession(state) {
  return (state.sessions || []).find((item) => item.status === 'OPEN') || null;
}

function requirePreparedCurrentSession(message) {
  const state = store.getState();
  const session = currentOpenSession(state);
  if (!session) throw new Error('Abra uma sessão antes de realizar esta ação.');
  return requirePreparedSessionState(state, session.id, message);
}

function suppressLegacyCompletedAssessmentActions() {
  document.querySelectorAll('[data-backlog-final-assessment]').forEach((button) => {
    button.hidden = true;
    button.disabled = true;
    button.setAttribute('aria-hidden','true');
    button.tabIndex = -1;
  });
}

function disableEarlyComponentReviews() {
  const state = store.getState();
  document.querySelectorAll('[data-component-dismantle]').forEach((button) => {
    const component = state.treatmentComponents.find((item) => item.id === button.dataset.componentDismantle);
    if (!component || component.status !== 'IN_PROGRESS') return;
    const future = component.expectedEndAt && new Date(component.expectedEndAt).getTime() > Date.now();
    button.disabled = Boolean(future);
    if (future) {
      button.textContent = `Revisão em ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(component.expectedEndAt))}`;
      button.setAttribute('aria-label', `Revisão disponível em ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(component.expectedEndAt))}`);
    }
  });
}

function enhance() {
  suppressLegacyCompletedAssessmentActions();
  disableEarlyComponentReviews();
}
new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action="investigate"],[data-action="resume-latest-investigation"],[data-action="treat-direct"],[data-answer]');
  if (!target) return;
  try {
    requirePreparedCurrentSession('Conclua a preparação da sessão antes de investigar ou iniciar um tratamento.');
  } catch (error) {
    event.preventDefault();
    event.stopImmediatePropagation();
    alert(error.message);
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (['treatment-form','findings-form','review-form'].includes(form.id)) {
    try {
      requirePreparedCurrentSession('Conclua a preparação da sessão antes de continuar este trabalho.');
    } catch (error) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(error.message);
      return;
    }
  }

  if (!['final-assessment-form','final-cycle-form'].includes(form.id)) return;
  const state = store.getState();
  const treatmentId = form.dataset.treatment;
  try {
    requirePreparedSessionState(state, form.dataset.session, 'Conclua a preparação da sessão antes da avaliação final.');
    const treatment = state.treatments.find((item) => item.id === treatmentId);
    if (!treatment || treatment.status !== 'IN_PROGRESS') throw new Error('A avaliação final só pode ser registrada enquanto o tratamento está em andamento.');
    if (!treatmentComponentResolution(state, treatmentId).readyForFinalAssessment) {
      throw new Error('Resolva todos os componentes antes de registrar a avaliação final.');
    }
  } catch (error) {
    event.preventDefault();
    event.stopImmediatePropagation();
    alert(error.message);
  }
}, true);
