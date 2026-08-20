import { createStore } from './store.js';

const store = createStore();
let enhancing = false;

const typeLabels = { PERSON:'Pessoa', PET:'PET', ENVIRONMENT:'Ambiente', GROUP:'Grupo', SITUATION:'Situação / Processo', OTHER:'Outro' };

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function fmt(iso) {
  return iso ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso)) : '—';
}

function closeDialog() { document.querySelector('#archive-view-overlay')?.remove(); }
function dialog(html) {
  closeDialog();
  const wrap = document.createElement('div');
  wrap.id = 'archive-view-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

function ensureArchivedAction() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('[data-view-archived-assisted]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Assistidos') return;
  const archived = store.getState().assistedEntities.filter((item) => item.archivedAt);
  if (!archived.length) return;
  const button = document.createElement('button');
  button.className = 'btn ghost wide';
  button.dataset.viewArchivedAssisted = 'true';
  button.textContent = `Ver arquivados (${archived.length})`;
  main.appendChild(button);
}

function archivedListDialog() {
  const archived = store.getState().assistedEntities.filter((item) => item.archivedAt).sort((a,b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Assistidos</p><h2>Arquivados</h2></div><button class="close-btn" data-archive-view-close>×</button></div><p class="muted">O arquivamento remove do trabalho futuro, mas mantém todo o histórico disponível para consulta.</p><div class="stack">${archived.map((item) => `<article class="card"><div class="section-head"><div><p class="eyebrow">${esc(typeLabels[item.type] || item.type)}</p><h3>${esc(item.displayName)}</h3></div><span class="muted">${fmt(item.archivedAt)}</span></div><button class="btn secondary wide" data-open-archived-assisted="${item.id}">Ver histórico</button></article>`).join('') || '<div class="empty">Nenhum assistido arquivado.</div>'}</div></section>`);
}

function archivedDetailDialog(id) {
  const state = store.getState();
  const assisted = state.assistedEntities.find((item) => item.id === id && item.archivedAt);
  if (!assisted) return;
  const treatments = state.treatments.filter((item) => item.assistedEntityId === id);
  const investigations = state.investigations.filter((item) => item.assistedEntityId === id);
  const reiki = state.reikiApplications.filter((item) => item.assistedEntityId === id && item.status === 'COMPLETED');
  const assessments = state.assessments.filter((item) => item.assistedEntityId === id);
  const events = state.events.filter((item) => item.assistedEntityId === id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Arquivado · ${esc(typeLabels[assisted.type] || assisted.type)}</p><h2>${esc(assisted.displayName)}</h2></div><button class="close-btn" data-archive-view-close>×</button></div><p class="muted">Arquivado em ${fmt(assisted.archivedAt)}. Esta visão é somente leitura.</p><div class="metric-grid"><div class="metric"><strong>${treatments.length}</strong><span>tratamentos</span></div><div class="metric"><strong>${investigations.length}</strong><span>investigações</span></div><div class="metric"><strong>${reiki.length}</strong><span>Reiki</span></div><div class="metric"><strong>${assessments.length}</strong><span>avaliações</span></div></div><section class="section"><h3>Atividade registrada</h3><div class="timeline">${events.slice(0,30).map((event) => `<div class="timeline-item"><div class="timeline-time">${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(event.occurredAt))}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${esc(event.eventType.replaceAll('_',' ').toLocaleLowerCase('pt-BR'))}</strong><span>${esc(event.metadata?.title || event.metadata?.protocolName || event.metadata?.body || '')}</span></div></div>`).join('') || '<div class="empty">Nenhuma atividade.</div>'}</div></section><button class="btn secondary wide" data-view-archived-assisted>Voltar para arquivados</button></section>`);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { ensureArchivedAction(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);

document.addEventListener('click',(event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.archiveViewClose !== undefined) { closeDialog(); return; }
  if (button.dataset.viewArchivedAssisted !== undefined) { archivedListDialog(); return; }
  if (button.dataset.openArchivedAssisted) { archivedDetailDialog(button.dataset.openArchivedAssisted); }
},true);
