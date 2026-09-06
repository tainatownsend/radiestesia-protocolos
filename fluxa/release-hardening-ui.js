import { createStore } from './store.js';
import { getOpenSession, latestPreparation, treatmentNeedsReview, TreatmentStatus } from './domain.js';
import { hawkinsBaseline, recordHawkinsBaseline } from './hawkins-measurement.js';
import { treatmentComponentResolution } from './remaining.js';
import { isReikiEnabled } from './reiki-modality.js';
import { inspectStorageHealth } from './storage-health.js';

const store = createStore();
let scheduled = false;
let bodyScrollY = 0;
let modalLocked = false;
let lastModalTrigger = null;
const managedOverlays = new WeakSet();

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}
function currentAssisted(state, session) {
  return (state.assistedEntities || []).find((item) => item.id === session?.currentAssistedEntityId && !item.archivedAt) || null;
}
function prepared(state, session) {
  return Boolean(session && latestPreparation(state, session.id)?.status === 'COMPLETED');
}
function activeTreatments(state, assistedId) {
  return (state.treatments || []).filter((item) => item.assistedEntityId === assistedId && item.status === TreatmentStatus.IN_PROGRESS);
}
function hasUrgentTreatmentAction(state, assistedId) {
  return activeTreatments(state, assistedId).some((treatment) => {
    const resolution = treatmentComponentResolution(state, treatment.id);
    return resolution.readyForFinalAssessment || treatmentNeedsReview(state, treatment);
  });
}
function activeInvestigation(state, session, assistedId) {
  return [...(state.investigations || [])]
    .filter((item) => item.status === 'IN_PROGRESS' && item.assistedEntityId === assistedId && (!session || item.currentSessionId === session.id))
    .sort((a, b) => String(b.updatedAt || b.startedAt || '').localeCompare(String(a.updatedAt || a.startedAt || '')))[0] || null;
}

function toastRegion() {
  let region = document.querySelector('[data-fluxa-toast-region]');
  if (region) return region;
  region = document.createElement('div');
  region.className = 'fluxa-toast-region';
  region.dataset.fluxaToastRegion = 'true';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'false');
  document.body.appendChild(region);
  return region;
}
export function showFluxaToast(message, kind = 'error') {
  const text = String(message || '').trim();
  if (!text) return;
  const toast = document.createElement('div');
  toast.className = 'fluxa-toast';
  toast.dataset.kind = kind;
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.textContent = text;
  toastRegion().appendChild(toast);
  window.setTimeout(() => toast.remove(), kind === 'error' ? 5200 : 3600);
}
function installAlertBridge() {
  if (window.alert?.__fluxaManaged) return;
  const managed = (message) => showFluxaToast(message, 'error');
  managed.__fluxaManaged = true;
  window.alert = managed;
}

