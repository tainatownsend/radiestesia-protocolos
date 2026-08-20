import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { recordStructuredFinalAssessment } from './backlog.js';
import {
  componentReviewAvailable,
  recordComponentDismantlingReview,
  treatmentComponentResolution,
  updateAssistedEntity,
  archiveAssistedEntity,
  completeTreatmentAfterFinalAssessment
} from './remaining.js';
import { inspectStorageHealth, recoverLocalData, exportLocalDataFile } from './storage-health.js';

const store = createStore();
let currentAssistedId = null;
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function dialog(html) {
  document.querySelector('#remaining-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'remaining-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function closeDialog() {
  document.querySelector('#remaining-overlay')?.remove();
}

function requirePreparedSession() {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) throw new Error('Abra uma sessão antes de fazer esta medição.');
  if (latestPreparation(state, session.id)?.status !== 'COMPLETED') throw new Error('Conclua a preparação da sessão antes da medição.');
  return session;
}

function ensureStorageBanner() {
  const health = inspectStorageHealth();
  document.querySelector('[data-storage-health]')?.remove();
  if (health.status === 'OK') return;
  const main = document.querySelector('main');
  if (!main) return;
  const banner = document.createElement('section');
  banner.dataset.storageHealth = health.status;
  banner.className = 'section storage-warning';
  banner.setAttribute('role', 'alert');
  const copy = health.status === 'WRITE_ERROR'
    ? 'O Fluxa não conseguiu confirmar que este dispositivo aceita novas gravações locais.'
    : 'A cópia principal dos dados locais parece corrompida. Há uma cópia de recuperação disponível.';
  banner.innerHTML = `<div><p class="eyebrow">Dados locais</p><h2>Atenção ao salvamento</h2><p>${copy}</p></div><div class="button-row">${health.canRecover ? '<button class="btn primary small" data-storage-recover>Recuperar cópia</button>' : ''}<button class="btn secondary small" data-storage-export>Exportar dados válidos</button></div>`;
  main.prepend(banner);
}

function ensureBackupAction() {
  const main = document.querySelector('main');
  if (!main || document.querySelector('[data-storage-export-quiet]')) return;
  const eyebrow = main.querySelector('.eyebrow')?.textContent?.trim();
  if (eyebrow !== 'Hoje') return;
  const button = document.createElement('button');
  button.className = 'btn ghost small local-backup-action';
  button.dataset.storageExportQuiet = 'true';
  button.textContent = 'Exportar cópia local';
  main.appendChild(button);
}

function enhanceComponentDialog() {
  const state = store.getState();
  document.querySelectorAll('#backlog-overlay article.card').forEach((card) => {
    if (card.querySelector('[data-component-dismantle]')) return;
    const control = card.querySelector('[data-backlog-replace-component],[data-backlog-stop-component]');
    if (!control) return;
    const componentId = control.dataset.backlogReplaceComponent || control.dataset.backlogStopComponent;
    const component = state.treatmentComponents.find((item) => item.id === componentId);
    if (!component || component.status !== 'IN_PROGRESS') return;
    const row = card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'), { className:'button-row' }));
    const button = document.createElement('button');
    button.className = componentReviewAvailable(component) ? 'btn primary small' : 'btn secondary small';
    button.dataset.componentDismantle = component.id;
    button.textContent = componentReviewAvailable(component) ? 'Revisar / desmontar' : 'Revisar componente';
    row.prepend(button);
  });
}

function enhanceTreatmentCards() {
  const state = store.getState();
  document.querySelectorAll('.treatment-card').forEach((card) => {
    if (card.querySelector('[data-final-cycle]')) return;
    const title = card.querySelector('h2')?.textContent?.trim();
    const treatment = state.treatments.find((item) => item.title === title && item.status === 'IN_PROGRESS');
    if (!treatment) return;
    const resolution = treatmentComponentResolution(state, treatment.id);
    if (!resolution.readyForFinalAssessment) return;
    const row = card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'), { className:'button-row' }));
    const button = document.createElement('button');
    button.className = 'btn primary small';
    button.dataset.finalCycle = treatment.id;
    button.textContent = 'Avaliação final';
    row.prepend(button);
  });
}

function enhanceAssistedDetail() {
  const detail = document.querySelector('.detail-sheet');
  if (!detail || !currentAssistedId || detail.querySelector('[data-assisted-edit]')) return;
  const assisted = store.getState().assistedEntities.find((item) => item.id === currentAssistedId && !item.archivedAt);
  if (!assisted) return;
  const actions = document.createElement('div');
  actions.className = 'button-row assisted-detail-actions';
  actions.innerHTML = `<button class="btn secondary small" data-assisted-edit="${assisted.id}">Editar</button><button class="btn danger small" data-assisted-archive="${assisted.id}">Arquivar</button>`;
  detail.querySelector('.sheet-head')?.after(actions);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureStorageBanner();
    ensureBackupAction();
    enhanceComponentDialog();
    enhanceTreatmentCards();
    enhanceAssistedDetail();
  } finally {
    enhancing = false;
  }
}

