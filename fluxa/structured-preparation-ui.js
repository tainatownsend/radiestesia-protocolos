import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { activeTools, ToolType } from './activity-library.js';
import { updatePreparationDetails, completeStructuredPreparation } from './structured-preparation.js';

const store = createStore();
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '\"':'&quot;' }[c]));
}

function currentRun() {
  const state = store.getState();
  const session = getOpenSession(state);
  return session ? latestPreparation(state, session.id) : null;
}

function ensureStructuredFields() {
  const sheet = document.querySelector('.sheet [data-action="complete-preparation"]')?.closest('.sheet');
  if (!sheet || sheet.querySelector('[data-prep-structured]')) return;
  const run = currentRun();
  if (!run || run.status === 'COMPLETED') return;

  const tools = activeTools(store.getState()).filter((tool) => tool.type === ToolType.GRAPH || tool.type === ToolType.OTHER);
  const selected = new Set(run.protection?.toolIds || []);
  const section = document.createElement('section');
  section.className = 'section card soft form-grid';
  section.dataset.prepStructured = 'true';
  section.innerHTML = `
    <div><p class="eyebrow">Preparação do terapeuta</p><h3>Confirme sua condição antes de atender</h3><p class="muted">Meça sua frequência vibracional de Hawkins. A sessão terapêutica só pode ser liberada a partir de 400 Hz.</p></div>
    <div class="field"><label>Minha frequência vibracional de Hawkins</label><div class="hawkins-input"><input data-prep-frequency type="number" min="0.01" step="any" value="${esc(run.frequencyMeasurement?.value || '')}" placeholder="Ex.: 450" inputmode="decimal" required><b>Hz</b></div><small class="muted">Abaixo de 400 Hz, o Fluxa mantém a sessão aberta, mas bloqueia investigações e tratamentos até uma nova medição adequada.</small></div>
    ${tools.length ? `<fieldset class="field"><legend>Gráficos / recursos de proteção utilizados</legend><div class="checklist">${tools.map((tool) => `<label class="check-row"><input type="checkbox" data-prep-protection-tool value="${tool.id}" ${selected.has(tool.id) ? 'checked' : ''}><span>${esc(tool.name)}</span></label>`).join('')}</div></fieldset>` : ''}
    <div class="field"><label>Proteção utilizada / observações</label><textarea data-prep-protection-notes placeholder="Descreva a proteção quando não estiver cadastrada na Biblioteca">${esc(run.protection?.notes || '')}</textarea></div>
    <div class="field"><label>Mantra / permissão <span class="muted">(opcional)</span></label><textarea data-prep-permission-notes placeholder="Observação específica desta sessão">${esc(run.permissionNotes || '')}</textarea></div>`;

  const completeSection = sheet.querySelector('[data-action="complete-preparation"]')?.closest('.section');
  completeSection?.before(section);
}

function collectAndSave() {
  const run = currentRun();
  const section = document.querySelector('[data-prep-structured]');
  if (!run || !section) return run;
  updatePreparationDetails(store, run.id, {
    frequencyValue: section.querySelector('[data-prep-frequency]')?.value,
    protectionToolIds: [...section.querySelectorAll('[data-prep-protection-tool]:checked')].map((input) => input.value),
    protectionNotes: section.querySelector('[data-prep-protection-notes]')?.value,
    permissionNotes: section.querySelector('[data-prep-permission-notes]')?.value
  });
  return store.getState().preparationRuns.find((item) => item.id === run.id);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { ensureStructuredFields(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

let saveTimer = null;
document.addEventListener('input', (event) => {
  if (!event.target.closest('[data-prep-structured]')) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { collectAndSave(); } catch (_) {} }, 250);
}, true);

document.addEventListener('change', (event) => {
  if (!event.target.closest('[data-prep-structured]')) return;
  try { collectAndSave(); } catch (_) {}
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="complete-preparation"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    const run = collectAndSave();
    if (!run) return;
    completeStructuredPreparation(store, run.id);
    document.querySelector('[data-action="dismiss-sheet"]')?.click();
  } catch (error) {
    alert(error.message);
    document.querySelector('[data-prep-frequency]')?.focus();
  }
}, true);