function updateVisualViewport() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--fluxa-vvh', `${Math.max(320, Math.round(height))}px`);
}
function visibleOverlays() {
  return [...document.querySelectorAll('.modal-backdrop')].filter((node) => !node.hidden && node.getClientRects().length > 0);
}
function lockBody() {
  if (modalLocked) return;
  modalLocked = true;
  bodyScrollY = window.scrollY || 0;
  document.body.classList.add('fluxa-modal-open');
  document.body.style.position = 'fixed';
  document.body.style.top = `${-bodyScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}
function unlockBody() {
  if (!modalLocked) return;
  modalLocked = false;
  document.body.classList.remove('fluxa-modal-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, bodyScrollY);
  const focusTarget = lastModalTrigger;
  lastModalTrigger = null;
  if (focusTarget?.isConnected) requestAnimationFrame(() => focusTarget.focus({ preventScroll:true }));
}
function focusable(root) {
  return [...root.querySelectorAll('button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.getClientRects().length > 0);
}
function manageModals() {
  const overlays = visibleOverlays();
  if (overlays.length) lockBody(); else unlockBody();
  for (const overlay of overlays) {
    overlay.classList.add('fluxa-managed-overlay');
    const sheet = overlay.querySelector(':scope > .sheet') || overlay.querySelector('.sheet');
    if (!sheet) continue;
    sheet.classList.add('fluxa-managed-sheet');
    sheet.setAttribute('role', sheet.getAttribute('role') || 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (!managedOverlays.has(overlay)) {
      managedOverlays.add(overlay);
      lastModalTrigger = document.activeElement instanceof HTMLElement && !overlay.contains(document.activeElement) ? document.activeElement : lastModalTrigger;
      requestAnimationFrame(() => {
        const target = sheet.querySelector('[autofocus]') || focusable(sheet)[0];
        target?.focus({ preventScroll:true });
      });
    }
  }
}
function topOverlay() {
  return visibleOverlays().at(-1) || null;
}
function closeTopOverlay(overlay) {
  const close = overlay?.querySelector('[data-close-workspace-settings],[data-close-prep-resource-picker],[data-close-hawkins-planned],[data-close-hawkins-investigation],[data-reiki-session-start-close],[data-close],[data-action="close-modal"],.close-btn');
  close?.click();
}
function handleModalKeys(event) {
  const overlay = topOverlay();
  if (!overlay) return;
  if (event.key === 'Escape') {
    const close = overlay.querySelector('[data-close-workspace-settings],[data-close-prep-resource-picker],[data-close-hawkins-planned],[data-close-hawkins-investigation],[data-reiki-session-start-close],[data-close],[data-action="close-modal"],.close-btn');
    if (close) {
      event.preventDefault();
      closeTopOverlay(overlay);
    }
    return;
  }
  if (event.key !== 'Tab') return;
  const sheet = overlay.querySelector('.sheet');
  const items = sheet ? focusable(sheet) : [];
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

function hawkinsHomeModal(state, session, assisted) {
  document.querySelector('#fluxa-home-hawkins-overlay')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'fluxa-home-hawkins-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Antes do trabalho</p><h2>Hawkins inicial</h2></div><button type="button" class="close-btn" data-close-fluxa-home-hawkins aria-label="Fechar">×</button></div><p class="muted">Registre a frequência inicial de ${esc(assisted.displayName || 'este Assistido')}. O valor será reutilizado nesta sessão para investigação e início de tratamento.</p><form id="fluxa-home-hawkins-form" class="form-grid" data-session="${esc(session.id)}" data-assisted="${esc(assisted.id)}"><div class="field"><label for="fluxa-home-hawkins-value">Frequência inicial</label><div class="hawkins-input"><input id="fluxa-home-hawkins-value" name="hertz" type="number" min="0.01" step="any" inputmode="decimal" required placeholder="Ex.: 350"><b>Hz</b></div></div><button type="submit" class="btn primary wide">Registrar Hawkins</button></form></section>`;
  document.body.appendChild(wrap);
}
function ensureHawkinsHomeRecommendation(state, session, assisted) {
  const cockpit = document.querySelector('[data-home-cockpit]');
  if (!cockpit || !prepared(state, session) || !assisted) return;
  const baseline = hawkinsBaseline(state, session.id, assisted.id);
  let preflight = cockpit.querySelector('[data-fluxa-home-preflight]');
  if (baseline) {
    if (!preflight) {
      preflight = document.createElement('div');
      preflight.className = 'fluxa-home-preflight';
      preflight.dataset.fluxaHomePreflight = 'true';
      cockpit.querySelector('.home-cockpit-next')?.after(preflight);
    }
    preflight.innerHTML = `<div><strong>Hawkins inicial · ${esc(baseline.hertz)} Hz</strong><small>Válido para ${esc(assisted.displayName)} nesta sessão.</small></div><span class="status-pill">Registrado</span>`;
    return;
  }
  if (!preflight) {
    preflight = document.createElement('div');
    preflight.className = 'fluxa-home-preflight';
    preflight.dataset.fluxaHomePreflight = 'true';
    cockpit.querySelector('.home-cockpit-next')?.after(preflight);
  }
  preflight.innerHTML = `<div><strong>Hawkins inicial ainda não registrado</strong><small>Faça uma única medição antes de investigar ou iniciar um tratamento.</small></div><button type="button" class="btn secondary small" data-fluxa-home-hawkins>Registrar</button>`;

  if (hasUrgentTreatmentAction(state, assisted.id)) return;
  const next = cockpit.querySelector('.home-cockpit-next');
  const copy = next?.querySelector('.home-next-copy');
  const action = next?.querySelector('.home-next-action');
  if (copy) {
    const eyebrow = copy.querySelector('.eyebrow');
    const title = copy.querySelector('h1');
    const detail = copy.querySelector('p:not(.eyebrow)');
    if (eyebrow) eyebrow.textContent = 'Próxima ação recomendada';
    if (title) title.textContent = 'Registrar Hawkins inicial';
    if (detail) detail.textContent = activeInvestigation(state, session, assisted.id)
      ? 'Há uma investigação para continuar, mas esta sessão ainda precisa da medição inicial do Assistido.'
      : 'Registre a medição uma vez e siga para investigação ou tratamento.';
  }
  if (action) action.innerHTML = '<button type="button" class="btn primary" data-fluxa-home-hawkins>Registrar Hawkins</button>';
}
function ensureReikiHomeAction(state, session, assisted) {
  const actions = document.querySelector('[data-home-actions]');
  if (!actions) return;
  const existing = actions.querySelector('[data-fluxa-home-reiki]');
  const enabled = Boolean(session && assisted && prepared(state, session) && isReikiEnabled(state));
  if (!enabled) { existing?.remove(); return; }
  actions.classList.add('fluxa-home-actions-ready');
  if (existing) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-action fluxa-home-reiki';
  button.dataset.action = 'reiki';
  button.dataset.fluxaHomeReiki = 'true';
  button.innerHTML = '<span class="home-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 8c3.4 0 5.6 1.7 7 4-1.4 2.3-3.6 4-7 4 0-3.1 1.3-5.8 3.5-8M19 8c-3.4 0-5.6 1.7-7 4 1.4 2.3 3.6 4 7 4 0-3.1-1.3-5.8-3.5-8"/></svg></span><strong>Reiki</strong><span>Iniciar ou continuar aplicação</span>';
  actions.appendChild(button);
}
function explainDisabledHomeActions(session, assisted) {
  document.querySelectorAll('[data-home-actions] button[disabled]').forEach((button) => {
    const reason = !session ? 'Abra uma sessão para continuar.' : !assisted ? 'Escolha um Assistido para habilitar esta ação.' : 'Conclua a etapa anterior para habilitar esta ação.';
    button.title = reason;
    button.setAttribute('aria-label', `${button.textContent?.trim() || 'Ação'}. ${reason}`);
  });
}
function enhanceHome() {
  const state = store.getState();
  const session = getOpenSession(state);
  const assisted = currentAssisted(state, session);
  if (session) {
    ensureHawkinsHomeRecommendation(state, session, assisted);
    ensureReikiHomeAction(state, session, assisted);
  }
  explainDisabledHomeActions(session, assisted);
  ensurePostCloseSummary(state, session);
  ensureFirstUseGuide(state, session);
}

