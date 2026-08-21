import { createStore } from './store.js';
import { ReikiModeLabel } from './reiki-flex.js';

const store = createStore();
let enhancing = false;

const eventLabels = Object.freeze({
  SESSION_STARTED: 'Sessão iniciada', PREPARATION_STARTED: 'Preparação iniciada', PREPARATION_COMPLETED: 'Preparação concluída',
  SESSION_ASSISTED_SELECTED: 'Assistido selecionado', INVESTIGATION_STARTED: 'Investigação iniciada', INVESTIGATION_RESUMED: 'Investigação retomada',
  INVESTIGATION_COMPLETED: 'Investigação concluída', FINDING_IDENTIFIED: 'Achado registrado', TREATMENT_CREATED: 'Tratamento criado',
  TREATMENT_STARTED: 'Tratamento iniciado', TREATMENT_INTERRUPTED: 'Tratamento interrompido', TREATMENT_RESUMED: 'Tratamento retomado',
  TREATMENT_REVIEWED: 'Tratamento revisado', TREATMENT_COMPLETED: 'Tratamento concluído', COMPONENT_PLANNED: 'Componente planejado',
  COMPONENT_STARTED: 'Componente iniciado', COMPONENT_ADDED: 'Componente adicionado', COMPONENT_STOPPED: 'Componente interrompido',
  COMPONENT_REPLACED: 'Componente substituído', COMPONENT_RESCHEDULED: 'Prazo ajustado', COMPONENT_REVIEWED: 'Componente revisado',
  COMPONENT_DISMANTLED: 'Componente desmontado', TREATMENT_FINAL_ASSESSMENT: 'Avaliação final', ASSESSMENT_RECORDED: 'Avaliação registrada',
  REIKI_STARTED: 'Reiki iniciado', REIKI_PAUSED: 'Reiki pausado', REIKI_RESUMED: 'Reiki retomado', REIKI_COMPLETED: 'Reiki concluído',
  NOTE_CREATED: 'Anotação', CLOSING_COMPLETED: 'Encerramento realizado', SESSION_CLOSE_CORRECTED: 'Encerramento corrigido', SESSION_CLOSED: 'Sessão encerrada'
});
const REIKI_EVENTS = new Set(['REIKI_STARTED','REIKI_PAUSED','REIKI_RESUMED','REIKI_COMPLETED']);

