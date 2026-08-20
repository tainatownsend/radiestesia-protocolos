import { createStore } from './store.js';
import { getOpenSession, latestPreparation, TreatmentStatus } from './domain.js';
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
    if (treatment.planningNotes && !card.querySelector('[data-planning-note]')) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.dataset.planningNote = 'true';
      note.textContent = treatment.planningNotes;
      row.before(note);
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
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Planejar tratamento</p><h2>Preparar um próximo ciclo</h2></div><button class="close-btn" data-planning-close>×</button></div><p class="muted">Planejar não inicia uma medição nem exige sessão aberta. O tratamento só entra em andamento quando for iniciado dentro de uma sessão.</p><form id="planned-treatment-form" class="form-grid"><div class="field"><label>Assistido</label><select name="assistedEntityId" required><option value="">Selecione</option>${assisted.map((item) => `<option value="${item.id}">${esc(item.displayName)}</option>`).join('')}</select></div><div class="field"><label>Objetivo / nome do tratamento</label><input name="title" required></div><div class="field"><label>Observações de planejamento</label><textarea name="notes" placeholder="Opcional"></textarea></div><button class="btn primary wide" type="submit">Salvar como Planejado</button></form></section>`);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.planTreatment !== undefined) { planDialog(); return; }
  if (button.dataset.planningClose !== undefined) { closeDialog(); return; }
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
    createPlannedTreatment(store, {
      assistedEntityId: data.get('assistedEntityId'),
      title: data.get('title'),
      notes: data.get('notes')
    });
    closeDialog();
  } catch (error) { alert(error.message); }
}, true);
