import { createStore } from './store.js';
import { getOpenSession, selectAssistedForSession } from './domain.js';

const store = createStore();
let pendingAction = null;
let bypassSignature = null;
let waitingForNewAssisted = false;
let enhancing = false;

const GUARDED_ACTIONS = new Set([
  'investigate',
  'resume-latest-investigation',
  'treat-direct',
  'reiki',
  'add-note'
]);

function esc(value = '') {
  return String(value).replace(/[&<>\'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function activeAssisted(state) {
  return (state.assistedEntities || [])
    .filter((item) => !item.archivedAt)
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'pt-BR'));
}

function signatureFor(button) {
  if (!button) return null;
  if (button.dataset.action && GUARDED_ACTIONS.has(button.dataset.action)) {
    return { type:'action', value:button.dataset.action };
  }
  if (button.dataset.generalAssessment !== undefined) return { type:'general-assessment', value:'1' };
  if (button.dataset.startBranching) return { type:'branching', value:button.dataset.startBranching };
  return null;
}

function signatureKey(signature) {
  return signature ? `${signature.type}:${signature.value}` : '';
}

function findButton(signature) {
  if (!signature) return null;
  if (signature.type === 'action') return document.querySelector(`[data-action="${CSS.escape(signature.value)}"]`);
  if (signature.type === 'general-assessment') return document.querySelector('[data-general-assessment]');
  if (signature.type === 'branching') return document.querySelector(`[data-start-branching="${CSS.escape(signature.value)}"]`);
  return null;
}

function closeGuard() {
  document.querySelector('#assisted-context-overlay')?.remove();
}

function openNewAssisted() {
  waitingForNewAssisted = Boolean(pendingAction && getOpenSession(store.getState()));
  closeGuard();
  document.querySelector('[data-route="assisted"]')?.click();
  queueMicrotask(() => {
    document.querySelectorAll('body > .modal-backdrop').forEach((overlay) => overlay.remove());
    document.querySelector('[data-action="new-assisted"]')?.click();
  });
}

function guardDialog(signature) {
  closeGuard();
  pendingAction = signature;
  const state = store.getState();
  const items = activeAssisted(state);
  const wrap = document.createElement('div');
  wrap.id = 'assisted-context-overlay';
  wrap.className = 'modal-backdrop';

  if (!items.length) {
    wrap.innerHTML = `<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Assistido necessário</p><h2>Cadastre um assistido para continuar</h2></div><button class="close-btn" data-assisted-guard-close>×</button></div><p class="muted">Esta atividade precisa ficar vinculada a um assistido. Ainda não há nenhum assistido cadastrado no Fluxa.</p><div class="button-row"><button class="btn primary wide" data-assisted-guard-new>Cadastrar assistido</button></div></section>`;
  } else {
    wrap.innerHTML = `<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Assistido necessário</p><h2>Escolha quem receberá esta atividade</h2></div><button class="close-btn" data-assisted-guard-close>×</button></div><p class="muted">Selecione um assistido cadastrado ou cadastre um novo assistido antes de continuar.</p><div class="assisted-list">${items.map((item) => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong></div><button class="btn secondary small" data-assisted-guard-select="${item.id}">Usar</button></div>`).join('')}</div><div class="section"><button class="btn primary wide" data-assisted-guard-new>Cadastrar novo assistido</button></div></section>`;
  }
  document.body.appendChild(wrap);
}

function replayPending(attempt = 0) {
  const signature = pendingAction;
  if (!signature) return;
  closeGuard();
  bypassSignature = signatureKey(signature);
  const button = findButton(signature);
  if (button) {
    pendingAction = null;
    button.click();
    return;
  }
  if (attempt < 3) {
    requestAnimationFrame(() => replayPending(attempt + 1));
  } else {
    bypassSignature = null;
    pendingAction = null;
  }
}

function ensureGuardedButtonsClickable() {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session || session.currentAssistedEntityId) return;
  document.querySelectorAll('[data-action]').forEach((button) => {
    if (!GUARDED_ACTIONS.has(button.dataset.action)) return;
    button.disabled = false;
    button.removeAttribute('disabled');
  });
}

function enhanceAssistedSelects() {
  const state = store.getState();
  const items = activeAssisted(state);
  document.querySelectorAll('form select[name="assistedEntityId"]').forEach((select) => {
    const form = select.closest('form');
    if (!form || form.dataset.assistedGuardEnhanced) return;
    form.dataset.assistedGuardEnhanced = 'true';
    const field = select.closest('.field') || select.parentElement;
    const helper = document.createElement('div');
    helper.className = 'notice';
    helper.dataset.assistedGuardFormNotice = 'true';
    helper.innerHTML = items.length
      ? `Selecione um assistido cadastrado ou <button type="button" class="btn ghost small" data-assisted-guard-new>cadastre um novo</button>.`
      : `Nenhum assistido cadastrado. <button type="button" class="btn primary small" data-assisted-guard-new>Cadastrar assistido</button>`;
    field?.after(helper);
    if (!items.length) {
      select.disabled = true;
      select.setAttribute('aria-disabled', 'true');
    }
  });
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureGuardedButtonsClickable();
    enhanceAssistedSelects();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

store.subscribe(() => {
  if (!waitingForNewAssisted || !pendingAction) return;
  const session = getOpenSession(store.getState());
  if (!session?.currentAssistedEntityId) return;
  waitingForNewAssisted = false;
  queueMicrotask(() => {
    document.querySelector('[data-route="today"]')?.click();
    requestAnimationFrame(() => replayPending());
  });
});

// Capture before the individual feature modules so every activity gets the same assisted-context rule.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.assistedGuardClose !== undefined) {
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingAction = null;
    waitingForNewAssisted = false;
    closeGuard();
    return;
  }

  if (button.dataset.assistedGuardNew !== undefined) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openNewAssisted();
    return;
  }

  if (button.dataset.assistedGuardSelect) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = store.getState();
    const session = getOpenSession(state);
    if (!session) {
      closeGuard();
      alert('Abra uma sessão antes de selecionar o assistido para esta atividade.');
      return;
    }
    try {
      selectAssistedForSession(store, session.id, button.dataset.assistedGuardSelect);
      replayPending();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const signature = signatureFor(button);
  if (!signature) return;
  const key = signatureKey(signature);
  if (bypassSignature === key) {
    bypassSignature = null;
    return;
  }

  const state = store.getState();
  const session = getOpenSession(state);
  if (session && !session.currentAssistedEntityId) {
    event.preventDefault();
    event.stopImmediatePropagation();
    guardDialog(signature);
  }
}, true);

// Forms outside the session (for example retrospective/out-of-session Reiki and planning)
// receive the same explicit message instead of relying on browser-native required-field copy.
document.addEventListener('submit', (event) => {
  const form = event.target;
  const select = form.querySelector?.('select[name="assistedEntityId"]');
  if (!select) return;
  const items = activeAssisted(store.getState());
  if (!items.length || !select.value) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!items.length) {
      alert('Cadastre um assistido antes de continuar esta atividade.');
      openNewAssisted();
    } else {
      alert('Selecione um assistido cadastrado ou cadastre um novo assistido antes de continuar.');
      select.focus();
    }
  }
}, true);