function esc(value = '') { return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c])); }
function fmt(iso) { if (!iso) return '—'; return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }
function fmtDateOrText(value) { if (!value) return ''; const date=new Date(value); return Number.isNaN(date.getTime()) ? String(value) : fmt(value); }
function duration(session) {
  const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now(); const start = new Date(session.startedAt).getTime();
  const mins = Math.max(0, Math.floor((end - start) / 60000)); const h = Math.floor(mins / 60); const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m} min`;
}
function closeDialog() { document.querySelector('#history-overlay')?.remove(); }
function dialog(html) { closeDialog(); const wrap = document.createElement('div'); wrap.id = 'history-overlay'; wrap.className = 'modal-backdrop'; wrap.innerHTML = html; document.body.appendChild(wrap); }

function eventRows(events, state) {
  if (!events.length) return '<div class="empty">Nenhum evento registrado.</div>';
  return `<div class="timeline">${events.map((event) => {
    const assisted = state.assistedEntities.find((item) => item.id === event.assistedEntityId);
    const baseDetail = event.metadata?.title || event.metadata?.protocolName || event.metadata?.componentName || event.metadata?.name || event.metadata?.body || assisted?.displayName || '';
    const mode = REIKI_EVENTS.has(event.eventType) ? ReikiModeLabel[event.metadata?.mode] : null;
    const durationMinutes = event.eventType === 'REIKI_COMPLETED' && event.metadata?.durationSeconds != null ? Math.round(Number(event.metadata.durationSeconds) / 60) : null;
    const detail = [baseDetail, mode, durationMinutes != null ? `${durationMinutes} min` : null].filter(Boolean).join(' · ');
    return `<div class="timeline-item"><div class="timeline-time">${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(event.occurredAt))}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${esc(eventLabels[event.eventType] || event.eventType)}</strong><span>${esc(detail)}</span></div></div>`;
  }).join('')}</div>`;
}

function ensureSessionHistoryAction() {
  const main = document.querySelector('main'); if (!main || main.querySelector('[data-session-history]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Hoje') return;
  const recentHeading = [...main.querySelectorAll('h2')].find((node) => node.textContent?.trim() === 'Atividade recente'); const section = recentHeading?.closest('.section'); if (!section) return;
  const button = document.createElement('button'); button.className = 'btn ghost small'; button.dataset.sessionHistory = 'true'; button.textContent = 'Ver sessões';
  const head = section.querySelector('.section-head'); if (head) head.appendChild(button); else section.prepend(button);
}

function ensureTreatmentHistoryActions() {
  const state = store.getState(); const treatments = [...state.treatments].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  document.querySelectorAll('.treatment-card').forEach((card, index) => {
    if (card.querySelector('[data-treatment-history]')) return;
    const treatment = state.treatments.find((item) => item.id === card.dataset.treatmentId) || treatments[index]; if (!treatment) return;
    const row = card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'), { className:'button-row' }));
    const button = document.createElement('button'); button.className = 'btn ghost small'; button.dataset.treatmentHistory = treatment.id; button.textContent = 'Histórico'; row.appendChild(button);
  });
}

function sessionListDialog() {
  const state = store.getState(); const sessions = [...state.sessions].sort((a,b) => b.startedAt.localeCompare(a.startedAt));
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Histórico</p><h2>Sessões</h2></div><button class="close-btn" data-history-close>×</button></div><div class="stack">${sessions.length ? sessions.map((session) => {
    const count = state.events.filter((event) => event.sessionId === session.id).length;
    return `<article class="card"><div class="section-head"><div><p class="eyebrow">${session.status === 'OPEN' ? 'Em andamento' : 'Encerrada'}</p><h3>${fmt(session.startedAt)}</h3></div><span class="muted">${duration(session)}</span></div><p class="muted">${count} ${count === 1 ? 'evento' : 'eventos'} registrados</p><button class="btn secondary wide" data-open-session-history="${session.id}">Abrir sessão</button></article>`;
  }).join('') : '<div class="empty">Nenhuma sessão registrada.</div>'}</div></section>`);
}

