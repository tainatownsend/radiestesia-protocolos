import { createStore } from './store.js';

const store = createStore();
const FAVORITES_KEY = 'fluxa.assistedFavorites';
let enhancing = false;

function norm(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function favoriteIds() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); } catch (_) { return new Set(); }
}
function saveFavorites(ids) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids])); } catch (_) {}
}
function recentRank(state) {
  const map = new Map();
  for (const event of state.events || []) {
    if (!event.assistedEntityId) continue;
    const value = event.occurredAt || event.createdAt || '';
    if (value > (map.get(event.assistedEntityId) || '')) map.set(event.assistedEntityId, value);
  }
  return map;
}
function pickerRows(list) {
  return [...list.querySelectorAll(':scope > .assisted-row')].map((row) => {
    const select = row.querySelector('[data-assisted-guard-select],[data-select-assisted]');
    const id = select?.dataset.assistedGuardSelect || select?.dataset.selectAssisted;
    return { row, select, id, name: row.querySelector('.assisted-meta strong')?.textContent?.trim() || '' };
  }).filter((item) => item.id);
}
function decoratePicker(list) {
  if (list.dataset.quickAssistedPicker) return;
  const rows = pickerRows(list);
  if (!rows.length) return;
  list.dataset.quickAssistedPicker = 'true';

  if (rows.length >= 6) {
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'checklist-search assisted-picker-search';
    search.dataset.assistedPickerSearch = 'true';
    search.placeholder = 'Buscar assistido';
    search.setAttribute('aria-label', 'Buscar assistido');
    list.before(search);
  }

  const favorites = favoriteIds();
  const recent = recentRank(store.getState());
  rows.forEach((item) => {
    item.row.dataset.assistedQuickId = item.id;
    item.row.dataset.assistedQuickName = norm(item.name);
    item.row.dataset.assistedQuickRecent = recent.get(item.id) || '';
    const favorite = favorites.has(item.id);
    item.row.dataset.assistedQuickFavorite = favorite ? 'true' : 'false';
    if (!item.row.querySelector('[data-toggle-assisted-favorite]')) {
      const star = document.createElement('button');
      star.type = 'button';
      star.className = `assisted-favorite-toggle${favorite ? ' active' : ''}`;
      star.dataset.toggleAssistedFavorite = item.id;
      star.textContent = '★';
      star.setAttribute('aria-label', favorite ? 'Remover assistido dos favoritos' : 'Adicionar assistido aos favoritos');
      item.row.prepend(star);
    }
  });
  sortPicker(list);
}
function sortPicker(list) {
  const rows = pickerRows(list);
  const ordered = [...rows].sort((a, b) => {
    const fa = a.row.dataset.assistedQuickFavorite === 'true';
    const fb = b.row.dataset.assistedQuickFavorite === 'true';
    if (fa !== fb) return fb - fa;
    const ra = a.row.dataset.assistedQuickRecent || '';
    const rb = b.row.dataset.assistedQuickRecent || '';
    if (ra !== rb) return rb.localeCompare(ra);
    return a.name.localeCompare(b.name, 'pt-BR');
  });
  const current = rows.map((item) => item.id).join('|');
  const next = ordered.map((item) => item.id).join('|');
  if (current === next) return;
  ordered.forEach((item) => list.appendChild(item.row));
}
function refreshFavorite(id) {
  const favorites = favoriteIds();
  document.querySelectorAll(`[data-assisted-quick-id="${CSS.escape(id)}"]`).forEach((row) => {
    const favorite = favorites.has(id);
    row.dataset.assistedQuickFavorite = favorite ? 'true' : 'false';
    const star = row.querySelector('[data-toggle-assisted-favorite]');
    if (star) {
      star.classList.toggle('active', favorite);
      star.setAttribute('aria-label', favorite ? 'Remover assistido dos favoritos' : 'Adicionar assistido aos favoritos');
    }
    const list = row.closest('.assisted-list');
    if (list) sortPicker(list);
  });
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    document.querySelectorAll('#assisted-context-overlay .assisted-list, .modal-backdrop .assisted-list').forEach(decoratePicker);
  } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
queueMicrotask(enhance);

document.addEventListener('input', (event) => {
  if (!event.target.matches('[data-assisted-picker-search]')) return;
  const q = norm(event.target.value);
  const list = event.target.nextElementSibling?.matches('.assisted-list') ? event.target.nextElementSibling : event.target.parentElement?.querySelector('.assisted-list');
  list?.querySelectorAll('[data-assisted-quick-id]').forEach((row) => {
    row.hidden = Boolean(q && !row.dataset.assistedQuickName.includes(q));
  });
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-toggle-assisted-favorite]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const ids = favoriteIds();
  const id = button.dataset.toggleAssistedFavorite;
  ids.has(id) ? ids.delete(id) : ids.add(id);
  saveFavorites(ids);
  refreshFavorite(id);
}, true);
