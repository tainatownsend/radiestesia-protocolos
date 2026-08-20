import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { ToolType, activeTools, archiveTool, createTool, updateTool, recordGeneralAssessment } from './activity-library.js';

const store = createStore();
let enhancing = false;
let pendingExistingComponentLink = null;

const toolLabels = {
  [ToolType.GRAPH]: 'Gráfico',
  [ToolType.BIOMETER]: 'Biômetro',
  [ToolType.OTHER]: 'Outro recurso'
};

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function toolOptions(tools) {
  return `<option value="">Digitar manualmente</option>${tools.map((tool) => `<option value="${tool.id}" data-tool-name="${esc(tool.name)}">${esc(tool.name)} · ${esc(toolLabels[tool.type] || toolLabels.OTHER)}</option>`).join('')}`;
}

function linkComponentToTool(componentId, toolId) {
  if (!toolId) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    const component = draft.treatmentComponents.find((item) => item.id === componentId);
    const tool = draft.tools.find((item) => item.id === toolId && !item.archivedAt);
    if (!component || !tool) return draft;
    component.toolId = tool.id;
    component.toolSnapshot = { id:tool.id, type:tool.type, name:tool.name };
    component.updatedAt = store.nowIso();
    return draft;
  });
}

function dialog(html) {
  document.querySelector('#activity-library-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'activity-library-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function closeDialog() {
  document.querySelector('#activity-library-overlay')?.remove();
}

function ensureAssessmentAction() {
  const grid = document.querySelector('.action-grid');
  if (!grid || grid.querySelector('[data-general-assessment]')) return;
  const note = grid.querySelector('[data-action="add-note"]');
  const button = document.createElement('button');
  button.className = 'action-card';
  button.dataset.generalAssessment = 'true';
  button.innerHTML = '<strong>Avaliar</strong><span>Medição ou resultado</span>';
  if (note) grid.insertBefore(button, note);
  else grid.appendChild(button);
}

function ensureLibrarySection() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('[data-basic-tool-library]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Biblioteca') return;

  const tools = activeTools(store.getState());
  const section = document.createElement('section');
  section.className = 'section';
  section.dataset.basicToolLibrary = 'true';
  section.innerHTML = `<div class="section-head"><div><p class="eyebrow">Recursos</p><h2>Gráficos e ferramentas</h2></div><button class="btn primary small" data-new-library-tool>Novo recurso</button></div>
    <p class="muted">Cadastre recursos reutilizáveis. Alterações valem para usos futuros; componentes já registrados preservam o snapshot utilizado.</p>
    <div class="stack">${tools.length ? tools.map((tool) => `<article class="card" data-library-tool-id="${tool.id}"><div class="section-head"><div><p class="eyebrow">${esc(toolLabels[tool.type] || toolLabels.OTHER)}</p><h3>${esc(tool.name)}</h3></div><div class="button-row"><button class="btn secondary small" data-edit-library-tool="${tool.id}">Editar</button><button class="btn ghost small" data-archive-library-tool="${tool.id}">Arquivar</button></div></div>${tool.purpose ? `<p>${esc(tool.purpose)}</p>` : ''}${tool.notes ? `<p class="muted">${esc(tool.notes)}</p>` : ''}</article>`).join('') : '<div class="empty">Nenhum gráfico ou ferramenta cadastrado ainda.</div>'}</div>`;
  main.appendChild(section);
}

function ensureToolSelectors() {
  const tools = activeTools(store.getState());
  document.querySelectorAll('[data-treatment-component-draft]').forEach((section) => {
    if (section.querySelector('[data-library-tool-picker]')) return;
    const fields = section.querySelector('.form-grid');
    const nameInput = section.querySelector('[name="componentName"]');
    if (!fields || !nameInput) return;
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.libraryToolPicker = 'true';
    field.innerHTML = `<label>Usar recurso da Biblioteca <span class="muted">(opcional)</span></label><select name="toolId">${toolOptions(tools)}</select>`;
    fields.insertBefore(field, fields.firstChild);
  });

  const existingForm = document.querySelector('#component-form');
  if (existingForm && !existingForm.querySelector('[data-library-tool-picker]')) {
    const nameField = existingForm.querySelector('[name="name"]')?.closest('.field');
    if (nameField) {
      const field = document.createElement('div');
      field.className = 'field';
      field.dataset.libraryToolPicker = 'true';
      field.innerHTML = `<label>Usar recurso da Biblioteca <span class="muted">(opcional)</span></label><select name="toolId">${toolOptions(tools)}</select>`;
      existingForm.insertBefore(field, nameField);
    }
  }
}

function translateAssessmentEvents() {
  document.querySelectorAll('.timeline-item').forEach((item) => {
    const title = item.querySelector('.timeline-copy strong');
    if (title?.textContent === 'ASSESSMENT_RECORDED') title.textContent = 'Avaliação registrada';
  });
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureAssessmentAction();
    ensureLibrarySection();
    ensureToolSelectors();
    translateAssessmentEvents();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

function assessmentDialog() {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) return alert('Selecione um assistido antes de registrar uma avaliação.');
  if (latestPreparation(state, session.id)?.status !== 'COMPLETED') return alert('Conclua a preparação da sessão antes de fazer uma medição.');
  const assisted = state.assistedEntities.find((item) => item.id === session.currentAssistedEntityId);
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliar</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-activity-close>×</button></div><p class="muted">Use para registrar uma medição ou avaliação pontual. O registro ficará ligado a esta sessão e ao histórico do assistido.</p><form id="general-assessment-form" data-session="${session.id}" data-assisted="${session.currentAssistedEntityId}" class="form-grid"><div class="field"><label>O que está sendo avaliado?</label><input name="subject" required placeholder="Ex.: frequência vibracional, nível de equilíbrio"></div><div class="field"><label>Resultado</label><input name="result" required placeholder="Ex.: 8.500, 65%, adequado"></div><div class="field"><label>Escala / unidade</label><input name="scale" placeholder="Opcional"></div><div class="field"><label>Observações</label><textarea name="notes" placeholder="Opcional"></textarea></div><button class="btn primary wide" type="submit">Registrar avaliação</button></form></section>`);
}

function toolDialog(tool = null) {
  const editing = Boolean(tool);
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Biblioteca</p><h2>${editing ? 'Editar recurso' : 'Novo gráfico ou ferramenta'}</h2></div><button class="close-btn" data-activity-close>×</button></div><form id="library-tool-form" data-tool-id="${tool?.id || ''}" class="form-grid"><div class="field"><label>Tipo</label><select name="type"><option value="GRAPH" ${tool?.type === 'GRAPH' ? 'selected' : ''}>Gráfico</option><option value="BIOMETER" ${tool?.type === 'BIOMETER' ? 'selected' : ''}>Biômetro</option><option value="OTHER" ${tool?.type === 'OTHER' ? 'selected' : ''}>Outro recurso</option></select></div><div class="field"><label>Nome</label><input name="name" value="${esc(tool?.name || '')}" required></div><div class="field"><label>Finalidade</label><textarea name="purpose" placeholder="Para que costuma ser utilizado">${esc(tool?.purpose || '')}</textarea></div><div class="field"><label>Observações</label><textarea name="notes" placeholder="Cuidados, variações ou lembretes">${esc(tool?.notes || '')}</textarea></div><button class="btn primary wide" type="submit">${editing ? 'Salvar alterações' : 'Adicionar à Biblioteca'}</button></form></section>`);
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-library-tool-picker] select[name="toolId"]');
  if (!select) return;
  const form = select.closest('form');
  const section = select.closest('[data-treatment-component-draft]');
  const input = section?.querySelector('[name="componentName"]') || form?.querySelector('[name="name"]');
  const option = select.selectedOptions[0];
  if (input && select.value && option?.dataset.toolName) input.value = option.dataset.toolName;
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'component-form') return;
  const data = new FormData(form);
  const toolId = data.get('toolId');
  if (!toolId) return;
  pendingExistingComponentLink = {
    treatmentId: form.dataset.treatment,
    toolId,
    beforeIds: new Set(store.getState().treatmentComponents.filter((item) => item.treatmentId === form.dataset.treatment).map((item) => item.id))
  };
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.generalAssessment !== undefined) { assessmentDialog(); return; }
  if (button.dataset.newLibraryTool !== undefined) { toolDialog(); return; }
  if (button.dataset.editLibraryTool) {
    const tool = store.getState().tools.find((item) => item.id === button.dataset.editLibraryTool && !item.archivedAt);
    if (tool) toolDialog(tool);
    return;
  }
  if (button.dataset.activityClose !== undefined) { closeDialog(); return; }
  if (button.dataset.archiveLibraryTool) {
    if (!confirm('Arquivar este recurso da Biblioteca? Tratamentos antigos continuarão preservados.')) return;
    try { archiveTool(store, button.dataset.archiveLibraryTool); } catch (error) { alert(error.message); }
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'component-form' && pendingExistingComponentLink) {
    queueMicrotask(() => {
      const pending = pendingExistingComponentLink;
      pendingExistingComponentLink = null;
      const created = store.getState().treatmentComponents
        .filter((item) => item.treatmentId === pending.treatmentId && !pending.beforeIds.has(item.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (created) linkComponentToTool(created.id, pending.toolId);
    });
  }
  if (form.id === 'general-assessment-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      recordGeneralAssessment(store, {
        sessionId: form.dataset.session,
        assistedEntityId: form.dataset.assisted,
        subject: data.get('subject'),
        result: data.get('result'),
        scale: data.get('scale'),
        notes: data.get('notes')
      });
      closeDialog();
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'library-tool-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const input = { type:data.get('type'), name:data.get('name'), purpose:data.get('purpose'), notes:data.get('notes') };
      if (form.dataset.toolId) updateTool(store, form.dataset.toolId, input);
      else createTool(store, input);
      closeDialog();
    } catch (error) { alert(error.message); }
  }
});