const observer = new MutationObserver(enhance);
observer.observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

function componentReviewDialog(componentId) {
  const state = store.getState();
  const component = state.treatmentComponents.find((item) => item.id === componentId);
  const treatment = state.treatments.find((item) => item.id === component?.treatmentId);
  if (!component || !treatment) return;
  let session;
  try { session = requirePreparedSession(); } catch (error) { alert(error.message); return; }
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Revisão do componente</p><h2>${esc(component.name)}</h2></div><button class="close-btn" data-remaining-close>×</button></div><p class="muted">Confirme as duas perguntas com o pêndulo. O componente só será marcado como desmontado quando ambas forem positivas.</p><form id="component-review-form" data-component="${component.id}" data-session="${session.id}" class="form-grid"><label class="check-row"><input type="checkbox" name="verifiedComplete"><span>Este componente está 100% finalizado</span></label><label class="check-row"><input type="checkbox" name="permissionToDismantle"><span>Tenho permissão para desmontar este componente</span></label><div class="field"><label>Observações</label><textarea name="notes" placeholder="Opcional"></textarea></div><button class="btn primary wide" type="submit">Registrar verificação</button></form></section>`);
}

function finalCycleDialog(treatmentId) {
  let session;
  try { session = requirePreparedSession(); } catch (error) { alert(error.message); return; }
  const resolution = treatmentComponentResolution(store.getState(), treatmentId);
  if (!resolution.readyForFinalAssessment) { alert('Resolva todos os componentes antes da avaliação final.'); return; }
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliação final</p><h2>Reavaliar após desmontagem</h2></div><button class="close-btn" data-remaining-close>×</button></div><p class="muted">Todos os componentes estão resolvidos. Registre frequência vibracional, desequilíbrio e se outro ciclo será necessário.</p><form id="final-cycle-form" data-treatment="${treatmentId}" data-session="${session.id}" class="form-grid"><div class="field"><label>Frequência vibracional</label><input name="frequency" placeholder="Valor / escala utilizada"></div><div class="field"><label>Desequilíbrio atual (%)</label><input name="imbalancePercent" type="number" min="0" max="100" step="5"></div><label class="check-row"><input type="checkbox" name="needsNewTreatment"><span>É necessário um novo tratamento</span></label><div class="field"><label>Quando iniciar o próximo tratamento?</label><input name="nextTreatmentWhen" placeholder="Ex.: amanhã, em 7 dias, após nova avaliação"></div><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><button class="btn primary wide" type="submit">Registrar e concluir este tratamento</button></form></section>`);
}

function parseMembers(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [fullName, birthDate] = line.split('|').map((part) => part.trim());
    return { fullName, birthDate };
  });
}

