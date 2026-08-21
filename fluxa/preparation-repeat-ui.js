import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store = createStore();
let enhancing = false;

function previousPreparation(state, currentSessionId) {
  return (state.preparationRuns || [])
    .filter((run) => run.sessionId !== currentSessionId && run.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt || b.updatedAt || b.createdAt || '').localeCompare(a.completedAt || a.updatedAt || a.createdAt || ''))[0] || null;
}

function reusableData(state, currentSessionId) {
  const previous = previousPreparation(state, currentSessionId);
  if (!previous) return null;
  const activeIds = new Set((state.tools || []).filter((tool) => !tool.archivedAt).map((tool) => tool.id));
  const toolIds = (previous.protection?.toolIds || []).filter((id) => activeIds.has(id));
  const scale = previous.frequencyMeasurement?.scale || '';
  if (!toolIds.length && !scale) return null;
  return { previous, toolIds, scale };
}

function ensureReuseAction() {
  const section = document.querySelector('[data-prep-structured]');
  if (!section || section.querySelector('[data-prep-reuse-box]')) return;
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) return;
  const current = latestPreparation(state, session.id);
  if (!current || current.status === 'COMPLETED') return;
  const reusable = reusableData(state, session.id);
  if (!reusable) return;

  const box = document.createElement('div');
  box.className = 'repeat-component-box';
  box.dataset.prepReuseBox = 'true';
  const toolCount = reusable.toolIds.length;
  box.innerHTML = `<div><span>Atalho seguro</span><strong>Reutilizar ${toolCount ? `${toolCount} recurso(s) de proteção` : 'preferências'}${reusable.scale ? ` · escala ${reusable.scale}` : ''}</strong></div><button type="button" class="btn secondary small" data-reuse-preparation-preferences>Usar preferências</button>`;
  section.querySelector(':scope > div')?.after(box) || section.prepend(box);
}

function applyPreferences() {
  const state = store.getState();
  const session = getOpenSession(state);
  const section = document.querySelector('[data-prep-structured]');
  if (!session || !section) return;
  const reusable = reusableData(state, session.id);
  if (!reusable) return;

  const scale = section.querySelector('[data-prep-frequency-scale]');
  if (scale && reusable.scale && !scale.value) {
    scale.value = reusable.scale;
    scale.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const allowed = new Set(reusable.toolIds);
  section.querySelectorAll('[data-prep-protection-tool]').forEach((input) => {
    if (!allowed.has(input.value)) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const button = section.querySelector('[data-reuse-preparation-preferences]');
  if (button) {
    button.textContent = 'Preferências aplicadas';
    button.disabled = true;
  }
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { ensureReuseAction(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-reuse-preparation-preferences]')) return;
  applyPreferences();
}, true);
