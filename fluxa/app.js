import { createStore } from './store.js';
import {
  AssistedType,
  EventType,
  PREPARATION_STEPS,
  getOpenSession,
  startSession,
  closeSession,
  startPreparation,
  latestPreparation,
  togglePreparationStep,
  completePreparation,
  createAssistedEntity,
  selectAssistedForSession,
  addSessionNote
} from './domain.js';

const store = createStore();
const root = document.querySelector('#app');
let route = 'today';
let sheet = null;
let saveMessage = '';

const assistedLabels = {
  PERSON: 'Pessoa', PET: 'PET', ENVIRONMENT: 'Ambiente', GROUP: 'Grupo', SITUATION: 'Situação / Processo', OTHER: 'Outro'
};

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function formatTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(iso));
}

function durationLabel(startedAt) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}min` : `${hours}h`;
}

function eventCopy(event, state) {
  const assisted = state.assistedEntities.find((item) => item.id === event.assistedEntityId);
  const name = assisted?.displayName;
  switch (event.eventType) {
    case EventType.SESSION_STARTED: return ['Sessão iniciada', 'Janela de trabalho aberta'];
    case EventType.PREPARATION_STARTED: return ['Preparação iniciada', 'Ritual da sessão'];
    case EventType.PREPARATION_COMPLETED: return ['Preparação concluída', 'Pronta para iniciar os trabalhos'];
    case EventType.ASSISTED_CREATED: return ['Assistido criado', name || 'Novo assistido'];
    case EventType.SESSION_ASSISTED_SELECTED: return ['Contexto selecionado', name || 'Assistido'];
    case EventType.NOTE_CREATED: return ['Anotação', event.metadata?.body || 'Registro da sessão'];
    case EventType.SESSION_CLOSED: return ['Sessão encerrada', `Encerrada às ${formatTime(event.occurredAt)}`];
    default: return [event.eventType, name || ''];
  }
}

function setSaved(message = 'Salvo neste dispositivo') {
  saveMessage = message;
  render();
  window.clearTimeout(setSaved.timer);
  setSaved.timer = window.setTimeout(() => { saveMessage = ''; render(); }, 1500);
}

function topbar(state) {
  const open = getOpenSession(state);
  return `<header class="topbar">
    <div class="brand">Fluxa</div>
    ${open ? `<div class="session-indicator">Sessão aberta · ${durationLabel(open.startedAt)}</div>` : ''}
  </header>`;
}

function nav() {
  return `<nav class="bottom-nav" aria-label="Navegação principal">
    ${['today','treatments','assisted','library'].map((item) => {
      const labels = { today:'Hoje', treatments:'Tratamentos', assisted:'Assistidos', library:'Biblioteca' };
      return `<button class="nav-btn ${route === item ? 'active' : ''}" data-route="${item}">${labels[item]}</button>`;
    }).join('')}
  </nav>`;
}

function todayView(state) {
  const session = getOpenSession(state);
  if (!session) {
    const recent = [...state.events].filter(e => e.eventType !== EventType.SESSION_ASSISTED_SELECTED).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,4);
    return `<main>
      <p class="eyebrow">Hoje</p>
      <h1>Seu espaço de trabalho, com clareza.</h1>
      <p class="lead">Abra uma sessão quando for medir, investigar ou trabalhar com ferramentas terapêuticas.</p>
      <section class="hero-card">
        <p class="eyebrow" style="color:#BFD1CD">Nenhuma sessão aberta</p>
        <h2>Quando estiver pronta, abra sua janela de trabalho.</h2>
        <p>Preparação, assistidos e atividades ficam organizados dentro dela. Tratamentos podem continuar depois do encerramento.</p>
        <button class="btn primary wide" style="background:#F8F9F7;color:#102F35" data-action="start-session">Iniciar sessão</button>
      </section>
      <section class="section">
        <div class="section-head"><h2>Atividade recente</h2></div>
        ${recent.length ? timeline(recent, state) : `<div class="empty">O histórico começa quando você abrir sua primeira sessão no Fluxa.</div>`}
      </section>
    </main>`;
  }

  const prep = latestPreparation(state, session.id);
  const prepared = prep?.status === 'COMPLETED';
  const assisted = state.assistedEntities.find((item) => item.id === session.currentAssistedEntityId);
  const events = state.events.filter((event) => event.sessionId === session.id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));

  return `<main>
    <p class="eyebrow">Sessão em andamento</p>
    <h1>${prepared ? 'Continue de onde está.' : 'Prepare seu espaço de trabalho.'}</h1>
    <p class="lead">Iniciada às ${formatTime(session.startedAt)} · ${durationLabel(session.startedAt)}</p>

    ${!prepared ? `<section class="hero-card">
      <p class="eyebrow" style="color:#BFD1CD">Preparação</p>
      <h2>${prep ? 'Sua preparação está em andamento.' : 'Comece pela preparação da sessão.'}</h2>
      <p>Respiração, frequência, proteção e permissão ficam registradas uma vez para esta janela de trabalho.</p>
      <button class="btn primary wide" style="background:#F8F9F7;color:#102F35" data-action="open-preparation">${prep ? 'Continuar preparação' : 'Iniciar preparação'}</button>
    </section>` : `<section class="card soft section">
      <div class="section-head"><div><p class="eyebrow">Contexto atual</p><h2>${assisted ? esc(assisted.displayName) : 'Escolha um assistido'}</h2></div>${assisted ? `<span class="muted">${assistedLabels[assisted.type]}</span>` : ''}</div>
      <button class="btn secondary wide" data-action="choose-assisted">${assisted ? 'Trocar assistido' : 'Selecionar assistido'}</button>
    </section>

    <section class="section">
      <div class="section-head"><h2>Novo trabalho</h2></div>
      <div class="action-grid">
        <button class="action-card" ${assisted ? '' : 'disabled'}><strong>Investigar</strong><span>Perguntas e achados</span></button>
        <button class="action-card" ${assisted ? '' : 'disabled'}><strong>Tratar</strong><span>Plano longitudinal</span></button>
        <button class="action-card" ${assisted ? '' : 'disabled'}><strong>Reiki</strong><span>Timer e aplicação</span></button>
        <button class="action-card" data-action="add-note" ${assisted ? '' : 'disabled'}><strong>Anotar</strong><span>Registro rápido</span></button>
      </div>
    </section>`}

    <section class="section">
      <div class="section-head"><h2>Timeline da sessão</h2><button class="btn ghost small" data-action="close-session">Encerrar</button></div>
      ${timeline(events, state)}
    </section>
    <div class="save-state">${esc(saveMessage)}</div>
  </main>`;
}

function timeline(events, state) {
  if (!events.length) return `<div class="empty">Nenhuma atividade registrada ainda.</div>`;
  return `<div class="timeline">${events.map((event) => {
    const [title, detail] = eventCopy(event, state);
    return `<div class="timeline-item"><div class="timeline-time">${formatTime(event.occurredAt)}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div></div>`;
  }).join('')}</div>`;
}

function assistedView(state) {
  const items = state.assistedEntities.filter(i => !i.archivedAt).sort((a,b) => a.displayName.localeCompare(b.displayName));
  return `<main>
    <p class="eyebrow">Assistidos</p><h1>Histórias que continuam.</h1><p class="lead">Pessoas, grupos, pets, ambientes e processos ficam independentes das sessões.</p>
    <section class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></section>
    <section class="section assisted-list">${items.length ? items.map(item => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><span class="muted">${formatDateTime(item.createdAt)}</span></div>`).join('') : `<div class="empty">Nenhum assistido cadastrado.</div>`}</section>
  </main>`;
}

function placeholderView(name, copy) {
  return `<main><p class="eyebrow">${name}</p><h1>${copy}</h1><p class="lead">A estrutura desta área já está reservada no MVP. O próximo incremento conecta os fluxos longitudinais.</p><div class="section notice">Este branch está focado no primeiro vertical slice: persistência local, sessão, preparação, assistidos e workspace.</div></main>`;
}

function preparationSheet(state) {
  const session = getOpenSession(state);
  if (!session) return '';
  let prep = latestPreparation(state, session.id);
  if (!prep) prep = startPreparation(store, session.id);
  const allDone = prep.steps.every(s => s.completed);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="prep-title">
    <div class="sheet-head"><div><p class="eyebrow">Preparação da sessão</p><h2 id="prep-title">Antes de começar</h2></div><button class="close-btn" data-action="dismiss-sheet" aria-label="Fechar">×</button></div>
    <p class="muted">Marque cada etapa conforme concluir. O progresso é salvo automaticamente neste dispositivo.</p>
    <div class="checklist">${prep.steps.map(step => `<label class="check-row"><input type="checkbox" data-prep-step="${step.key}" ${step.completed ? 'checked' : ''}><span>${esc(step.label)}</span></label>`).join('')}</div>
    <div class="section"><button class="btn primary wide" data-action="complete-preparation" ${allDone ? '' : 'disabled'}>Concluir preparação</button></div>
  </section></div>`;
}

function assistedSheet(state) {
  const session = getOpenSession(state);
  const items = state.assistedEntities.filter(i => !i.archivedAt);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="assist-title">
    <div class="sheet-head"><div><p class="eyebrow">Contexto da sessão</p><h2 id="assist-title">Escolha um assistido</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>
    ${items.length ? `<div class="assisted-list">${items.map(item => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><button class="btn secondary small" data-select-assisted="${item.id}">Usar</button></div>`).join('')}</div>` : `<div class="empty">Cadastre o primeiro assistido para começar.</div>`}
    <div class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></div>
  </section></div>`;
}

function newAssistedSheet() {
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="new-assist-title">
    <div class="sheet-head"><div><p class="eyebrow">Novo assistido</p><h2 id="new-assist-title">Identificação essencial</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>
    <form id="assisted-form" class="form-grid">
      <div class="field"><label for="assisted-type">Tipo</label><select id="assisted-type" name="type">${Object.values(AssistedType).map(type => `<option value="${type}">${assistedLabels[type]}</option>`).join('')}</select></div>
      <div class="field"><label for="assisted-name">Nome ou identificação</label><input id="assisted-name" name="displayName" required autocomplete="off" placeholder="Ex.: Maria Silva ou Família Silva"></div>
      <div class="field"><label for="assisted-details">Detalhes opcionais</label><textarea id="assisted-details" name="details" placeholder="Informações úteis para identificar este assistido"></textarea></div>
      <button class="btn primary wide" type="submit">Criar assistido</button>
    </form>
  </section></div>`;
}

function noteSheet(state) {
  const session = getOpenSession(state);
  const assisted = state.assistedEntities.find(i => i.id === session?.currentAssistedEntityId);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="note-title">
    <div class="sheet-head"><div><p class="eyebrow">Anotar</p><h2 id="note-title">${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>
    <form id="note-form" class="form-grid"><div class="field"><label for="note-body">Registro</label><textarea id="note-body" name="body" required autofocus placeholder="Algo importante desta sessão..."></textarea></div><button class="btn primary wide" type="submit">Adicionar à timeline</button></form>
  </section></div>`;
}

function closeSheet(state) {
  const session = getOpenSession(state);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="close-title">
    <div class="sheet-head"><div><p class="eyebrow">Encerramento</p><h2 id="close-title">Encerrar esta janela de trabalho?</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>
    <p class="muted">Encerrar a sessão não encerra tratamentos que continuem ativos. O histórico desta janela permanece salvo no dispositivo.</p>
    <div class="notice">No próximo incremento, este fechamento ganha o checklist seguro completo. Nesta fundação, ele já respeita a separação entre sessão e tratamento.</div>
    <div class="section stack"><button class="btn primary wide" data-action="confirm-close-session">Encerrar sessão</button><button class="btn secondary wide" data-action="dismiss-sheet">Continuar trabalhando</button></div>
  </section></div>`;
}

function renderSheet(state) {
  if (sheet === 'preparation') return preparationSheet(state);
  if (sheet === 'choose-assisted') return assistedSheet(state);
  if (sheet === 'new-assisted') return newAssistedSheet();
  if (sheet === 'note') return noteSheet(state);
  if (sheet === 'close-session') return closeSheet(state);
  return '';
}

function render() {
  const state = store.getState();
  const view = route === 'today' ? todayView(state)
    : route === 'assisted' ? assistedView(state)
    : route === 'treatments' ? placeholderView('Tratamentos', 'Continuidade sem perder o fio.')
    : placeholderView('Biblioteca', 'Métodos disponíveis quando você precisar.');
  root.innerHTML = `${topbar(state)}${view}${nav()}${renderSheet(state)}`;
}

root.addEventListener('click', (event) => {
  const routeBtn = event.target.closest('[data-route]');
  if (routeBtn) { route = routeBtn.dataset.route; sheet = null; render(); return; }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start-session') { startSession(store); sheet = 'preparation'; setSaved(); return; }
  if (action === 'open-preparation') { sheet = 'preparation'; render(); return; }
  if (action === 'choose-assisted') { sheet = 'choose-assisted'; render(); return; }
  if (action === 'new-assisted') { sheet = 'new-assisted'; render(); return; }
  if (action === 'add-note') { sheet = 'note'; render(); return; }
  if (action === 'close-session') { sheet = 'close-session'; render(); return; }
  if (action === 'dismiss-sheet') { sheet = null; render(); return; }
  if (action === 'complete-preparation') {
    const session = getOpenSession(store.getState());
    const prep = latestPreparation(store.getState(), session.id);
    completePreparation(store, prep.id); sheet = null; setSaved('Preparação concluída'); return;
  }
  if (action === 'confirm-close-session') {
    const session = getOpenSession(store.getState());
    if (session) closeSession(store, session.id);
    sheet = null; setSaved('Sessão encerrada'); return;
  }

  const select = event.target.closest('[data-select-assisted]');
  if (select) {
    const session = getOpenSession(store.getState());
    selectAssistedForSession(store, session.id, select.dataset.selectAssisted);
    sheet = null; setSaved('Assistido selecionado');
  }
});

root.addEventListener('change', (event) => {
  if (event.target.matches('[data-prep-step]')) {
    const session = getOpenSession(store.getState());
    const prep = latestPreparation(store.getState(), session.id);
    togglePreparationStep(store, prep.id, event.target.dataset.prepStep);
    setSaved();
  }
});

root.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'assisted-form') {
    const data = new FormData(event.target);
    const entity = createAssistedEntity(store, {
      type: data.get('type'), displayName: data.get('displayName'), details: data.get('details')
    });
    const session = getOpenSession(store.getState());
    if (session) selectAssistedForSession(store, session.id, entity.id);
    sheet = null; route = session ? 'today' : 'assisted'; setSaved('Assistido criado');
  }
  if (event.target.id === 'note-form') {
    const data = new FormData(event.target);
    const session = getOpenSession(store.getState());
    if (session?.currentAssistedEntityId) addSessionNote(store, session.id, session.currentAssistedEntityId, data.get('body'));
    sheet = null; setSaved('Anotação adicionada');
  }
});

store.subscribe(() => render());
render();
setInterval(() => {
  if (getOpenSession(store.getState()) && route === 'today' && !sheet) render();
}, 60000);
