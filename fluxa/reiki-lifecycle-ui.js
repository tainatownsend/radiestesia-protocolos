import { createStore } from './store.js';
import { activeReikiApplication, cancelReikiApplication } from './reiki-lifecycle.js';

const store = createStore();

function timerApplicationId(timer) {
  return timer.querySelector('[data-live-timer]')?.dataset.liveTimer ||
    timer.querySelector('[data-reiki-outside-pause]')?.dataset.reikiOutsidePause ||
    timer.querySelector('[data-reiki-outside-resume]')?.dataset.reikiOutsideResume ||
    timer.querySelector('[data-reiki-outside-finish]')?.dataset.reikiOutsideFinish || null;
}

function injectCancel() {
  document.querySelectorAll('.timer-sheet').forEach((timer) => {
    if (timer.querySelector('[data-cancel-reiki]')) return;
    const appId = timerApplicationId(timer);
    const app = store.getState().reikiApplications.find((item) => item.id === appId && ['RUNNING','PAUSED'].includes(item.status));
    if (!app) return;
    const row = timer.querySelector('.button-row');
    if (!row) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn danger';
    button.dataset.cancelReiki = app.id;
    button.textContent = 'Cancelar aplicação';
    row.appendChild(button);
  });
}

new MutationObserver(injectCancel).observe(document.body, { childList:true, subtree:true });
queueMicrotask(injectCancel);

// Prevent accidental parallel Reiki applications, including when the current one is paused.
document.addEventListener('click', (event) => {
  const start = event.target.closest('[data-action="reiki"]');
  if (!start) return;
  const active = activeReikiApplication(store.getState());
  if (!active) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const open = document.querySelector(`[data-open-reiki="${active.id}"]`);
  if (open) open.click();
  else alert('Já existe uma aplicação de Reiki ativa. Conclua, cancele ou retome essa aplicação antes de iniciar outra.');
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cancel-reiki]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!confirm('Cancelar esta aplicação de Reiki mantendo o registro no histórico?')) return;
  try {
    cancelReikiApplication(store, button.dataset.cancelReiki, 'Cancelada pela terapeuta');
    const close = document.querySelector('[data-action="dismiss-sheet"], [data-reiki-outside-close]');
    if (close) close.click();
    else document.querySelector('#reiki-outside-overlay')?.remove();
    location.reload();
  } catch (error) { alert(error.message); }
}, true);
