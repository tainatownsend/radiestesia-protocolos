import { createStore } from './store.js';

const store = createStore();
let pickerFilter = 'ALL';
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : 0;
}
function orderedComponents(state) {
  return [...(state.treatmentComponents || [])].sort((a, b) => timeValue(b.updatedAt || b.startedAt || b.createdAt) - timeValue(a.updatedAt || a.startedAt || a.createdAt));
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
function recentToolIds(state = store.getState(), limit = 10) {
  const ids = [];
  const seen = new Set();
  const add = (value) => {
    const id = String(value || '');
    if (!id || seen.has(id) || ids.length >= limit) return;
    seen.add(id);
    ids.push(id);
  };
  for (const component of orderedComponents(state)) {
    add(component.toolId);
    graphToolIds(component).forEach(add);
    if (ids.length >= limit) break;
  }
  const preparations = [...(state.preparationRuns || [])].sort((a, b) => timeValue(b.updatedAt || b.completedAt || b.startedAt || b.createdAt) - timeValue(a.updatedAt || a.completedAt || a.startedAt || a.createdAt));
  for (const preparation of preparations) {
    for (const id of (preparation?.protection?.toolIds || [])) add(id);
    if (ids.length >= limit) break;
  }
  return new Set(ids);
}
function recentProtocols(state = store.getState(), limit = 5) {
  const seen = new Set();
  const result = [];
  const items = [...(state.investigations || [])].sort((a, b) => timeValue(b.updatedAt || b.completedAt || b.startedAt || b.createdAt) - timeValue(a.updatedAt || a.completedAt || a.startedAt || a.createdAt));
  for (const item of items) {
    const id = String(item.protocolId || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, label:item.protocolSnapshot?.name || item.protocolName || id });
    if (result.length >= limit) break;
  }
  return result;
}
function pickerRows() {
  return [...document.querySelectorAll('#tool-picker-overlay .tool-picker-row')];
}
function rowToolId(row) {
  return row.querySelector('[data-pick-tool]')?.dataset.pickTool || '';
}
function applyPickerFilter() {
  const recent = recentToolIds();
  pickerRows().forEach((row) => {
    const favorite = Boolean(row.querySelector('.tool-favorite.active'));
    const id = rowToolId(row);
    row.hidden = pickerFilter === 'FAVORITES' ? !favorite : pickerFilter === 'RECENT' ? !recent.has(id) : false;
  });
  const overlay = document.querySelector('#tool-picker-overlay');
  overlay?.querySelectorAll('[data-operational-picker-filter]').forEach((button) => button.classList.toggle('active', button.dataset.operationalPickerFilter === pickerFilter));
  const count = pickerRows().filter((row) => !row.hidden).length;
  const status = overlay?.querySelector('[data-operational-picker-status]');
  if (status) status.textContent = pickerFilter === 'ALL' ? `${count} disponíveis` : `${count} neste filtro`;
}
function enhanceToolPicker() {
  const sheet = document.querySelector('#tool-picker-overlay .sheet');
  if (!sheet) return;
  let bar = sheet.querySelector('[data-operational-picker-bar]');
  if (!bar) {
    bar = document.createElement('div');
    bar.dataset.operationalPickerBar = 'true';
    bar.innerHTML = `<div class="picker-filter-chips" aria-label="Atalhos da biblioteca"><button type="button" class="picker-filter-chip" data-operational-picker-filter="ALL">Todos</button><button type="button" class="picker-filter-chip" data-operational-picker-filter="FAVORITES">Favoritos</button><button type="button" class="picker-filter-chip" data-operational-picker-filter="RECENT">Recentes</button></div><p class="muted" data-operational-picker-status></p>`;
    const results = sheet.querySelector('[data-tool-picker-results]');
    results?.before(bar);
  }
  applyPickerFilter();
}
function protocolTarget(sheet, id) {
  const safe = CSS.escape(id);
  return sheet.querySelector(`[data-start-root-protocol="${safe}"]`) || sheet.querySelector(`[data-start-branching="${safe}"]`) || sheet.querySelector(`[data-start-custom-protocol="${safe}"]`);
}
function enhanceProtocolRecents() {
  const sheet = document.querySelector('#investigation-chooser-overlay .sheet[data-ia-investigation-entry="catalog"]');
  if (!sheet || sheet.querySelector('[data-recent-protocols]')) return;
  const recent = recentProtocols().filter((item) => protocolTarget(sheet, item.id));
  if (!recent.length) return;
  const wrap = document.createElement('section');
  wrap.dataset.recentProtocols = 'true';
  wrap.innerHTML = `<p class="eyebrow">Usados recentemente</p><div class="picker-filter-chips">${recent.map((item) => `<button type="button" class="picker-filter-chip" data-recent-protocol-id="${esc(item.id)}">${esc(item.label)}</button>`).join('')}</div>`;
  const anchor = sheet.querySelector('.investigation-catalog-back') || sheet.querySelector('.protocol-discovery');
  anchor?.after(wrap);
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    enhanceToolPicker();
    enhanceProtocolRecents();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => queueMicrotask(enhance));

document.addEventListener('input', (event) => {
  if (event.target.matches('#tool-picker-overlay [data-tool-picker-search]')) requestAnimationFrame(applyPickerFilter);
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.operationalPickerFilter) {
    pickerFilter = button.dataset.operationalPickerFilter;
    applyPickerFilter();
    return;
  }
  if (button.dataset.toggleToolFavorite) {
    requestAnimationFrame(applyPickerFilter);
    return;
  }
  if (button.dataset.openToolPicker || button.dataset.openGraphPicker) {
    pickerFilter = 'ALL';
    return;
  }
  if (button.dataset.recentProtocolId) {
    const sheet = button.closest('#investigation-chooser-overlay .sheet');
    protocolTarget(sheet, button.dataset.recentProtocolId)?.click();
  }
}, true);
