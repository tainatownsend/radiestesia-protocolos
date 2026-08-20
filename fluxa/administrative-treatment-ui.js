import { createStore } from './store.js';
import { getOpenSession } from './domain.js';
import { canCompleteTreatmentAdministratively, completeTreatmentAdministratively } from './administrative-treatment.js';

const store = createStore();
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function closeDialog() {
  document.querySelector('#administrative-treatment-overlay')?.remove();
}

function dialog(treatment) {
  closeDialog();
  const wrap = document.createElement('div');
  wrap.id = 'administrative-treatment-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Conclusão administrativa</p><h2>${esc(treatment.title)}</h2></div><button class="close-btn" data-admin-treatment-close>×</button></div><div class="notice"><strong>Nenhuma medição será feita aqui.</strong><p>Use este registro somente quando a verificação terapêutica já ocorreu e todos os componentes já estão resolvidos.</p></div><form id="administrative-treatment-form" data-treatment="${treatment.id}" class="form-grid section"><label class="check-row"><input type="checkbox" name="confirmNoMeasurement" required><span>Confirmo que estou apenas registrando o encerramento e não realizando uma nova medição</span></label><div class="field"><label>Observações</label><textarea name="notes" placeholder="Opcional"></textarea></div><button class="btn primary wide" type="submit">Concluir registro do tratamento</button></form></section>`;
  document.body.appendChild(wrap);
}

function enhanceTreatmentCards() {
  if (getOpenSession(store.getState())) return;
  const state = store.getState();
  document.querySelectorAll('.treatment-card').forEach((card) => {
    if (card.querySelector('[data-admin-complete-treatment]')) return;
    const id = card.dataset.treatmentId;
    const treatment = state.treatments.find((item) => item.id === id) || state.treatments.find((item) => item.title === card.querySelector('h2')?.textContent?.trim());
    if (!treatment || !canCompleteTreatmentAdministratively(state, treatment.id)) return;
    const row = card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'), { className:'button-row' }));
    const button = document.createElement('button');
    button.className = 'btn secondary small';
    button.dataset.adminCompleteTreatment = treatment.id;
    button.textContent = 'Concluir registro';
    row.prepend(button);
  });
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { enhanceTreatmentCards(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.adminTreatmentClose !== undefined) { closeDialog(); return; }
  if (button.dataset.adminCompleteTreatment) {
    const treatment = store.getState().treatments.find((item) => item.id === button.dataset.adminCompleteTreatment);
    if (treatment) dialog(treatment);
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'administrative-treatment-form') return;
  event.preventDefault();
  const data = new FormData(form);
  try {
    completeTreatmentAdministratively(store, form.dataset.treatment, {
      confirmNoMeasurement: data.get('confirmNoMeasurement') === 'on',
      notes: data.get('notes')
    });
    closeDialog();
  } catch (error) { alert(error.message); }
}, true);
