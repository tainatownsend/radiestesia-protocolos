import { createStore } from './store.js';
import { treatmentItemView } from './treatment-item-graphs.js';

const store = createStore();
const PRESETS = [
  ['30 min','30','MINUTE'],
  ['1 h','1','HOUR'],
  ['1 dia','1','DAY'],
  ['7 dias','7','DAY'],
  ['Sem prazo','','']
];
let scheduled = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function safeDate(value) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime()) ? date : null;
}
function remainingLabel(graph) {
  if (graph?.noDuration || !graph?.expectedEndAt) return 'Sem prazo';
  const end = safeDate(graph.expectedEndAt);
  if (!end) return 'Sem prazo';
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 'Revisão disponível';
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.ceil(hours / 24)} d`;
}
function durationControls(row) {
  const value = row.querySelector('input[name="graphDurationValue"],input[name="durationValue"]');
  const unit = row.querySelector('select[name="graphDurationUnit"],select[name="durationUnit"]');
  return { value, unit };
}
function syncPresetState(row) {
  const { value, unit } = durationControls(row);
  if (!value || !unit) return;
  const currentValue = String(value.value || '');
  const currentUnit = String(unit.value || '');
  row.querySelectorAll('[data-treatment-duration-preset]').forEach((button) => {
    const isNoDeadline = button.dataset.value === '' && currentValue === '';
    const matches = isNoDeadline || (button.dataset.value === currentValue && button.dataset.unit === currentUnit);
    button.classList.toggle('active', matches);
    button.setAttribute('aria-pressed', String(matches));
  });
}
function enhanceGraphRow(row) {
  if (row.dataset.mobileTreatmentGraph) return;
  const graphInput = row.querySelector('input[name="graphName"]');
  const { value, unit } = durationControls(row);
  if (!graphInput || !value || !unit) return;
  row.dataset.mobileTreatmentGraph = 'true';
  row.classList.add('mobile-treatment-graph');
  graphInput.setAttribute('autocomplete', 'off');
  value.placeholder = '—';
  value.setAttribute('aria-label', 'Tempo do gráfico');
  unit.setAttribute('aria-label', 'Unidade do tempo');
  const duration = value.closest('.graph-duration') || value.parentElement;
  duration?.classList.add('mobile-graph-duration');
  const presets = document.createElement('div');
  presets.className = 'mobile-duration-presets';
  presets.setAttribute('aria-label', 'Atalhos de duração');
  presets.innerHTML = PRESETS.map(([label, presetValue, presetUnit]) => `<button type="button" class="mobile-duration-chip" data-treatment-duration-preset data-value="${presetValue}" data-unit="${presetUnit}" aria-pressed="false">${label}</button>`).join('');
  duration?.after(presets);
  syncPresetState(row);
}
function enhanceCommand(command) {
  if (command.dataset.mobileTreatmentCommand) return;
  command.dataset.mobileTreatmentCommand = 'true';
  command.classList.add('mobile-treatment-command');
  const textarea = command.querySelector('textarea[name="commandText"]');
  if (textarea) {
    textarea.rows = 2;
    textarea.setAttribute('enterkeyhint', 'done');
  }
}
function itemCounts(item) {
  const commands = item.querySelectorAll('[data-treatment-command],[data-manage-command]').length;
  const graphs = item.querySelectorAll('[data-treatment-graph],[data-manage-graph]').length;
  return { commands, graphs };
}
function updateItemMeta(item) {
  const meta = item.querySelector('[data-mobile-treatment-item-meta]');
  if (!meta) return;
  const { commands, graphs } = itemCounts(item);
  meta.textContent = `${commands} ${commands === 1 ? 'comando' : 'comandos'} · ${graphs} ${graphs === 1 ? 'gráfico' : 'gráficos'}`;
}
function setItemCollapsed(item, collapsed) {
  item.dataset.mobileCollapsed = collapsed ? 'true' : 'false';
  const button = item.querySelector('[data-toggle-mobile-treatment-item]');
  if (button) {
    button.textContent = collapsed ? 'Editar' : 'Recolher';
    button.setAttribute('aria-expanded', String(!collapsed));
  }
}
function enhanceItem(item) {
  if (item.dataset.mobileTreatmentItem) {
    updateItemMeta(item);
    return;
  }
  const head = item.querySelector(':scope > .section-head');
  if (!head) return;
  item.dataset.mobileTreatmentItem = 'true';
  item.classList.add('mobile-treatment-item');
  const copy = head.querySelector('div');
  if (copy && !copy.querySelector('[data-mobile-treatment-item-meta]')) {
    const meta = document.createElement('small');
    meta.className = 'mobile-treatment-item-meta';
    meta.dataset.mobileTreatmentItemMeta = 'true';
    copy.appendChild(meta);
  }
  if (!head.querySelector('[data-toggle-mobile-treatment-item]')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn ghost small mobile-treatment-item-toggle';
    toggle.dataset.toggleMobileTreatmentItem = 'true';
    toggle.textContent = 'Recolher';
    toggle.setAttribute('aria-expanded', 'true');
    const remove = head.querySelector('[data-remove-treatment-item]');
    remove ? remove.before(toggle) : head.appendChild(toggle);
  }
  const body = document.createElement('div');
  body.className = 'mobile-treatment-item-body';
  body.dataset.mobileTreatmentItemBody = 'true';
  [...item.children].filter((child) => child !== head).forEach((child) => body.appendChild(child));
  item.appendChild(body);
  setItemCollapsed(item, false);
  updateItemMeta(item);
}
function composeCounts(form) {
  const management = form.id === 'treatment-item-management-form';
  const items = management ? 1 : form.querySelectorAll('[data-treatment-item]').length;
  const commands = form.querySelectorAll('[data-treatment-command],[data-manage-command]').length;
  const graphs = form.querySelectorAll('[data-treatment-graph],[data-manage-graph]').length;
  return { items, commands, graphs };
}
function updateComposeSummary(form) {
  const summary = form.querySelector('[data-treatment-compose-summary]');
  if (!summary) return;
  const { items, commands, graphs } = composeCounts(form);
  summary.textContent = `${items} ${items === 1 ? 'item' : 'itens'} · ${commands} ${commands === 1 ? 'comando' : 'comandos'} · ${graphs} ${graphs === 1 ? 'gráfico' : 'gráficos'}`;
}
function enhanceComposeFooter(form) {
  if (form.dataset.mobileTreatmentCompose) {
    updateComposeSummary(form);
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  form.dataset.mobileTreatmentCompose = 'true';
  form.classList.add('mobile-treatment-compose');
  const footer = document.createElement('div');
  footer.className = 'mobile-treatment-compose-footer';
  footer.dataset.mobileTreatmentComposeFooter = 'true';
  const summary = document.createElement('small');
  summary.dataset.treatmentComposeSummary = 'true';
  summary.className = 'mobile-treatment-compose-summary';
  footer.appendChild(summary);
  footer.appendChild(submit);
  form.appendChild(footer);
  updateComposeSummary(form);
}
function autoCollapsePreviousItems(form) {
  const items = [...form.querySelectorAll('[data-treatment-items] > [data-treatment-item]')];
  const previous = Number(form.dataset.mobileTreatmentItemCount || 0);
  if (items.length > previous && items.length > 1) {
    items.slice(0, -1).forEach((item) => setItemCollapsed(item, true));
    setItemCollapsed(items.at(-1), false);
  }
  form.dataset.mobileTreatmentItemCount = String(items.length);
}
function enhanceTreatmentForms() {
  const form = document.querySelector('#treatment-form');
  if (form) {
    form.querySelectorAll('[data-treatment-item]').forEach(enhanceItem);
    form.querySelectorAll('[data-treatment-command]').forEach(enhanceCommand);
    form.querySelectorAll('[data-treatment-graph]').forEach(enhanceGraphRow);
    enhanceComposeFooter(form);
    autoCollapsePreviousItems(form);
    updateComposeSummary(form);
    form.querySelectorAll('[data-treatment-item]').forEach(updateItemMeta);
  }
  const manage = document.querySelector('#treatment-item-management-form');
  if (manage) {
    manage.querySelectorAll('[data-manage-command]').forEach(enhanceCommand);
    manage.querySelectorAll('[data-manage-graph]').forEach(enhanceGraphRow);
    enhanceComposeFooter(manage);
    updateComposeSummary(manage);
  }
}
function graphRowsHtml(component) {
  const view = treatmentItemView(component);
  const graphs = view.commands.flatMap((command) => command.graphApplications || []);
  if (!graphs.length) return '';
  return `<div class="mobile-component-graphs">${graphs.map((graph) => `<div><strong>${esc(graph.graphName)}</strong><span>${esc(remainingLabel(graph))}</span></div>`).join('')}</div>`;
}
function enhanceComponentManager() {
  const sheet = document.querySelector('#backlog-overlay .sheet.detail-sheet');
  if (!sheet) return;
  const eyebrow = sheet.querySelector('.sheet-head .eyebrow')?.textContent?.trim();
  if (eyebrow !== 'Componentes') return;
  const state = store.getState();
  sheet.classList.add('mobile-component-manager');
  sheet.querySelectorAll('.stack > article.card').forEach((card) => {
    if (card.dataset.mobileComponentRow) return;
    const action = card.querySelector('[data-backlog-replace-component],[data-backlog-stop-component]');
    const componentId = action?.dataset.backlogReplaceComponent || action?.dataset.backlogStopComponent;
    const component = state.treatmentComponents.find((item) => item.id === componentId);
    card.dataset.mobileComponentRow = 'true';
    card.classList.add('mobile-component-row');
    if (component) {
      const holder = document.createElement('div');
      holder.innerHTML = graphRowsHtml(component);
      const graphs = holder.firstElementChild;
      if (graphs) card.querySelector('.section-head')?.after(graphs);
    }
    card.querySelector('.button-row')?.classList.add('mobile-component-actions');
  });
}
function enhance() {
  enhanceTreatmentForms();
  enhanceComponentManager();
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
  const form = event.target.closest?.('#treatment-form,#treatment-item-management-form');
  if (form) schedule();
}, true);
document.addEventListener('change', (event) => {
  const row = event.target.closest?.('[data-mobile-treatment-graph]');
  if (row) syncPresetState(row);
}, true);
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.treatmentDurationPreset !== undefined) {
    const row = button.closest('[data-mobile-treatment-graph]');
    if (!row) return;
    const { value, unit } = durationControls(row);
    if (!value || !unit) return;
    value.value = button.dataset.value || '';
    if (button.dataset.unit) unit.value = button.dataset.unit;
    value.dispatchEvent(new Event('input', { bubbles:true }));
    unit.dispatchEvent(new Event('change', { bubbles:true }));
    syncPresetState(row);
    return;
  }
  if (button.dataset.toggleMobileTreatmentItem !== undefined) {
    const item = button.closest('[data-mobile-treatment-item]');
    if (!item) return;
    setItemCollapsed(item, item.dataset.mobileCollapsed !== 'true');
    return;
  }
  if (button.matches('[data-add-treatment-item],[data-add-treatment-command],[data-add-treatment-graph],[data-manage-add-command],[data-manage-add-graph]')) {
    requestAnimationFrame(schedule);
  }
}, true);

schedule();