function currentQuestionInvestigation(state, session) {
  if (!session?.currentAssistedEntityId) return null;
  return [...(state.investigations || [])]
    .filter((item) => item.status === 'IN_PROGRESS' && item.currentSessionId === session.id && item.assistedEntityId === session.currentAssistedEntityId)
    .sort((a, b) => String(b.updatedAt || b.startedAt || '').localeCompare(String(a.updatedAt || a.startedAt || '')))[0] || null;
}
function enhanceQuestionSheet() {
  const sheet = document.querySelector('.mx3-question-sheet,.sheet.focus-sheet');
  if (!sheet || !sheet.querySelector('.question-panel')) return;
  const state = store.getState();
  const session = getOpenSession(state);
  const investigation = currentQuestionInvestigation(state, session);
  if (!investigation) return;
  const total = investigation.protocolSnapshot?.questions?.length || 0;
  const index = Math.min(total - 1, Math.max(0, Number(investigation.currentIndex || 0)));
  const header = sheet.querySelector('.sheet-head');
  if (!header || !total) return;
  let progress = header.querySelector('[data-fluxa-question-progress]');
  if (!progress) {
    progress = document.createElement('div');
    progress.className = 'fluxa-question-progress';
    progress.dataset.fluxaQuestionProgress = 'true';
    header.querySelector('div')?.appendChild(progress);
  }
  progress.style.setProperty('--fluxa-progress', `${Math.round(((index + 1) / total) * 100)}%`);
  progress.innerHTML = `<span>Pergunta ${index + 1} de ${total}</span><b aria-hidden="true"></b>`;
  let back = header.querySelector('[data-fluxa-question-back]');
  if (index > 0 && !back) {
    back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn ghost small fluxa-question-back';
    back.dataset.fluxaQuestionBack = investigation.id;
    back.textContent = 'Voltar';
    header.querySelector('.close-btn')?.before(back) || header.appendChild(back);
  } else if (index === 0) back?.remove();
}

