import { createStore } from './store.js';
import { getOpenSession, latestPreparation, TreatmentStatus } from './domain.js';
import { activeTools } from './activity-library.js';
import { createPlannedTreatment, startPlannedTreatment } from './treatment-planning.js';

const store = createStore();
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function dialog(html) {
  document.querySelector('#treatment-planning-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'treatment-planning-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function closeDialog() {
  document.querySelector('#treatment-planning-overlay')?.remove();
}

function toolOptions() {
  return activeTools(store.getState()).map((tool) => `<option value="${tool.id}" data-tool-name="${esc(tool.name)}">${esc(tool.name)}</option>`).join('');
}

function plannedComponentFields(index) {
  return `<section class="card" data-planned-component>
    <div class="section-head"><div><p class="eyebrow">Componente ${index}</p><h3>Definir antes de iniciar</h3></div>${index > 1 ? '<button type="button" class="btn ghost small" data-remove-planned-component>Remover</button>' : ''}</div>
    <div class="form-grid">
      <div class="field"><label>Usar recurso da Biblioteca <span class="muted">(opcional)</span></label><select name="toolId"><option value="">Digitar manualmente</option>${toolOptions()}</select></div>
      <div class="field"><label>Nome do componente</label><input name="componentName" required></div>
      <div class="field"><label>Comando / orientação</label><textarea name="instructions"></textarea></div>
      <div class="duration-grid"><div class="field"><label>Duração <span class="muted">(opcional)</span></label><input name="durationValue" type="number" min="1" inputmode="numeric" placeholder="Sem prazo"></div><div class="field"><label>Unidade</label><select name="durationUnit"><option value="MINUTE">minuto(s)</option><option value="HOUR">hora(s)</option><option value="DAY">dia(s)</option><option value="WEEK">semana(s)</option><option value="MONTH">mês(es)</option></select></div></div>
    </div>
  </section>`;
}

function renumber(form) {
  form.querySelectorAll('[data-planned-component]').forEach((section, index) => {
    const eyebrow = section.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = `Componente ${index + 1}`;
  });
}

function ensurePlanButton() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('[data-plan-treatment]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Tratamentos') return;
  const lead = main.querySelector('.lead');
  const section = document.createElement('section');
  section.className = 'section';
  section.innerHTML = '<button class="btn primary wide" data-plan-treatment>Planejar tratamento</button>';
  lead?.after(section);
}

function ensurePlannedActions() {
  const state = store.getState();
  const treatments = [...state.treatments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cards = [...document.querySelectorAll('.treatment-card')];
  cards.forEach((card, index) => {
    const treatment = treatments[index];
    if (!treatment) return;
    card.dataset.treatmentId = treatment.id;
    if (treatment.status !== TreatmentStatus.PLANNED || card.querySelector('[data-start-planned-treatment]')) return;
    const row = card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'), { className:'button-row' }));
    const button = document.createElement('button');
    button.className = 'btn primary small';
    button.dataset.startPlannedTreatment = treatment.id;
    button.textContent = 'Iniciar tratamento';
    row.appendChild(button);
    const count = state.treatmentComponents.filter((item) => item.treatmentId === treatment.id && item.status === TreatmentStatus.PLANNED).length;
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = count ? `${count} ${count === 1 ? 'componente planejado' : 'componentes planejados'} · os prazos começam ao iniciar` : 'Sem componentes definidos; você poderá adicioná-los depois de iniciar.';
    row.before(detail);
    if (treatment.planningNotes && !card.querySelector('[data-planning-note]')) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.dataset.planningNote = 'true';
      note.textContent = treatment.planningNotes;
      detail.before(note);
    }
  });
}

function relaxDurationRequirement() {
  document.querySelectorAll('#treatment-form [name="durationValue"], #component-form [name="durationValue"]').forEach((input) => {
    input.required = false;
    input.removeAttribute('required');
    input.placeholder = input.placeholder || 'Sem prazo';
  });
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensurePlanButton();
    ensurePlannedActions();
    relaxDurationRequirement();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

function planDialog() {
  const assisted = store.getState().assistedEntities.filter((item) => !item.archivedAt).sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Planejar tratamento</p><h2>Preparar um próximo ciclo</h2></div><button class="close-btn" data-planning-close>×</button></div><p class="muted">Planejar não inicia medição nem contagem de duração. Os componentes passam a contar tempo apenas quando o tratamento for iniciado dentro de uma sessão preparada.</p><form id="planned-treatment-form" class="form-grid"><div class="field"><label>Assistido</label><select name="assistedEntityId" required><option value="">Selecione</option>${assisted.map((item) => `<option value="${item.id}">${esc(item.displayName)}</option>`).join('')}</select></div><div class="field"><label>Objetivo / nome do tratamento</label><input name="title" required></div><div class="field"><label>Observações de planejamento</label><textarea name="notes" placeholder="Opcional"></textarea></div><div data-planned-components>${plannedComponentFields(1)}</div><button type="button" class="btn secondary wide" data-add-planned-component>Adicionar outro componente</button><button class="btn primary wide" type="submit">Salvar como Planejado</button></form></section>`);
}

document.addEventListener('change', (event) => {
  const select = event.target.closest('#planned-treatment-form select[name="toolId"]');
  if (!select?.value) return;
  const input = select.closest('[data-planned-component]')?.querySelector('[name="componentName"]');
  const tool = store.getState().tools.find((item) => item.id === select.value);
  if (input && tool) input.value = tool.name;
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.planTreatment !== undefined) { planDialog(); return; }
  if (button.dataset.planningClose !== undefined) { closeDialog(); return; }
  if (button.dataset.addPlannedComponent !== undefined) {
    const form = button.closest('#planned-treatment-form');
    const host = form.querySelector('[data-planned-components]');
    const count = host.querySelectorAll('[data-planned-component]').length + 1;
    host.insertAdjacentHTML('beforeend', plannedComponentFields(count));
    return;
  }
  if (button.dataset.removePlannedComponent !== undefined) {
    const form = button.closest('#planned-treatment-form');
    button.closest('[data-planned-component]')?.remove();
    renumber(form);
    return;
  }
  if (button.dataset.startPlannedTreatment) {
    const state = store.getState();
    const session = getOpenSession(state);
    if (!session) return alert('Abra uma sessão e conclua a preparação antes de iniciar este tratamento.');
    if (latestPreparation(state, session.id)?.status !== 'COMPLETED') return alert('Conclua a preparação da sessão antes de iniciar este tratamento.');
    try {
      startPlannedTreatment(store, button.dataset.startPlannedTreatment, session.id);
    } catch (error) { alert(error.message); }
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'planned-treatment-form') return;
  event.preventDefault();
  const data = new FormData(form);
  try {
    const names = data.getAll('componentName');
    const toolIds = data.getAll('toolId');
    const instructions = data.getAll('instructions');
    const durations = data.getAll('durationValue');
    const units = data.getAll('durationUnit');
    const components = names.map((name, index) => ({
      name,
      toolId: toolIds[index] || null,
      instructions: instructions[index] || null,
      durationValue: durations[index] || null,
      durationUnit: durations[index] ? units[index] : null
    }));
    createPlannedTreatment(store, {
      assistedEntityId: data.get('assistedEntityId'),
      title: data.get('title'),
      notes: data.get('notes'),
      components
    });
    closeDialog();
  } catch (error) { alert(error.message); }
}, true);
