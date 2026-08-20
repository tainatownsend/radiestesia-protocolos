import { createStore } from './store.js';
import { treatmentComponentResolution } from './remaining.js';
import { requirePreparedSessionState } from './session-rules.js';

const store = createStore();

function removeLegacyCompletedAssessmentActions() {
  document.querySelectorAll('[data-backlog-final-assessment]').forEach((button) => button.remove());
}

new MutationObserver(removeLegacyCompletedAssessmentActions).observe(document.body, { childList:true, subtree:true });
queueMicrotask(removeLegacyCompletedAssessmentActions);

document.addEventListener('submit', (event) => {
  const form = event.target;
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
