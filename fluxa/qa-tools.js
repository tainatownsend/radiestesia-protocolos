import { createStore } from './store.js';
import { EventType, getOpenSession } from './domain.js';

const QA_FORGOTTEN_PREFIX = 'fluxa.qa.forgotten.';
const FORGOTTEN_DISMISS_PREFIX = 'fluxa.forgotten.dismissed.';

if (new URLSearchParams(location.search).get('qa') === '1') {
  const store = createStore();

  function qaKey(sessionId) { return `${QA_FORGOTTEN_PREFIX}${sessionId}`; }
  function dismissKey(sessionId) { return `${FORGOTTEN_DISMISS_PREFIX}${sessionId}`; }

  // Repair sessions changed by the first QA helper version, which moved startedAt back 13 hours.
  const open = getOpenSession(store.getState());
  if (open) {
    const startEvent = store.getState().events.find((event) => event.eventType === EventType.SESSION_STARTED && event.entityId === open.id);
    if (startEvent?.occurredAt && startEvent.occurredAt !== open.startedAt) {
      store.setState((state) => {
        const draft = structuredClone(state);
        const target = draft.sessions.find((item) => item.id === open.id);
        if (target) {
          target.startedAt = startEvent.occurredAt;
          target.updatedAt = store.nowIso();
        }
        return draft;
      });
    }
  }

  function ensureButton() {
    if (document.querySelector('[data-qa-forgotten-session]')) return;
    const main = document.querySelector('main');
    const session = getOpenSession(store.getState());
    if (!main || !session) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ghost small';
    button.dataset.qaForgottenSession = 'true';
    button.textContent = 'QA: simular sessão esquecida';
    button.style.marginTop = '12px';
    main.appendChild(button);
  }

  new MutationObserver(ensureButton).observe(document.querySelector('#app'), { childList:true, subtree:true });
  queueMicrotask(ensureButton);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-qa-forgotten-session]');
    if (!button) return;
    const session = getOpenSession(store.getState());
    if (!session) return;
    sessionStorage.setItem(qaKey(session.id), '1');
    sessionStorage.removeItem(dismissKey(session.id));
    location.reload();
  }, true);
}