function sessionDetailDialog(sessionId) {
  const state = store.getState(); const session = state.sessions.find((item) => item.id === sessionId); if (!session) return;
  const events = state.events.filter((event) => event.sessionId === sessionId).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt));
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Sessão</p><h2>${fmt(session.startedAt)}</h2></div><button class="close-btn" data-history-close>×</button></div><div class="card soft"><p><strong>Início:</strong> ${fmt(session.startedAt)}</p><p><strong>Término:</strong> ${session.endedAt ? fmt(session.endedAt) : 'Ainda aberta'}</p>${session.closedRecordedAt && session.endedAt !== session.closedRecordedAt ? `<p class="muted">Encerramento registrado em ${fmt(session.closedRecordedAt)}</p>` : ''}</div><section class="section"><h3>Timeline</h3>${eventRows(events, state)}</section><button class="btn secondary wide" data-session-history>Voltar para sessões</button></section>`);
}

function treatmentContinuityHtml(state, treatment) {
  const previous = treatment.previousTreatmentId ? state.treatments.find((item)=>item.id===treatment.previousTreatmentId) : null;
  const next = state.treatments.filter((item)=>item.previousTreatmentId===treatment.id).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  const recommendation = treatment.recommendedByAssessmentId ? state.assessments.find((item)=>item.id===treatment.recommendedByAssessmentId) : null;
  if (!previous && !next.length && !recommendation && !treatment.planningNotes && !treatment.plannedFor) return '';
  return `<section class="section"><div class="section-head"><div><p class="eyebrow">Continuidade</p><h3>Ciclos do tratamento</h3></div></div><div class="stack">${previous ? `<article class="card soft"><p class="eyebrow">Ciclo anterior</p><strong>${esc(previous.title)}</strong><p class="muted">${esc(previous.status)}</p><button class="btn ghost small" data-treatment-history="${previous.id}">Abrir ciclo anterior</button></article>` : ''}${recommendation ? `<article class="card soft"><p class="eyebrow">Recomendado pela avaliação</p><strong>${esc(recommendation.subject || 'Avaliação final')}</strong><p class="muted">${recommendation.frequency ? `Frequência ${esc(recommendation.frequency)}` : ''}${recommendation.imbalancePercent != null ? `${recommendation.frequency ? ' · ' : ''}Desequilíbrio ${esc(recommendation.imbalancePercent)}%` : ''}</p></article>` : ''}${treatment.plannedFor || treatment.planningNotes ? `<article class="card soft"><p class="eyebrow">Planejamento deste ciclo</p>${treatment.plannedFor ? `<p><strong>Previsto:</strong> ${esc(fmtDateOrText(treatment.plannedFor))}</p>` : ''}${treatment.planningNotes ? `<p class="muted">${esc(treatment.planningNotes)}</p>` : ''}</article>` : ''}${next.map((item,index)=>`<article class="card soft"><p class="eyebrow">${next.length===1?'Próximo ciclo':`Ciclo seguinte ${index+1}`}</p><strong>${esc(item.title)}</strong><p class="muted">${esc(item.status)}${item.plannedFor ? ` · ${esc(fmtDateOrText(item.plannedFor))}` : ''}</p><button class="btn ghost small" data-treatment-history="${item.id}">Abrir este ciclo</button></article>`).join('')}</div></section>`;
}

function treatmentDetailDialog(treatmentId) {
  const state = store.getState(); const treatment = state.treatments.find((item) => item.id === treatmentId); if (!treatment) return;
  const assisted = state.assistedEntities.find((item) => item.id === treatment.assistedEntityId);
  const components = state.treatmentComponents.filter((item) => item.treatmentId === treatmentId); const componentIds = new Set(components.map((item) => item.id));
  const events = state.events.filter((event) => event.entityId === treatmentId || componentIds.has(event.entityId) || event.metadata?.treatmentId === treatmentId).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt));
  const assessments = state.assessments.filter((item) => item.treatmentId === treatmentId);
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Histórico do tratamento</p><h2>${esc(treatment.title)}</h2></div><button class="close-btn" data-history-close>×</button></div><p class="muted">${esc(assisted?.displayName || '')} · ${treatment.status}</p>${treatmentContinuityHtml(state,treatment)}<section class="section"><div class="section-head"><h3>Componentes</h3><span class="muted">${components.length}</span></div><div class="stack">${components.map((component) => `<article class="card soft"><strong>${esc(component.name)}</strong><p class="muted">${esc(component.status)}${component.startedAt ? ` · iniciado ${fmt(component.startedAt)}` : ''}${component.expectedEndAt ? ` · revisão ${fmt(component.expectedEndAt)}` : ' · sem prazo definido'}</p>${component.toolSnapshot ? `<span class="muted">Biblioteca: ${esc(component.toolSnapshot.name)}</span>` : ''}</article>`).join('') || '<div class="empty">Nenhum componente registrado.</div>'}</div></section>${assessments.length ? `<section class="section"><h3>Avaliações vinculadas</h3><div class="stack">${assessments.map((item) => `<div class="card soft"><strong>${esc(item.subject || 'Avaliação final')}</strong><p class="muted">${esc(item.result || item.frequency || '')}${item.imbalancePercent != null ? ` · desequilíbrio ${item.imbalancePercent}%` : ''}</p></div>`).join('')}</div></section>` : ''}<section class="section"><h3>Linha do tempo</h3>${eventRows(events, state)}</section></section>`);
}

function enhance() { if (enhancing) return; enhancing = true; try { ensureSessionHistoryAction(); ensureTreatmentHistoryActions(); } finally { enhancing = false; } }
new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.historyClose !== undefined) { closeDialog(); return; }
  if (button.dataset.sessionHistory !== undefined) { sessionListDialog(); return; }
  if (button.dataset.openSessionHistory) { sessionDetailDialog(button.dataset.openSessionHistory); return; }
  if (button.dataset.treatmentHistory) { treatmentDetailDialog(button.dataset.treatmentHistory); }
}, true);
