import { createStore } from './store.js';
import { activeTools, ToolType } from './activity-library.js';

const store = createStore();
const FAVORITES_KEY = 'fluxa.toolFavorites';
let pickerFilter = 'ALL';
let pickerQuery = '';
let scheduled = false;

function ensureStyles() {
  if (document.querySelector('style[data-prep-mobile-ux-style]')) return;
  const style = document.createElement('style');
  style.dataset.prepMobileUxStyle = 'true';
  style.textContent = `
    .prep-resource-picker[data-prep-mobile-picker="true"] .prep-picker-row,
    .prep-resource-picker[data-prep-mobile-picker="true"] .prep-selected-tools{display:none!important}
    .prep-mobile-resource-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}
    .prep-mobile-summary-copy{min-width:0;flex:1}
    .prep-mobile-summary-copy strong{display:block;color:var(--primary-strong);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .prep-mobile-summary-copy small{display:block;margin-top:3px;color:var(--muted);font-size:11px}
    .prep-mobile-resource-summary .btn{flex:0 0 auto;min-height:36px}
    .prep-mobile-picker-sheet{max-width:620px;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}
    .prep-mobile-picker-sheet>.muted{margin-bottom:10px}
    .prep-mobile-filter-chips{display:flex;gap:7px;overflow-x:auto;padding:1px 0 8px;scrollbar-width:none}
    .prep-mobile-filter-chips::-webkit-scrollbar{display:none}
    .prep-mobile-filter-chip{flex:0 0 auto;min-height:34px;padding:0 11px;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--muted);font-size:11px;font-weight:750}
    .prep-mobile-filter-chip.active{background:var(--primary);border-color:var(--primary);color:#fff}
    .prep-mobile-picker-results{display:grid;gap:6px;max-height:min(48dvh,480px);overflow:auto;overscroll-behavior:contain;padding:1px 0 4px}
    .prep-mobile-picker-row{display:grid;grid-template-columns:36px minmax(0,1fr);gap:5px;align-items:center;border:1px solid var(--border);border-radius:12px;background:var(--surface);min-height:50px}
    .prep-mobile-picker-row.selected{background:var(--surface-2);border-color:color-mix(in srgb,var(--secondary) 60%,var(--border))}
    .prep-mobile-favorite{width:34px;height:34px;margin-left:2px;border:0;border-radius:50%;background:transparent;color:var(--border);font-size:18px}
    .prep-mobile-favorite.active{color:var(--accent)}
    .prep-mobile-pick-main{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;min-height:48px;padding:7px 10px 7px 4px;border:0;background:transparent;text-align:left;color:var(--text)}
    .prep-mobile-pick-main span{min-width:0;flex:1}
    .prep-mobile-pick-main strong{display:block;color:var(--primary-strong);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .prep-mobile-pick-main small{display:block;margin-top:2px;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .prep-mobile-pick-main b{display:grid;place-items:center;width:26px;height:26px;flex:0 0 auto;border-radius:50%;background:var(--surface-2);color:var(--primary);font-size:14px}
    .prep-mobile-picker-row.selected .prep-mobile-pick-main b{background:var(--primary);color:#fff}
    .prep-mobile-picker-footer{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px;padding:9px 0 calc(4px + env(safe-area-inset-bottom,0px));background:linear-gradient(to bottom,rgba(248,249,247,.82),var(--surface) 28%);z-index:3}
    .prep-mobile-picker-footer small{color:var(--muted);font-size:11px}
    @media(max-width:560px){
      .prep-mobile-picker-sheet{height:min(82dvh,760px);display:flex;flex-direction:column}
      .prep-mobile-picker-results{flex:1;max-height:none}
      .prep-mobile-resource-summary{padding:9px 10px}
    }
  `;
  const finalBrand = document.querySelector('link[href="idle-home-premium.css"]');
  document.head.insertBefore(style, finalBrand || null);
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function norm(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : 0;
}
function eligibleTools(state = store.getState()) {
  return activeTools(state).filter((tool) => tool.type === ToolType.GRAPH || tool.type === ToolType.OTHER);
}
function favoriteIds() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch (_) { return new Set(); }
}
function saveFavoriteIds(ids) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids])); }
  catch (_) {}
}
function graphToolIds(component) {
  const ids = [];
  const commands = Array.isArray(component?.commands) ? component.commands : Array.isArray(component?.treatmentItem?.commands) ? component.treatmentItem.commands : [];
  for (const command of commands) {
    for (const graph of (Array.isArray(command?.graphApplications) ? command.graphApplications : [])) {
      if (graph?.toolId) ids.push(String(graph.toolId));
    }
  }
  return ids;
}
function recentToolIds(state = store.getState(), limit = 12) {
  const ids = [];
  const seen = new Set();
  const add = (value) => {
    const id = String(value || '');
    if (!id || seen.has(id) || ids.length >= limit) return;
    seen.add(id);
    ids.push(id);
  };
  const components = [...(state.treatmentComponents || [])].sort((a, b) => timeValue(b.updatedAt || b.startedAt || b.createdAt) - timeValue(a.updatedAt || a.startedAt || a.createdAt));
  for (const component of components) {
    add(component.toolId);
    graphToolIds(component).forEach(add);
    if (ids.length >= limit) break;
  }
  const runs = [...(state.preparationRuns || [])].sort((a, b) => timeValue(b.updatedAt || b.completedAt || b.startedAt || b.createdAt) - timeValue(a.updatedAt || a.completedAt || a.startedAt || a.createdAt));
  for (const run of runs) {
    for (const id of (run?.protection?.toolIds || [])) add(id);
    if (ids.length >= limit) break;
  }
  return new Set(ids);
}
function preparationSection() {
  return document.querySelector('[data-prep-structured]');
}
function selectedIds(section = preparationSection()) {
  return new Set([...section?.querySelectorAll('[data-prep-protection-tool]:checked') || []].map((input) => String(input.value)));
}
function selectedTools(section = preparationSection()) {
  const ids = selectedIds(section);
  return eligibleTools().filter((tool) => ids.has(String(tool.id)));
}
function summaryText(section) {
  const items = selectedTools(section);
  if (!items.length) return 'Nenhum recurso selecionado';
  const visible = items.slice(0, 2).map((item) => item.name).join(' · ');
  const extra = items.length - 2;
  return extra > 0 ? `${visible} +${extra}` : visible;
}
function updateSummary(section = preparationSection()) {
  const summary = section?.querySelector('[data-prep-mobile-summary]');
  if (!summary) return;
  const items = selectedTools(section);
  const text = summary.querySelector('[data-prep-mobile-summary-text]');
  const count = summary.querySelector('[data-prep-mobile-summary-count]');
  const button = summary.querySelector('[data-open-prep-resource-picker]');
  if (text) text.textContent = summaryText(section);
  if (count) count.textContent = `${items.length} ${items.length === 1 ? 'selecionado' : 'selecionados'}`;
  if (button) button.textContent = items.length ? 'Editar' : 'Escolher recursos';
}
function enhancePreparationSummary() {
  const section = preparationSection();
  const field = section?.querySelector('.prep-resource-picker');
  if (!section || !field) return;
  if (!field.dataset.prepMobilePicker) {
    field.dataset.prepMobilePicker = 'true';
    const summary = document.createElement('div');
    summary.className = 'prep-mobile-resource-summary';
    summary.dataset.prepMobileSummary = 'true';
    summary.innerHTML = `<div class="prep-mobile-summary-copy"><strong data-prep-mobile-summary-text></strong><small data-prep-mobile-summary-count></small></div><button type="button" class="btn secondary small" data-open-prep-resource-picker></button>`;
    field.querySelector('.prep-picker-row')?.after(summary);
  }
  updateSummary(section);
}
function pickerTools() {
  const favorites = favoriteIds();
  const recent = recentToolIds();
  const q = norm(pickerQuery).trim();
  return eligibleTools().filter((tool) => {
    if (pickerFilter === 'FAVORITES' && !favorites.has(String(tool.id))) return false;
    if (pickerFilter === 'RECENT' && !recent.has(String(tool.id))) return false;
    if (!q) return true;
    return norm(`${tool.name || ''} ${tool.purpose || ''} ${(tool.tags || []).join(' ')} ${tool.notes || ''}`).includes(q);
  }).sort((a, b) => Number(favorites.has(String(b.id))) - Number(favorites.has(String(a.id))) || Number(recent.has(String(b.id))) - Number(recent.has(String(a.id))) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
}
function pickerRowsHtml() {
  const selected = selectedIds();
  const favorites = favoriteIds();
  const tools = pickerTools();
  if (!tools.length) return '<div class="empty">Nenhum recurso encontrado neste filtro.</div>';
  return tools.map((tool) => {
    const id = String(tool.id);
    const active = selected.has(id);
    const favorite = favorites.has(id);
    return `<article class="prep-mobile-picker-row ${active ? 'selected' : ''}" data-prep-picker-tool="${esc(id)}"><button type="button" class="prep-mobile-favorite ${favorite ? 'active' : ''}" data-prep-toggle-favorite="${esc(id)}" aria-label="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">★</button><button type="button" class="prep-mobile-pick-main" data-prep-toggle-resource="${esc(id)}"><span><strong>${esc(tool.name)}</strong><small>${esc(tool.purpose || (tool.type === ToolType.GRAPH ? 'Gráfico' : 'Recurso'))}</small></span><b aria-hidden="true">${active ? '✓' : '+'}</b></button></article>`;
  }).join('');
}
function updatePicker() {
  const overlay = document.querySelector('#prep-resource-picker-overlay');
  if (!overlay) return;
  const results = overlay.querySelector('[data-prep-picker-results]');
  if (results) results.innerHTML = pickerRowsHtml();
  overlay.querySelectorAll('[data-prep-picker-filter]').forEach((button) => button.classList.toggle('active', button.dataset.prepPickerFilter === pickerFilter));
  const count = selectedIds().size;
  const status = overlay.querySelector('[data-prep-picker-selected-count]');
  if (status) status.textContent = `${count} ${count === 1 ? 'recurso selecionado' : 'recursos selecionados'}`;
  updateSummary();
}
function openPicker() {
  document.querySelector('#prep-resource-picker-overlay')?.remove();
  pickerFilter = 'ALL';
  pickerQuery = '';
  const wrap = document.createElement('div');
  wrap.id = 'prep-resource-picker-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet detail-sheet prep-mobile-picker-sheet"><div class="sheet-head"><div><p class="eyebrow">Preparação</p><h2>Gráficos e recursos de proteção</h2></div><button type="button" class="close-btn" data-close-prep-resource-picker>×</button></div><p class="muted">Toque para selecionar vários recursos. Use a busca somente quando precisar.</p><div class="field"><label for="prep-mobile-resource-search">Buscar no Acervo</label><input id="prep-mobile-resource-search" type="search" data-prep-picker-search autocomplete="off" placeholder="Nome do gráfico ou recurso"></div><div class="prep-mobile-filter-chips"><button type="button" class="prep-mobile-filter-chip active" data-prep-picker-filter="ALL">Todos</button><button type="button" class="prep-mobile-filter-chip" data-prep-picker-filter="FAVORITES">Favoritos</button><button type="button" class="prep-mobile-filter-chip" data-prep-picker-filter="RECENT">Recentes</button></div><div class="prep-mobile-picker-results" data-prep-picker-results>${pickerRowsHtml()}</div><button type="button" class="btn ghost wide" data-prep-resource-unlisted>Digitar recurso não listado</button><div class="prep-mobile-picker-footer"><small data-prep-picker-selected-count></small><button type="button" class="btn primary" data-close-prep-resource-picker>Concluir</button></div></section>`;
  document.body.appendChild(wrap);
  updatePicker();
}
function closePicker() {
  document.querySelector('#prep-resource-picker-overlay')?.remove();
  updateSummary();
}
function toggleResource(id) {
  const section = preparationSection();
  if (!section || !id) return;
  const selected = section.querySelector(`[data-prep-selected-tool="${CSS.escape(id)}"]`);
  if (selected) {
    selected.querySelector('[data-prep-remove-tool]')?.click();
  } else {
    const select = section.querySelector('[data-prep-protection-select]');
    const add = section.querySelector('[data-prep-add-selected-tool]');
    if (!select || !add) return;
    select.value = id;
    add.click();
  }
  requestAnimationFrame(() => {
    updatePicker();
    updateSummary(section);
  });
}
function useUnlistedResource() {
  const section = preparationSection();
  closePicker();
  const toggle = section?.querySelector('[data-prep-unlisted-toggle]');
  if (!toggle) return;
  toggle.checked = true;
  toggle.dispatchEvent(new Event('change', { bubbles:true }));
  requestAnimationFrame(() => section.querySelector('[data-prep-unlisted-name]')?.focus());
}
function enhance() {
  ensureStyles();
  enhancePreparationSummary();
  updateSummary();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
window.addEventListener('fluxa:state-changed', schedule);
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-prep-picker-search]')) {
    pickerQuery = event.target.value || '';
    updatePicker();
  }
}, true);
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.openPrepResourcePicker !== undefined) {
    openPicker();
    return;
  }
  if (button.dataset.closePrepResourcePicker !== undefined) {
    closePicker();
    return;
  }
  if (button.dataset.prepPickerFilter) {
    pickerFilter = button.dataset.prepPickerFilter;
    updatePicker();
    return;
  }
  if (button.dataset.prepToggleResource) {
    toggleResource(button.dataset.prepToggleResource);
    return;
  }
  if (button.dataset.prepToggleFavorite) {
    const favorites = favoriteIds();
    const id = button.dataset.prepToggleFavorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavoriteIds(favorites);
    updatePicker();
    return;
  }
  if (button.dataset.prepResourceUnlisted !== undefined) {
    useUnlistedResource();
    return;
  }
  if (button.dataset.prepRemoveTool || button.dataset.prepAddSelectedTool !== undefined) {
    requestAnimationFrame(schedule);
  }
}, true);

schedule();
