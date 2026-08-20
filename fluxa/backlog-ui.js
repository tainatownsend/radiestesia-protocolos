import { createStore } from './store.js';
import { createAssistedEntity, getOpenSession, latestPreparation } from './domain.js';
import {
  isPossiblyForgottenOpenSession,
  correctForgottenSessionClose,
  addTreatmentComponent,
  stopTreatmentComponent,
  replaceTreatmentComponent,
  resumeTreatmentPreservingDuration,
  recordStructuredFinalAssessment,
  validateAssistedInput
} from './backlog.js';

const store = createStore();
let enhancing = false;
const FORGOTTEN_DISMISS_PREFIX = 'fluxa.forgotten.dismissed.';
const QA_FORGOTTEN_PREFIX = 'fluxa.qa.forgotten.';

function esc(value = '') {
  return String(value).replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '\"':'&quot;' }[c]));
}

function localDateTime(iso = new Date().toISOString()) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}

function dialog(html) {
  document.querySelector('#backlog-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'backlog-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function closeDialog() {
  document.querySelector('#backlog-overlay')?.remove();
}

function forgottenDismissKey(sessionId) { return `${FORGOTTEN_DISMISS_PREFIX}${sessionId}`; }
function qaForgottenKey(sessionId) { return `${QA_FORGOTTEN_PREFIX}${sessionId}`; }

function shouldShowForgottenBanner(session) {
  if (!session) return false;
  if (sessionStorage.getItem(forgottenDismissKey(session.id)) === '1') return false;
  return isPossiblyForgottenOpenSession(session) || sessionStorage.getItem(qaForgottenKey(session.id)) === '1';
}

function ensureForgottenSessionBanner() {
  const state = store.getState();
  const session = getOpenSession(state);
  const main = document.querySelector('main');
  if (!main || !session || !shouldShowForgottenBanner(session)) {
    document.querySelector('[data-forgotten-session]')?.remove();
    return;
  }
  if (document.querySelector('[data-forgotten-session]')) return;
  const banner = document.createElement('section');
  banner.dataset.forgottenSession = session.id;
  banner.className = 'section notice-card forgotten-session-card';
  banner.innerHTML = `<div><p class="eyebrow">Sessão ainda aberta</p><h2>Esta sessão começou anteriormente.</h2><p>Você pode continuar normalmente ou corrigir o horário em que ela realmente terminou. O Fluxa nunca fecha uma sessão automaticamente.</p></div><div class="button-row"><button class="btn secondary" data-backlog-continue="${session.id}">Continuar sessão</button><button class="btn primary" data-backlog-correct-session="${session.id}">Corrigir encerramento</button></div>`;
  main.insertBefore(banner, main.children[3] || null);
}

function ensureTreatmentActions() {
  document.querySelectorAll('.treatment-card').forEach((card) => {
    if (card.querySelector('[data-backlog-manage-components]')) return;
    const source = card.querySelector('[data-review-treatment],[data-interrupt-treatment],[data-resume-treatment]');
    if (!source) return;
    const treatmentId = source.dataset.reviewTreatment || source.dataset.interruptTreatment || source.dataset.resumeTreatment;
    const row = card.querySelector('.button-row');
    if (!row || !treatmentId) return;
    const button = document.createElement('button');
    button.className = 'btn ghost small';
    button.dataset.backlogManageComponents = treatmentId;
    button.textContent = 'Componentes';
    row.appendChild(button);
  });

  const state = store.getState();
  document.querySelectorAll('.treatment-card').forEach((card) => {
    if (card.querySelector('[data-backlog-final-assessment]')) return;
    const title = card.querySelector('h2')?.textContent;
    const treatment = state.treatments.find((item) => item.title === title && item.status === 'COMPLETED');
    if (!treatment) return;
    const button = document.createElement('button');
    button.className = 'btn secondary small';
    button.dataset.backlogFinalAssessment = treatment.id;
    button.textContent = 'Avaliação final';
    const row = card.querySelector('.button-row') || document.createElement('div');
    if (!row.parentNode) { row.className = 'button-row'; card.appendChild(row); }
    row.appendChild(button);
  });
}

function ensureAssistedFields() {
  const form = document.querySelector('#assisted-form');
  if (!form || form.dataset.backlogEnhanced) return;
  form.dataset.backlogEnhanced = 'true';
  const type = form.querySelector('[name="type"]');
  const detailsField = form.querySelector('[name="details"]')?.closest('.field');
  const dynamic = document.createElement('div');
  dynamic.id = 'assisted-dynamic-fields';
  dynamic.className = 'form-grid';
  detailsField?.before(dynamic);

  function paint() {
    const value = type.value;
    if (value === 'PERSON') dynamic.innerHTML = `<div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" required></div>`;
    else if (value === 'GROUP') dynamic.innerHTML = `<div class="field"><label>Integrantes</label><textarea name="membersText" required placeholder="Uma pessoa por linha: Nome completo | AAAA-MM-DD"></textarea><small class="muted">A investigação e o tratamento continuam pertencendo ao grupo como uma única entidade.</small></div>`;
    else if (value === 'ENVIRONMENT') dynamic.innerHTML = `<div class="field"><label>Endereço completo</label><textarea name="address" required placeholder="Rua, número, cidade, estado/província, país"></textarea></div>`;
    else if (value === 'PET') dynamic.innerHTML = `<div class="field"><label>Detalhes do PET</label><textarea name="petDetails" placeholder="Espécie, idade aproximada, tutor ou outros dados úteis"></textarea></div>`;
    else if (value === 'SITUATION') dynamic.innerHTML = `<div class="field"><label>Número / identificação do processo</label><input name="identifier" required></div><div class="field"><label>Pessoa envolvida / solicitante</label><input name="relatedPerson" required placeholder="Nome completo"></div>`;
    else dynamic.innerHTML = '';
  }
  type.addEventListener('change', paint);
  paint();
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureForgottenSessionBanner();
    ensureTreatmentActions();
    ensureAssistedFields();
  } finally {
    enhancing = false;
  }
}

const observer = new MutationObserver(enhance);
observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
queueMicrotask(enhance);

function correctionDialog(sessionId) {
  const session = store.getState().sessions.find((item) => item.id === sessionId);
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Corrigir encerramento</p><h2>Quando esta sessão realmente terminou?</h2></div><button class="close-btn" data-backlog-close>×</button></div><p class="muted">O horário real ficará separado do momento em que esta correção foi registrada.</p><form id="correct-session-form" data-session="${sessionId}" class="form-grid"><div class="field"><label>Horário real de término</label><input name="endedAt" type="datetime-local" min="${localDateTime(session.startedAt)}" max="${localDateTime()}" value="${localDateTime()}" required></div><label class="check-row"><input type="checkbox" name="confirmed" required><span>Confirmo que o procedimento de encerramento foi realizado</span></label><button class="btn primary wide" type="submit">Registrar encerramento corrigido</button></form></section>`);
}

function componentsDialog(treatmentId) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  const components = state.treatmentComponents.filter((item) => item.treatmentId === treatmentId);
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Componentes</p><h2>${esc(treatment?.title || '')}</h2></div><button class="close-btn" data-backlog-close>×</button></div><div class="stack">${components.map((item) => `<article class="card"><div class="section-head"><div><strong>${esc(item.name)}</strong><p class="muted">${esc(item.status)}${item.expectedEndAt ? ` · revisão ${new Date(item.expectedEndAt).toLocaleString('pt-BR')}` : ''}</p></div></div>${['IN_PROGRESS','INTERRUPTED'].includes(item.status) ? `<div class="button-row"><button class="btn secondary small" data-backlog-replace-component="${item.id}">Substituir</button><button class="btn danger small" data-backlog-stop-component="${item.id}">Parar</button></div>` : ''}</article>`).join('') || `<div class="empty">Nenhum componente.</div>`}</div>${treatment?.status === 'IN_PROGRESS' ? `<section class="section"><button class="btn primary wide" data-backlog-add-component="${treatmentId}">Adicionar componente</button></section>` : ''}</section>`);
}