function enhanceTreatmentComposer() {
  const form = document.querySelector('#treatment-form');
  if (!form) return;
  for (const item of form.querySelectorAll('[data-treatment-item]')) {
    const commandCount = item.querySelectorAll('[data-treatment-command]').length;
    const graphCount = item.querySelectorAll('[data-treatment-graph]').length;
    let summary = item.querySelector('[data-fluxa-item-summary]');
    if (!summary) {
      summary = document.createElement('span');
      summary.className = 'fluxa-item-summary';
      summary.dataset.fluxaItemSummary = 'true';
      const field = item.querySelector('.field');
      (field || item.firstElementChild)?.after(summary);
    }
    summary.textContent = `${commandCount} ${commandCount === 1 ? 'comando' : 'comandos'} · ${graphCount} ${graphCount === 1 ? 'gráfico' : 'gráficos'}`;
  }
}

function sessionCounts(state, sessionId) {
  const events = (state.events || []).filter((event) => event.sessionId === sessionId);
  const investigations = new Set(events.filter((event) => /^INVESTIGATION_/.test(event.eventType || '')).map((event) => event.entityId).filter(Boolean));
  const treatmentIds = new Set(events.filter((event) => /^TREATMENT_/.test(event.eventType || '')).map((event) => event.metadata?.treatmentId || event.entityId).filter(Boolean));
  const notes = events.filter((event) => event.eventType === 'NOTE_CREATED').length;
  return { investigations:investigations.size, treatments:treatmentIds.size, notes };
}
function ensurePostCloseSummary(state, openSession) {
  const existing = document.querySelector('[data-fluxa-post-close-summary]');
  if (openSession) { existing?.remove(); return; }
  const main = document.querySelector('#app > main:not([data-workspace-view])');
  if (!main || main.querySelector(':scope > .eyebrow')?.textContent?.trim() !== 'Hoje') { existing?.remove(); return; }
  const closed = [...(state.sessions || [])].filter((item) => item.status === 'CLOSED').sort((a,b)=>String(b.endedAt||'').localeCompare(String(a.endedAt||'')))[0];
  if (!closed) return;
  const ended = timeValue(closed.endedAt);
  if (ended == null || Date.now() - ended > 10 * 60 * 1000) { existing?.remove(); return; }
  if (sessionStorage.getItem(`fluxa.postCloseDismissed:${closed.id}`) === '1') { existing?.remove(); return; }
  if (existing?.dataset.sessionId === closed.id) return;
  existing?.remove();
  const counts = sessionCounts(state, closed.id);
  const section = document.createElement('section');
  section.className = 'section fluxa-post-close-summary';
  section.dataset.fluxaPostCloseSummary = 'true';
  section.dataset.sessionId = closed.id;
  section.innerHTML = `<div><p class="eyebrow">Sessão encerrada</p><h2>Resumo salvo com segurança</h2><p class="muted">O trabalho longitudinal continua disponível em Tratamentos e o registro completo está no Histórico.</p></div><div class="fluxa-post-close-grid"><div><strong>${counts.investigations}</strong><span>investigações</span></div><div><strong>${counts.treatments}</strong><span>tratamentos</span></div><div><strong>${counts.notes}</strong><span>anotações</span></div></div><div class="fluxa-post-close-actions"><button type="button" class="btn primary" data-fluxa-open-last-history>Ver histórico</button><button type="button" class="btn secondary" data-session-report="${esc(closed.id)}">Resumo da sessão</button><button type="button" class="btn ghost" data-fluxa-dismiss-post-close>Fechar</button></div>`;
  const lead = main.querySelector(':scope > .lead');
  (lead || main.firstElementChild)?.after(section);
}
function ensureFirstUseGuide(state, openSession) {
  const main = document.querySelector('#app > main:not([data-workspace-view])');
  const existing = main?.querySelector('[data-fluxa-first-use]');
  const firstUse = !openSession && !(state.sessions || []).length && !(state.assistedEntities || []).length;
  if (!main || main.querySelector(':scope > .eyebrow')?.textContent?.trim() !== 'Hoje' || !firstUse) { existing?.remove(); return; }
  if (existing) return;
  const section = document.createElement('section');
  section.className = 'section card soft';
  section.dataset.fluxaFirstUse = 'true';
  section.innerHTML = '<p class="eyebrow">Como o Fluxa funciona</p><h2>Um atendimento, um fluxo.</h2><p class="muted">Sessão → Preparação → Assistido → Hawkins → Trabalho → Encerramento. Tratamentos podem continuar entre sessões.</p>';
  main.appendChild(section);
}

