import { createStore } from './store.js';

const store = createStore();
let activeAssistedId = null;
let activeTab = 'summary';
let enhancing = false;

const eventLabels = {
  SESSION_STARTED:'Sessão iniciada', SESSION_CLOSED:'Sessão encerrada', PREPARATION_COMPLETED:'Preparação concluída',
  INVESTIGATION_STARTED:'Investigação iniciada', INVESTIGATION_RESUMED:'Investigação retomada', INVESTIGATION_COMPLETED:'Investigação concluída',
  FINDING_IDENTIFIED:'Achado registrado', TREATMENT_CREATED:'Tratamento criado', TREATMENT_STARTED:'Tratamento iniciado',
  TREATMENT_INTERRUPTED:'Tratamento interrompido', TREATMENT_RESUMED:'Tratamento retomado', TREATMENT_REVIEWED:'Tratamento revisado',
  TREATMENT_COMPLETED:'Tratamento concluído', REIKI_STARTED:'Terapia complementar iniciada', REIKI_COMPLETED:'Terapia complementar concluída',
  NOTE_CREATED:'Anotação', ASSESSMENT_RECORDED:'Avaliação registrada'
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}
function fmtDate(value) {
  const time = timeValue(value);
  if (time == null) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(time));
}
function fmtDateTime(value) {
  const time = timeValue(value);
  if (time == null) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(time));
}
function assisted(state) {
  return (state.assistedEntities || []).find((item) => item.id === activeAssistedId) || null;
}
function allEvents(state) {
  return (state.events || []).filter((event) => event.assistedEntityId === activeAssistedId).sort((a, b) => (timeValue(b.occurredAt) || 0) - (timeValue(a.occurredAt) || 0));
}
function sessionsFor(state) {
  const ids = new Set(allEvents(state).map((event) => event.sessionId).filter(Boolean));
  return (state.sessions || []).filter((session) => ids.has(session.id)).sort((a, b) => (timeValue(b.startedAt) || 0) - (timeValue(a.startedAt) || 0));
}
function treatmentsFor(state) {
  return (state.treatments || []).filter((item) => item.assistedEntityId === activeAssistedId).sort((a, b) => (timeValue(b.createdAt) || 0) - (timeValue(a.createdAt) || 0));
}
function investigationsFor(state) {
  return (state.investigations || []).filter((item) => item.assistedEntityId === activeAssistedId).sort((a, b) => (timeValue(b.updatedAt || b.startedAt) || 0) - (timeValue(a.updatedAt || a.startedAt) || 0));
}
function hawkinsFor(state) {
  return (state.assessments || []).filter((item) => item.assistedEntityId === activeAssistedId && (item.kind === 'HAWKINS_FREQUENCY' || /hawkins/i.test(String(item.subject || '')))).sort((a, b) => (timeValue(b.occurredAt || b.createdAt) || 0) - (timeValue(a.occurredAt || a.createdAt) || 0));
}
function hawkinsValue(item) {
  const value = item?.hertz ?? item?.frequency ?? item?.result;
  return value == null || value === '' ? null : String(value);
}
function statusLabel(value) {
  return ({ PLANNED:'Planejado', IN_PROGRESS:'Em andamento', COMPLETED:'Concluído', INTERRUPTED:'Interrompido', RUNNING:'Em andamento', PAUSED:'Pausado', CANCELED:'Cancelado' })[value] || 'Registrado';
}
function protocolName(item) {
  return item?.protocolSnapshot?.name || item?.protocolName || 'Investigação';
}
function eventDetail(event, state) {
  return event.metadata?.title || event.metadata?.protocolName || event.metadata?.componentName || event.metadata?.body || assisted(state)?.displayName || '';
}
function complementaryLabels(state) {
  const labels = new Set();
  if ((state.reikiApplications || []).some((item) => item.assistedEntityId === activeAssistedId)) labels.add('Reiki');
  for (const treatment of treatmentsFor(state)) {
    for (const modality of (treatment.modalitySnapshots || [])) {
      const id = String(modality.id || '').toUpperCase();
      if (id && id !== 'RADIESTHESIA') labels.add(modality.label || modality.id);
    }
  }
  return [...labels];
}
function tabs() {
  const items = [['summary','Resumo'],['history','Histórico'],['treatments','Tratamentos'],['investigations','Investigações'],['reports','Relatórios']];
  return `<nav class="assisted-detail-tabs" aria-label="Detalhes do assistido">${items.map(([id, label]) => `<button type="button" class="assisted-detail-tab ${activeTab === id ? 'active' : ''}" data-assisted-detail-tab="${id}">${label}</button>`).join('')}</nav>`;
}
function summaryHtml(state) {
  const sessions = sessionsFor(state);
  const latestSession = sessions[0];
  const hawkins = hawkinsFor(state)[0];
  const frequency = hawkinsValue(hawkins);
  const activeTreatments = treatmentsFor(state).filter((item) => ['PLANNED','IN_PROGRESS'].includes(item.status));
  const openInvestigations = investigationsFor(state).filter((item) => item.status === 'IN_PROGRESS');
  const complementary = complementaryLabels(state);
  const metrics = [];
  if (latestSession) metrics.push(`<div class="assisted-summary-metric"><strong>${esc(fmtDate(latestSession.startedAt))}</strong><span>Última sessão</span></div>`);
  if (frequency) metrics.push(`<div class="assisted-summary-metric"><strong>${esc(frequency)} Hz</strong><span>Frequência mais recente</span></div>`);
  const currentCount = activeTreatments.length + openInvestigations.length;
  if (currentCount) metrics.push(`<div class="assisted-summary-metric"><strong>${currentCount}</strong><span>${currentCount === 1 ? 'trabalho em andamento' : 'trabalhos em andamento'}</span></div>`);
  const currentRows = [
    ...openInvestigations.map((item) => `<article class="assisted-current-row"><div><strong>${esc(protocolName(item))}</strong><p class="muted">Investigação aberta</p></div></article>`),
    ...activeTreatments.map((item) => `<article class="assisted-current-row"><div><strong>${esc(item.title || 'Tratamento')}</strong><p class="muted">${esc(statusLabel(item.status))}</p></div><button type="button" class="btn ghost small" data-treatment-history="${esc(item.id)}">Histórico</button></article>`)
  ];
  const recent = allEvents(state).filter((event) => !['SESSION_ASSISTED_SELECTED','ASSISTED_CREATED'].includes(event.eventType)).slice(0, 6);
  return `${metrics.length ? `<div class="assisted-summary-card">${metrics.join('')}</div>` : ''}
    ${currentRows.length ? `<section><div class="section-head"><h3>Em andamento</h3></div><div class="assisted-current-list">${currentRows.join('')}</div></section>` : ''}
    ${complementary.length ? `<section><div class="section-head"><h3>Terapias complementares</h3></div><p class="muted">${esc(complementary.join(' · '))}</p></section>` : ''}
    <section><div class="section-head"><h3>Últimos registros</h3></div>${recent.length ? `<div class="assisted-recent-list">${recent.map((event) => `<div class="assisted-activity-row"><time>${esc(fmtDate(event.occurredAt))}</time><div><strong>${esc(eventLabels[event.eventType] || 'Atividade registrada')}</strong>${eventDetail(event, state) ? `<span>${esc(eventDetail(event, state))}</span>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Ainda não há atividade terapêutica registrada para este assistido.</div>'}</section>`;
}
function historyHtml(state) {
  const events = allEvents(state);
  return `<section><div class="section-head"><h3>Histórico longitudinal</h3><span class="muted">${events.length}</span></div>${events.length ? `<div class="assisted-recent-list">${events.map((event) => `<div class="assisted-activity-row"><time>${esc(fmtDateTime(event.occurredAt))}</time><div><strong>${esc(eventLabels[event.eventType] || 'Atividade registrada')}</strong>${eventDetail(event, state) ? `<span>${esc(eventDetail(event, state))}</span>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Nenhum registro disponível.</div>'}</section>`;
}
function treatmentsHtml(state) {
  const items = treatmentsFor(state);
  return `<section><div class="section-head"><h3>Tratamentos</h3><span class="muted">${items.length}</span></div><div class="assisted-current-list">${items.length ? items.map((item) => `<article class="assisted-current-row"><div><strong>${esc(item.title || 'Tratamento')}</strong><p class="muted">${esc(statusLabel(item.status))}${item.createdAt ? ` · ${esc(fmtDate(item.createdAt))}` : ''}</p></div><button type="button" class="btn ghost small" data-treatment-history="${esc(item.id)}">Histórico</button></article>`).join('') : '<div class="empty">Nenhum tratamento registrado.</div>'}</div></section>`;
}
function investigationsHtml(state) {
  const items = investigationsFor(state);
  return `<section><div class="section-head"><h3>Investigações</h3><span class="muted">${items.length}</span></div><div class="assisted-current-list">${items.length ? items.map((item) => `<article class="assisted-current-row"><div><strong>${esc(protocolName(item))}</strong><p class="muted">${esc(item.status === 'IN_PROGRESS' ? 'Em andamento' : 'Concluída')}${item.startedAt ? ` · ${esc(fmtDate(item.startedAt))}` : ''}</p></div></article>`).join('') : '<div class="empty">Nenhuma investigação registrada.</div>'}</div></section>`;
}
function reportsHtml(state) {
  const sessions = sessionsFor(state);
  return `<section><div class="section-head"><h3>Relatórios</h3><span class="muted">${sessions.length}</span></div><div class="assisted-current-list">${sessions.length ? sessions.map((session) => `<article class="assisted-current-row"><div><strong>Sessão de ${esc(fmtDate(session.startedAt))}</strong><p class="muted">${session.status === 'CLOSED' ? 'Encerrada' : 'Em andamento'}</p></div><button type="button" class="btn secondary small" data-session-report="${esc(session.id)}" data-assisted="${esc(activeAssistedId)}">Abrir relatório</button></article>`).join('') : '<div class="empty">Nenhuma sessão disponível para relatório.</div>'}</div></section>`;
}
function bodyHtml(state) {
  if (activeTab === 'history') return historyHtml(state);
  if (activeTab === 'treatments') return treatmentsHtml(state);
  if (activeTab === 'investigations') return investigationsHtml(state);
  if (activeTab === 'reports') return reportsHtml(state);
  return summaryHtml(state);
}
function resolveAssistedId(sheet, state) {
  if (activeAssistedId && (state.assistedEntities || []).some((item) => item.id === activeAssistedId)) return activeAssistedId;
  const name = sheet.querySelector('.sheet-head h2')?.textContent?.trim();
  if (!name) return null;
  const matches = (state.assistedEntities || []).filter((item) => item.displayName === name);
  return matches.length === 1 ? matches[0].id : null;
}
function renderSheet(sheet, state) {
  const id = resolveAssistedId(sheet, state);
  if (!id) return;
  activeAssistedId = id;
  let container = sheet.querySelector('[data-assisted-detail-refresh]');
  if (!container) {
    container = document.createElement('div');
    container.dataset.assistedDetailRefresh = 'true';
    container.className = 'assisted-detail-refresh';
    sheet.querySelector('.sheet-head')?.after(container);
  }
  [...sheet.children].forEach((child) => {
    if (!child.matches('.sheet-head,[data-assisted-detail-refresh]')) child.hidden = true;
  });
  container.innerHTML = `${tabs()}${bodyHtml(state)}`;
  sheet.dataset.assistedRefresh = id;
}
function looksLikeAssistedSheet(sheet) {
  return Boolean(sheet?.querySelector('.sheet-head h2') && (sheet.querySelector('h3')?.textContent?.includes('Histórico longitudinal') || sheet.querySelector('.metric-grid') || sheet.dataset.assistedRefresh));
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const state = store.getState();
    document.querySelectorAll('.modal-backdrop .sheet.detail-sheet').forEach((sheet) => {
      if (looksLikeAssistedSheet(sheet)) renderSheet(sheet, state);
    });
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => queueMicrotask(enhance));

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.assistedDetail) {
    activeAssistedId = button.dataset.assistedDetail;
    activeTab = 'summary';
    return;
  }
  if (button.dataset.assistedDetailTab) {
    activeTab = button.dataset.assistedDetailTab;
    const sheet = button.closest('.sheet');
    if (sheet) renderSheet(sheet, store.getState());
  }
}, true);