function componentForm(treatmentId, replaceId = null) {
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">${replaceId ? 'Substituir componente' : 'Novo componente'}</p><h2>Preservar histórico</h2></div><button class="close-btn" data-backlog-close>×</button></div><p class="muted">O componente anterior nunca é sobrescrito. Substituições ficam ligadas ao novo registro.</p><form id="component-form" data-treatment="${treatmentId}" data-replace="${replaceId || ''}" class="form-grid"><div class="field"><label>Nome / gráfico / ferramenta</label><input name="name" required></div><div class="field"><label>Comando / orientação</label><textarea name="instructions"></textarea></div><div class="duration-grid"><div class="field"><label>Duração</label><input name="durationValue" type="number" min="1" required></div><div class="field"><label>Unidade</label><select name="durationUnit"><option value="MINUTE">minuto(s)</option><option value="HOUR">hora(s)</option><option value="DAY">dia(s)</option><option value="WEEK">semana(s)</option><option value="MONTH">mês(es)</option></select></div></div><button class="btn primary wide" type="submit">${replaceId ? 'Substituir' : 'Adicionar'}</button></form></section>`);
}

function finalAssessmentDialog(treatmentId) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session || latestPreparation(state, session.id)?.status !== 'COMPLETED') {
    alert('Abra e prepare uma sessão antes de fazer a avaliação final com nova medição.');
    return;
  }
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliação final</p><h2>Frequência e desequilíbrio</h2></div><button class="close-btn" data-backlog-close>×</button></div><p class="muted">Depois de desmontar todos os componentes, registre a nova medição e decida se outro ciclo é necessário.</p><form id="final-assessment-form" data-treatment="${treatmentId}" data-session="${session.id}" class="form-grid"><div class="field"><label>Frequência vibracional</label><input name="frequency" placeholder="Valor / escala utilizada"></div><div class="field"><label>Desequilíbrio atual (%)</label><input name="imbalancePercent" type="number" min="0" max="100" step="5"></div><label class="check-row"><input type="checkbox" name="needsNewTreatment"><span>É necessário um novo tratamento</span></label><div class="field"><label>Quando iniciar o próximo tratamento?</label><input name="nextTreatmentWhen" placeholder="Ex.: amanhã, em 7 dias, após nova avaliação"></div><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><button class="btn primary wide" type="submit">Registrar avaliação final</button></form></section>`);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.backlogContinue) {
    const sessionId = button.dataset.backlogContinue;
    sessionStorage.setItem(forgottenDismissKey(sessionId), '1');
    sessionStorage.removeItem(qaForgottenKey(sessionId));
    button.closest('[data-forgotten-session]')?.remove();
    return;
  }
  if (button.dataset.backlogCorrectSession) { correctionDialog(button.dataset.backlogCorrectSession); return; }
  if (button.dataset.backlogClose !== undefined) { closeDialog(); return; }
  if (button.dataset.backlogManageComponents) { componentsDialog(button.dataset.backlogManageComponents); return; }
  if (button.dataset.backlogAddComponent) { componentForm(button.dataset.backlogAddComponent); return; }
  if (button.dataset.backlogReplaceComponent) {
    const component = store.getState().treatmentComponents.find((item) => item.id === button.dataset.backlogReplaceComponent);
    componentForm(component.treatmentId, component.id); return;
  }
  if (button.dataset.backlogStopComponent) {
    if (confirm('Parar este componente mantendo todo o histórico?')) {
      stopTreatmentComponent(store, button.dataset.backlogStopComponent);
      componentsDialog(store.getState().treatmentComponents.find((item) => item.id === button.dataset.backlogStopComponent)?.treatmentId);
    }
    return;
  }
  if (button.dataset.backlogFinalAssessment) { finalAssessmentDialog(button.dataset.backlogFinalAssessment); return; }
}, true);

// Override the original resume action so interruption time does not consume the component's prescribed duration.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-resume-treatment]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resumeTreatmentPreservingDuration(store, button.dataset.resumeTreatment, { preserveRemainingDuration: true });
  location.reload();
}, true);

// Capture the assisted form before the base app handles it so type-specific minimum fields are preserved.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'assisted-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    const data = new FormData(form);
    const members = String(data.get('membersText') || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [fullName, birthDate] = line.split('|').map((part) => part.trim());
      return { fullName, birthDate };
    });
    const type = data.get('type');
    const relatedPerson = String(data.get('relatedPerson') || '').trim();
    const detailsBase = String(data.get('details') || '').trim();
    const petDetails = String(data.get('petDetails') || '').trim();
    const input = {
      type,
      displayName: data.get('displayName'),
      birthDate: data.get('birthDate') || null,
      address: data.get('address') || null,
      identifier: data.get('identifier') || null,
      members,
      details: [detailsBase, petDetails, relatedPerson ? `Pessoa envolvida/solicitante: ${relatedPerson}` : ''].filter(Boolean).join('\n')
    };
    validateAssistedInput(input);
    createAssistedEntity(store, input);
    location.reload();
  } catch (error) { alert(error.message); }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'correct-session-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      correctForgottenSessionClose(store, form.dataset.session, new Date(data.get('endedAt')).toISOString());
      sessionStorage.removeItem(qaForgottenKey(form.dataset.session));
      sessionStorage.removeItem(forgottenDismissKey(form.dataset.session));
      location.reload();
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'component-form') {
    event.preventDefault();
    const data = new FormData(form);
    const open = getOpenSession(store.getState());
    const input = { sessionId: open?.id || null, treatmentId: form.dataset.treatment, name:data.get('name'), instructions:data.get('instructions'), durationValue:data.get('durationValue'), durationUnit:data.get('durationUnit') };
    try {
      if (form.dataset.replace) replaceTreatmentComponent(store, form.dataset.replace, input);
      else addTreatmentComponent(store, input);
      componentsDialog(form.dataset.treatment);
    } catch (error) { alert(error.message); }
  }
  if (form.id === 'final-assessment-form') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      recordStructuredFinalAssessment(store, { treatmentId:form.dataset.treatment, sessionId:form.dataset.session, frequency:data.get('frequency'), imbalancePercent:data.get('imbalancePercent'), needsNewTreatment:data.get('needsNewTreatment') === 'on', nextTreatmentWhen:data.get('nextTreatmentWhen'), notes:data.get('notes') });
      closeDialog();
      alert('Avaliação final registrada no histórico do assistido.');
    } catch (error) { alert(error.message); }
  }
});
