import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store = createStore();
let enhancing = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}
function fmtTime(value) {
  const time = timeValue(value);
  if (time == null) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour:'2-digit', minute:'2-digit' }).format(new Date(time));
}
function durationLabel(startedAt) {
  const start = timeValue(startedAt);
  if (start == null) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest} min`;
}
function sessionEvents(state, sessionId) {
  return (state.events || []).filter((event) => event.sessionId === sessionId);
}
function uniqueEntityCount(events, matcher) {
  return new Set(events.filter((event) => matcher(event.eventType)).map((event) => event.entityId).filter(Boolean)).size;
}
function sessionCounts(state, session) {
  const events = sessionEvents(state, session.id);
  return {
    events,
    investigations:uniqueEntityCount(events, (type) => /^INVESTIGATION_/.test(type || '')),
    treatments:uniqueEntityCount(events, (type) => /^TREATMENT_/.test(type || '')),
    notes:events.filter((event) => event.eventType === 'NOTE_CREATED').length
  };
}
function latestHawkins(state, session) {
  const currentAssisted = session.currentAssistedEntityId;
  const items = (state.assessments || []).filter((item) => item.sessionId === session.id && (!currentAssisted || item.assistedEntityId === currentAssisted) && (item.kind === 'HAWKINS_FREQUENCY' || /hawkins/i.test(String(item.subject || ''))));
  items.sort((a, b) => (timeValue(b.occurredAt || b.createdAt) || 0) - (timeValue(a.occurredAt || a.createdAt) || 0));
  const value = items[0]?.hertz ?? items[0]?.frequency ?? items[0]?.result;
  return value == null || value === '' ? null : String(value);
}
function assistedWorked(state, sessionId) {
  const ids = new Set(sessionEvents(state, sessionId).map((event) => event.assistedEntityId).filter(Boolean));
  return [...ids].map((id) => (state.assistedEntities || []).find((item) => item.id === id)).filter(Boolean);
}
function openInvestigations(state, sessionId) {
  return (state.investigations || []).filter((item) => item.status === 'IN_PROGRESS' && item.currentSessionId === sessionId);
}
function sessionTreatmentIds(events) {
  return new Set(events.filter((event) => /^TREATMENT_/.test(event.eventType || '')).map((event) => event.entityId).filter(Boolean));
}
function activeLongitudinalTreatments(state, sessionId) {
  const events = sessionEvents(state, sessionId);
  const treatmentIds = sessionTreatmentIds(events);
  const assistedIds = new Set(events.map((event) => event.assistedEntityId).filter(Boolean));
  return (state.treatments || []).filter((item) => item.status === 'IN_PROGRESS' && (treatmentIds.has(item.id) || assistedIds.has(item.assistedEntityId)));
}
function liveStatsHtml(state, session) {
  const counts = sessionCounts(state, session);
  const hawkins = latestHawkins(state, session);
  return `<div class="session-live-stat"><strong>${counts.investigations}</strong><span>${counts.investigations === 1 ? 'investigação' : 'investigações'} nesta sessão</span></div><div class="session-live-stat"><strong>${counts.treatments}</strong><span>${counts.treatments === 1 ? 'tratamento' : 'tratamentos'} trabalhados</span></div><div class="session-live-stat"><strong>${counts.notes}</strong><span>${counts.notes === 1 ? 'anotação' : 'anotações'}</span></div><div class="session-live-stat"><strong>${hawkins ? `${esc(hawkins)} Hz` : '—'}</strong><span>Hawkins atual</span></div>`;
}
function enhanceCockpit(state, session) {
  const cockpit = document.querySelector('[data-home-cockpit]');
  if (!cockpit) return;
  const html = liveStatsHtml(state, session);
  let stats = cockpit.querySelector('[data-session-live-stats]');
  if (!stats) {
    stats = document.createElement('div');
    stats.className = 'session-live-stats';
    stats.dataset.sessionLiveStats = 'true';
    const context = cockpit.querySelector('.home-cockpit-context');
    context?.after(stats);
  }
  if (stats.dataset.signature !== html) {
    stats.dataset.signature = html;
    stats.innerHTML = html;
  }
}
function ensureAssistedPrompt(state, session) {
  const main = document.querySelector('#app > main:not([data-workspace-view])');
  if (!main) return;
  const isSessionHome = main.querySelector(':scope > .eyebrow')?.textContent?.trim() === 'Sessão em andamento';
  let prompt = main.querySelector('[data-session-assisted-prompt]');
  if (!isSessionHome) {
    prompt?.remove();
    return;
  }
  const prep = latestPreparation(state, session.id);
  const ready = prep?.status === 'COMPLETED';
  if (!ready || session.currentAssistedEntityId) {
    prompt?.remove();
    return;
  }
  if (!prompt) {
    prompt = document.createElement('section');
    prompt.className = 'section card session-assisted-prompt';
    prompt.dataset.sessionAssistedPrompt = 'true';
    prompt.innerHTML = `<p class="eyebrow">Próximo passo</p><h2>Quem será atendido agora?</h2><p class="muted">Selecione um Assistido já cadastrado ou cadastre um novo sem sair da sessão.</p><button type="button" class="btn primary wide" data-action="choose-assisted">Selecionar ou cadastrar Assistido</button>`;
    const cockpit = main.querySelector('[data-home-cockpit]');
    const timeline = [...main.querySelectorAll('.section')].find((section) => section.querySelector('h2')?.textContent?.trim() === 'Timeline da sessão');
    if (cockpit) cockpit.before(prompt);
    else if (timeline) timeline.before(prompt);
    else main.prepend(prompt);
  }
}
function closeReviewHtml(state, session) {
  const counts = sessionCounts(state, session);
  const assisteds = assistedWorked(state, session.id);
  const unfinished = openInvestigations(state, session.id);
  const activeTreatments = activeLongitudinalTreatments(state, session.id);
  const names = assisteds.map((item) => item.displayName).filter(Boolean);
  return `<div class="session-close-review"><div class="session-close-summary"><div class="session-close-item"><strong>${esc(fmtTime(session.startedAt))}</strong><span>Início · ${esc(durationLabel(session.startedAt))}</span></div><div class="session-close-item"><strong>${assisteds.length}</strong><span>${assisteds.length === 1 ? 'assistido trabalhado' : 'assistidos trabalhados'}</span></div><div class="session-close-item"><strong>${counts.investigations}</strong><span>${counts.investigations === 1 ? 'investigação' : 'investigações'}</span></div><div class="session-close-item"><strong>${counts.treatments}</strong><span>${counts.treatments === 1 ? 'tratamento trabalhado' : 'tratamentos trabalhados'}</span></div></div>${names.length ? `<p class="muted">Assistidos nesta sessão: ${esc(names.join(' · '))}</p>` : ''}<div class="session-close-status"><b>${unfinished.length ? '↻' : '✓'}</b><div><strong>${unfinished.length ? `${unfinished.length} ${unfinished.length === 1 ? 'investigação ficará aberta' : 'investigações ficarão abertas'}` : 'Nenhuma investigação aberta'}</strong><p class="muted">${unfinished.length ? 'O progresso fica preservado para retomada em outra sessão.' : 'As investigações desta sessão estão consolidadas.'}</p></div></div><div class="session-close-status"><b>✓</b><div><strong>${activeTreatments.length ? `${activeTreatments.length} ${activeTreatments.length === 1 ? 'tratamento longitudinal continua' : 'tratamentos longitudinais continuam'}` : 'Nenhum tratamento longitudinal ativo para estes assistidos'}</strong><p class="muted">Tratamentos ativos não bloqueiam o encerramento da sessão e continuam com seus próprios prazos.</p></div></div><button type="button" class="btn secondary wide" data-session-report="${esc(session.id)}">Visualizar resumo da sessão</button></div>`;
}
function enhanceCloseSheet(state, session) {
  const form = document.querySelector('#close-session-form');
  const sheet = form?.closest('.sheet');
  if (!form || !sheet || !session) return;
  const heading = sheet.querySelector('.sheet-head h2');
  if (heading) heading.textContent = 'Revisar e encerrar sessão';
  let review = sheet.querySelector('[data-session-close-review]');
  if (!review) {
    review = document.createElement('div');
    review.dataset.sessionCloseReview = 'true';
    form.before(review);
  }
  [...sheet.children].forEach((child) => {
    if (!child.matches('.sheet-head,[data-session-close-review],#close-session-form')) child.hidden = true;
  });
  const html = closeReviewHtml(state, session);
  if (review.dataset.signature !== html) {
    review.dataset.signature = html;
    review.innerHTML = html;
  }
  const confirm = form.querySelector('.check-row span');
  if (confirm) confirm.textContent = 'Confirmo que realizei meu procedimento de encerramento e quero fechar esta sessão';
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.textContent = 'Encerrar sessão com segurança';
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const state = store.getState();
    const session = getOpenSession(state);
    if (!session) return;
    ensureAssistedPrompt(state, session);
    enhanceCockpit(state, session);
    enhanceCloseSheet(state, session);
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => queueMicrotask(enhance));