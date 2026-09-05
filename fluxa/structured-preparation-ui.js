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
    <div><p class="eyebrow">Registro da preparação</p><h3>Dados desta sessão</h3><p class="muted">A frequência e a proteção ficam preservadas no histórico desta janela de trabalho.</p></div>
    <div class="field"><label>Frequência vibracional medida</label><input data-prep-frequency value="${esc(run.frequencyMeasurement?.value || '')}" placeholder="Ex.: 8.500" inputmode="decimal"></div>
    <div class="field"><label>Escala / unidade <span class="muted">(opcional)</span></label><input data-prep-frequency-scale value="${esc(run.frequencyMeasurement?.scale || '')}" placeholder="Ex.: Bovis"></div>
    ${tools.length ? `<fieldset class="field prep-protection-field"><legend>Proteção utilizada</legend><div class="checklist prep-protection-list">${tools.map((tool) => `<label class="check-row"><input type="checkbox" data-prep-protection-tool value="${tool.id}" aria-label="${esc(tool.name)}" ${selected.has(tool.id) ? 'checked' : ''}><span>${esc(tool.name)}</span></label>`).join('')}</div></fieldset>` : ''}
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
    frequencyScale: section.querySelector('[data-prep-frequency-scale]')?.value,
    protectionToolIds: [...section.querySelectorAll('[data-prep-protection-tool]:checked')].map((input) => input.value),
    protectionNotes: section.querySelector('[data-prep-protection-notes]')?.value,
    permissionNotes: section.querySelector('[data-prep-permission-notes]')?.value
  });
  return store.getState().preparationRuns.find((item) => item.id === run.id);
}

function clearPreparationError(section = document.querySelector('[data-prep-structured]')) {
  section?.querySelector('[data-prep-error]')?.remove();
}

function showPreparationError(section, message = '') {
  clearPreparationError(section);
  const protectionError = /prote[cç][aã]o|gr[aá]fico|recurso/i.test(message);
  const frequencyError = /frequ[eê]ncia|medi[cç][aã]o/i.test(message);
  const target = protectionError
    ? section.querySelector('.prep-protection-field') || section.querySelector('[data-prep-protection-notes]')?.closest('.field')
    : frequencyError
      ? section.querySelector('[data-prep-frequency]')?.closest('.field')
      : section;
  const alert = document.createElement('div');
  alert.className = 'fx-inline-error';
  alert.dataset.prepError = 'true';
  alert.setAttribute('role', 'alert');
  alert.textContent = protectionError
    ? 'Registre uma proteção: escolha um recurso da Biblioteca ou descreva o que utilizou.'
    : message || 'Revise os dados destacados antes de continuar.';
  target?.before(alert);

  if (protectionError) {
    const reveal = section.querySelector('[data-toggle-tool-checklist][aria-expanded="false"]');
    reveal?.click();
  }
  requestAnimationFrame(() => {
    alert.scrollIntoView({ block:'center', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const focusTarget = protectionError
      ? section.querySelector('[data-toggle-tool-checklist], [data-prep-protection-notes]')
      : frequencyError
        ? section.querySelector('[data-prep-frequency]')
        : null;
    focusTarget?.focus({ preventScroll:true });
  });
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
  clearPreparationError(event.target.closest('[data-prep-structured]'));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { collectAndSave(); } catch (_) {} }, 250);
}, true);

document.addEventListener('change', (event) => {
  if (!event.target.closest('[data-prep-structured]')) return;
  clearPreparationError(event.target.closest('[data-prep-structured]'));
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
    const section = document.querySelector('[data-prep-structured]');
    if (section) showPreparationError(section, error.message);
  }
}, true);
