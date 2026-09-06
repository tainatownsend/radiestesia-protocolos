import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { activeTools, ToolType, createTool } from './activity-library.js';
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
function graphTools(state=store.getState()) {
  return activeTools(state).filter((tool) => tool.type === ToolType.GRAPH || tool.type === ToolType.OTHER);
}
function mantras(state=store.getState()) {
  const items=state?.settings?.mantrasPermissions;
  return Array.isArray(items) ? items.filter((item)=>item && item.id && item.name && item.text) : [];
}
function selectedToolMarkup(ids, tools) {
  const byId=new Map(tools.map((tool)=>[tool.id,tool]));
  return ids.map((id)=>byId.get(id)).filter(Boolean).map((tool)=>`<span class="prep-selected-tool" data-prep-selected-tool="${esc(tool.id)}"><input type="checkbox" data-prep-protection-tool value="${esc(tool.id)}" checked hidden><span>${esc(tool.name)}</span><button type="button" aria-label="Remover ${esc(tool.name)}" data-prep-remove-tool="${esc(tool.id)}">×</button></span>`).join('');
}
function renderMantraPreview(section) {
  const select=section?.querySelector('[data-prep-mantra-select]');
  const preview=section?.querySelector('[data-prep-mantra-preview]');
  const hidden=section?.querySelector('[data-prep-permission-notes]');
  if(!select||!preview||!hidden)return;
  const item=mantras().find((entry)=>entry.id===select.value);
  hidden.value=item?.text||'';
  preview.hidden=!item;
  preview.innerHTML=item ? `<strong>${esc(item.name)}</strong><p>${esc(item.text)}</p>` : '';
}
function ensureStructuredFields() {
  const sheet = document.querySelector('.sheet [data-action="complete-preparation"]')?.closest('.sheet');
  if (!sheet || sheet.querySelector('[data-prep-structured]')) return;
  const run = currentRun();
  if (!run || run.status === 'COMPLETED') return;

  const state=store.getState();
  const tools = graphTools(state);
  const selected = [...new Set(run.protection?.toolIds || [])];
  const mantraItems=mantras(state);
  const selectedMantra=mantraItems.find((item)=>item.text===run.permissionNotes)?.id||'';
  const customPrevious=run.protection?.notes||'';
  const section = document.createElement('section');
  section.className = 'section card soft form-grid';
  section.dataset.prepStructured = 'true';
  section.innerHTML = `
    <div><p class="eyebrow">Preparação do terapeuta</p><h3>Confirme sua condição antes de atender</h3><p class="muted">Meça sua frequência vibracional de Hawkins. A sessão terapêutica só pode ser liberada a partir de 400 Hz.</p></div>
    <div class="field"><label>Minha frequência vibracional de Hawkins</label><div class="hawkins-input"><input data-prep-frequency type="number" min="0.01" step="any" value="${esc(run.frequencyMeasurement?.value || '')}" placeholder="Ex.: 450" inputmode="decimal" required><b>Hz</b></div><small class="muted">Abaixo de 400 Hz, investigações e tratamentos permanecem bloqueados até uma nova medição adequada.</small></div>
    <div class="field prep-resource-picker"><label for="prep-protection-select">Gráficos / recursos de proteção</label><div class="prep-picker-row"><select id="prep-protection-select" data-prep-protection-select><option value="">Selecione um gráfico…</option>${tools.map((tool)=>`<option value="${esc(tool.id)}">${esc(tool.name)}</option>`).join('')}</select><button type="button" class="btn secondary" data-prep-add-selected-tool>Adicionar</button></div><div class="prep-selected-tools" data-prep-selected-tools>${selectedToolMarkup(selected,tools)}</div></div>
    <label class="check-row prep-unlisted-toggle"><input type="checkbox" data-prep-unlisted-toggle ${customPrevious?'checked':''}><span><strong>Gráfico não listado</strong><small>Use um nome somente nesta sessão ou adicione-o ao Acervo.</small></span></label>
    <div class="field prep-unlisted-fields" data-prep-unlisted-fields ${customPrevious?'':'hidden'}><label>Nome do gráfico</label><input type="text" data-prep-unlisted-name value="${esc(customPrevious)}" placeholder="Digite o nome do gráfico"><label class="check-row compact"><input type="checkbox" data-prep-add-unlisted-acervo><span>Adicionar este gráfico ao Acervo</span></label></div>
    <div class="field"><label for="prep-mantra-select">Mantra / permissão <span class="muted">(opcional)</span></label><select id="prep-mantra-select" data-prep-mantra-select><option value="">Nenhum</option>${mantraItems.map((item)=>`<option value="${esc(item.id)}" ${item.id===selectedMantra?'selected':''}>${esc(item.name)}</option>`).join('')}</select>${mantraItems.length?'':'<small class="muted">Cadastre seus textos em Acervo → Mantras / permissões.</small>'}<div class="prep-mantra-preview" data-prep-mantra-preview hidden></div><textarea data-prep-permission-notes hidden>${esc(run.permissionNotes || '')}</textarea></div>`;

  const completeSection = sheet.querySelector('[data-action="complete-preparation"]')?.closest('.section');
  completeSection?.before(section);
  renderMantraPreview(section);
}
function addSelectedTool(section,id) {
  if(!id || section.querySelector(`[data-prep-selected-tool="${CSS.escape(id)}"]`)) return;
  const tool=graphTools().find((item)=>item.id===id);if(!tool)return;
  section.querySelector('[data-prep-selected-tools]')?.insertAdjacentHTML('beforeend',selectedToolMarkup([id],[tool]));
}
function collectAndSave({allowCreate=false}={}) {
  const run = currentRun();
  const section = document.querySelector('[data-prep-structured]');
  if (!run || !section) return run;
  let ids=[...section.querySelectorAll('[data-prep-protection-tool]:checked')].map((input)=>input.value);
  const useUnlisted=section.querySelector('[data-prep-unlisted-toggle]')?.checked;
  const customName=useUnlisted ? String(section.querySelector('[data-prep-unlisted-name]')?.value||'').trim() : '';
  let protectionNotes=customName;
  if(allowCreate && customName && section.querySelector('[data-prep-add-unlisted-acervo]')?.checked){
    const existing=graphTools().find((item)=>item.name.localeCompare(customName,'pt-BR',{sensitivity:'accent'})===0);
    const tool=existing || createTool(store,{name:customName,type:ToolType.GRAPH,purpose:'Proteção / preparação de sessão',tags:['proteção']});
    ids=[...new Set([...ids,tool.id])];
    protectionNotes='';
  }
  updatePreparationDetails(store, run.id, {
    frequencyValue: section.querySelector('[data-prep-frequency]')?.value,
    protectionToolIds: ids,
    protectionNotes,
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
  const section=event.target.closest('[data-prep-structured]');
  if (!section) return;
  if(event.target.matches('[data-prep-unlisted-toggle]')) section.querySelector('[data-prep-unlisted-fields]')?.toggleAttribute('hidden',!event.target.checked);
  if(event.target.matches('[data-prep-mantra-select]')) renderMantraPreview(section);
  try { collectAndSave(); } catch (_) {}
}, true);
document.addEventListener('click', (event) => {
  const button=event.target.closest('button');
  if(button?.dataset.prepAddSelectedTool!==undefined){
    const section=button.closest('[data-prep-structured]');const select=section?.querySelector('[data-prep-protection-select]');
    addSelectedTool(section,select?.value);if(select)select.value='';try{collectAndSave();}catch(_){}return;
  }
  if(button?.dataset.prepRemoveTool){button.closest('[data-prep-selected-tool]')?.remove();try{collectAndSave();}catch(_){}return;}
  const complete = event.target.closest('[data-action="complete-preparation"]');
  if (!complete) return;
  event.preventDefault();event.stopImmediatePropagation();
  try {
    const run = collectAndSave({allowCreate:true});
    if (!run) return;
    completeStructuredPreparation(store, run.id);
    document.querySelector('[data-action="dismiss-sheet"]')?.click();
  } catch (error) {
    alert(error.message);
    document.querySelector('[data-prep-frequency]')?.focus();
  }
}, true);
