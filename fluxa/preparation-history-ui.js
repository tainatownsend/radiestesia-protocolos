import { createStore } from './store.js';

const store = createStore();
let pendingSessionId = null;

function esc(value = '') {
  return String(value).replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '\"':'&quot;' }[c]));
}

function injectPreparationSummary(sessionId) {
  const overlay = document.querySelector('#history-overlay .detail-sheet');
  if (!overlay || overlay.querySelector('[data-preparation-history]')) return;
  const state = store.getState();
  const run = [...state.preparationRuns].filter((item) => item.sessionId === sessionId && item.status === 'COMPLETED').sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || ''))[0];
  if (!run) return;

  const snapshots = run.protection?.toolSnapshots || [];
  const protection = [
    ...snapshots.map((item) => item.name),
    ...(run.protection?.notes ? [run.protection.notes] : [])
  ].filter(Boolean);
  const section = document.createElement('section');
  section.className = 'section card soft';
  section.dataset.preparationHistory = 'true';
  section.innerHTML = `<p class="eyebrow">Preparação</p><h3>Registro desta sessão</h3>
    <p><strong>Frequência vibracional:</strong> ${esc(run.frequencyMeasurement?.value || '—')}${run.frequencyMeasurement?.scale ? ` · ${esc(run.frequencyMeasurement.scale)}` : ''}</p>
    <p><strong>Proteção:</strong> ${protection.length ? esc(protection.join(' · ')) : '—'}</p>
    ${run.permissionNotes ? `<p class="muted"><strong>Mantra / permissão:</strong> ${esc(run.permissionNotes)}</p>` : ''}`;
  const firstCard = overlay.querySelector('.card.soft');
  firstCard?.after(section);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-session-history]');
  if (!button) return;
  pendingSessionId = button.dataset.openSessionHistory;
  queueMicrotask(() => injectPreparationSummary(pendingSessionId));
}, true);

new MutationObserver(() => {
  if (pendingSessionId) injectPreparationSummary(pendingSessionId);
}).observe(document.body, { childList:true, subtree:true });
