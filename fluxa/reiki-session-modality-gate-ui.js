import { createStore } from './store.js';
import { getOpenSession } from './domain.js';
import { activeReikiApplication, isReikiEnabled } from './reiki-modality.js';

const store = createStore();
let enhancing = false;

function currentSession(state = store.getState()) {
  return getOpenSession(state);
}

function closeStaleStartDialog() {
  document.querySelector('#reiki-session-start-overlay')?.remove();
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const state = store.getState();
    const session = currentSession(state);
    if (!session) return;

    const enabled = isReikiEnabled(state);
    const active = activeReikiApplication(state, session.id);
    document.querySelectorAll('[data-action="reiki"]').forEach((button) => {
      if (enabled) {
        button.hidden = false;
        button.removeAttribute('aria-hidden');
      } else {
        button.hidden = true;
        button.setAttribute('aria-hidden', 'true');
      }
    });

    if (!enabled && !active) closeStaleStartDialog();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => queueMicrotask(enhance));

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-action="reiki"]');
  if (!button) return;
  const state = store.getState();
  const session = currentSession(state);
  if (!session || isReikiEnabled(state)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  closeStaleStartDialog();
}, true);