function editAssistedDialog(id) {
  const assisted = store.getState().assistedEntities.find((item) => item.id === id && !item.archivedAt);
  if (!assisted) return;
  const typeSpecific = assisted.type === 'PERSON'
    ? `<div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" value="${esc(assisted.birthDate || '')}" required></div>`
    : assisted.type === 'GROUP'
      ? `<div class="field"><label>Integrantes</label><textarea name="membersText" required>${esc((assisted.members || []).map((m) => `${m.fullName} | ${m.birthDate}`).join('\n'))}</textarea></div>`
      : assisted.type === 'ENVIRONMENT'
        ? `<div class="field"><label>Endereço completo</label><textarea name="address" required>${esc(assisted.address || '')}</textarea></div>`
        : assisted.type === 'SITUATION'
          ? `<div class="field"><label>Número / identificação do processo</label><input name="identifier" value="${esc(assisted.identifier || '')}" required></div>`
          : '';
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Editar assistido</p><h2>${esc(assisted.displayName)}</h2></div><button class="close-btn" data-remaining-close>×</button></div><p class="muted">O tipo permanece ${esc(assisted.type)} para preservar a coerência do histórico.</p><form id="edit-assisted-form" data-assisted="${assisted.id}" data-type="${assisted.type}" class="form-grid"><div class="field"><label>Nome ou identificação</label><input name="displayName" value="${esc(assisted.displayName)}" required></div>${typeSpecific}<div class="field"><label>Detalhes</label><textarea name="details">${esc(assisted.details || '')}</textarea></div><button class="btn primary wide" type="submit">Salvar alterações</button></form></section>`);
}

function archiveDialog(id) {
  const assisted = store.getState().assistedEntities.find((item) => item.id === id);
  if (!assisted) return;
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Arquivar assistido</p><h2>${esc(assisted.displayName)}</h2></div><button class="close-btn" data-remaining-close>×</button></div><p class="muted">Arquivar remove o assistido das listas de trabalho futuro, mas preserva integralmente o histórico. Trabalhos ativos impedem o arquivamento.</p><form id="archive-assisted-form" data-assisted="${id}" class="form-grid"><div class="field"><label>Motivo opcional</label><textarea name="reason"></textarea></div><button class="btn danger wide" type="submit">Arquivar mantendo histórico</button></form></section>`);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.assistedDetail) currentAssistedId = button.dataset.assistedDetail;
  if (button.dataset.remainingClose !== undefined) { closeDialog(); return; }
  if (button.dataset.componentDismantle) { componentReviewDialog(button.dataset.componentDismantle); return; }
  if (button.dataset.finalCycle) { finalCycleDialog(button.dataset.finalCycle); return; }
  if (button.dataset.assistedEdit) { editAssistedDialog(button.dataset.assistedEdit); return; }
  if (button.dataset.assistedArchive) { archiveDialog(button.dataset.assistedArchive); return; }
  if (button.dataset.storageRecover !== undefined) {
    try { recoverLocalData(); location.reload(); } catch (error) { alert(error.message); }
    return;
  }
  if (button.dataset.storageExport !== undefined || button.dataset.storageExportQuiet !== undefined) {
    try { exportLocalDataFile(); } catch (error) { alert(error.message); }
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'component-review-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      recordComponentDismantlingReview(store, {
        componentId: form.dataset.component,
        sessionId: form.dataset.session,
        verifiedComplete: data.get('verifiedComplete') === 'on',
        permissionToDismantle: data.get('permissionToDismantle') === 'on',
        notes: data.get('notes')
      });
      closeDialog();
      document.querySelector('#backlog-overlay')?.remove();
      location.reload();
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'final-cycle-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      recordStructuredFinalAssessment(store, {
        treatmentId: form.dataset.treatment,
        sessionId: form.dataset.session,
        frequency: data.get('frequency'),
        imbalancePercent: data.get('imbalancePercent'),
        needsNewTreatment: data.get('needsNewTreatment') === 'on',
        nextTreatmentWhen: data.get('nextTreatmentWhen'),
        notes: data.get('notes')
      });
      completeTreatmentAfterFinalAssessment(store, form.dataset.treatment, form.dataset.session);
      location.reload();
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'edit-assisted-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      updateAssistedEntity(store, form.dataset.assisted, {
        type: form.dataset.type,
        displayName: data.get('displayName'),
        birthDate: data.get('birthDate') || null,
        address: data.get('address') || null,
        identifier: data.get('identifier') || null,
        members: parseMembers(data.get('membersText')),
        details: data.get('details') || null
      });
      location.reload();
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'archive-assisted-form') {
    event.preventDefault();
    const data = new FormData(form);
    try { archiveAssistedEntity(store, form.dataset.assisted, data.get('reason')); location.reload(); }
    catch (error) { alert(error.message); }
  }
}, true);