function enhanceLocalFirstSettings() {
  const sheet = document.querySelector('.workspace-settings-sheet');
  if (!sheet) return;
  const groups = [...sheet.querySelectorAll('.workspace-settings-group')];
  const dataGroup = groups.find((group) => /Dados e privacidade/i.test(group.textContent || ''));
  if (!dataGroup || dataGroup.querySelector('[data-fluxa-local-first-detail]')) return;
  const health = inspectStorageHealth();
  const last = health.lastExportAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' }).format(new Date(health.lastExportAt)) : 'nenhum backup exportado';
  const detail = document.createElement('div');
  detail.dataset.fluxaLocalFirstDetail = 'true';
  detail.innerHTML = `<p class="muted"><strong>Onde seus dados ficam:</strong> neste navegador/dispositivo. Limpar os dados do site ou perder o aparelho pode remover o histórico local.</p><p class="muted"><strong>Último backup:</strong> ${esc(last)}.</p><button type="button" class="btn secondary wide" data-trigger-backup-export>Exportar backup agora</button>`;
  dataGroup.appendChild(detail);
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('fluxa-booting');
    document.documentElement.classList.add('fluxa-ready');
  }));
}
function enhance() {
  installAlertBridge();
  updateVisualViewport();
  manageModals();
  enhanceHome();
  enhanceQuestionSheet();
  enhanceTreatmentComposer();
  enhanceLocalFirstSettings();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

window.visualViewport?.addEventListener('resize', updateVisualViewport, { passive:true });
window.visualViewport?.addEventListener('scroll', updateVisualViewport, { passive:true });
window.addEventListener('resize', updateVisualViewport, { passive:true });
document.addEventListener('keydown', handleModalKeys, true);
new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
store.subscribe(schedule);
window.addEventListener('fluxa:state-changed', schedule);
queueMicrotask(schedule);
markReady();

window.setTimeout(() => {
  document.documentElement.classList.remove('fluxa-booting');
  document.documentElement.classList.add('fluxa-ready');
}, 2500);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'fluxa-home-hawkins-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    const data = new FormData(form);
    recordHawkinsBaseline(store, { sessionId:form.dataset.session, assistedEntityId:form.dataset.assisted, hertz:data.get('hertz') });
    form.closest('.modal-backdrop')?.remove();
    showFluxaToast('Hawkins inicial registrado. Você pode continuar o atendimento.', 'success');
    schedule();
  } catch (error) {
    showFluxaToast(error.message, 'error');
    form.querySelector('[name="hertz"]')?.focus();
  }
}, true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.fluxaHomeHawkins !== undefined) {
    const state = store.getState();
    const session = getOpenSession(state);
    const assisted = currentAssisted(state, session);
    if (!session || !assisted || !prepared(state, session)) {
      showFluxaToast('Conclua a preparação e escolha um Assistido antes de registrar Hawkins.', 'error');
      return;
    }
    hawkinsHomeModal(state, session, assisted);
    return;
  }
  if (button.dataset.closeFluxaHomeHawkins !== undefined) {
    document.querySelector('#fluxa-home-hawkins-overlay')?.remove();
    return;
  }
  if (button.dataset.fluxaQuestionBack) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = button.dataset.fluxaQuestionBack;
    store.setState((state) => {
      const draft = structuredClone(state);
      const investigation = (draft.investigations || []).find((item) => item.id === id && item.status === 'IN_PROGRESS');
      if (!investigation) return draft;
      investigation.currentIndex = Math.max(0, Number(investigation.currentIndex || 0) - 1);
      investigation.updatedAt = store.nowIso();
      return draft;
    });
    return;
  }
  if (button.dataset.fluxaOpenLastHistory !== undefined) {
    document.querySelector('[data-workspace-route="history"]')?.click();
    return;
  }
  if (button.dataset.fluxaDismissPostClose !== undefined) {
    const section = button.closest('[data-fluxa-post-close-summary]');
    const id = section?.dataset.sessionId;
    if (id) sessionStorage.setItem(`fluxa.postCloseDismissed:${id}`, '1');
    section?.remove();
  }
}, true);
