import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

if (new URLSearchParams(location.search).get('qa') === '1') {
  const store = createStore();

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
    store.setState((state) => {
      const draft = structuredClone(state);
      const target = draft.sessions.find((item) => item.id === session.id);
      target.startedAt = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
      target.updatedAt = store.nowIso();
      return draft;
    });
    location.reload();
  }, true);
}
