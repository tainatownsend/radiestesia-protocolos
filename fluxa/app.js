import { createStore } from './store.js';
import {
  AssistedType,
  EventType,
  MVP_PROTOCOL,
  getOpenSession,
  startSession,
  closeSession,
  startPreparation,
  latestPreparation,
  togglePreparationStep,
  completePreparation,
  createAssistedEntity,
  selectAssistedForSession,
  startInvestigation,
  answerInvestigation,
  confirmFindings,
  createTreatment,
  addSessionNote
} from './domain.js';

const store = createStore();
const root = document.querySelector('#app');
let route = 'today';
let sheet = null;
let sheetContext = null;
let saveMessage = '';

const assistedLabels = {
  PERSON: 'Pessoa', PET: 'PET', ENVIRONMENT: 'Ambiente', GROUP: 'Grupo', SITUATION: 'Situação / Processo', OTHER: 'Outro'
};
const durationLabels = { MINUTE:'minutos', HOUR:'horas', DAY:'dias', WEEK:'semanas', MONTH:'meses' };

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
function assistedById(state, id) {
  return state.assistedEntities.find((item) => item.id === id) || null;
}
function eventCopy(event, state) {
  const assisted = assistedById(state, event.assistedEntityId);
  const name = assisted?.displayName;
  switch (event.eventType) {
    case EventType.SESSION_STARTED: return ['Sessão iniciada', 'Janela de trabalho aberta'];
    case EventType.PREPARATION_STARTED: return ['Preparação iniciada', 'Ritual da sessão'];
    case EventType.PREPARATION_COMPLETED: return ['Preparação concluída', 'Pronta para iniciar os trabalhos'];
    case EventType.ASSISTED_CREATED: return ['Assistido criado', name || 'Novo assistido'];
    case EventType.SESSION_ASSISTED_SELECTED: return ['Contexto selecionado', name || 'Assistido'];
    case EventType.INVESTIGATION_STARTED: return ['Investigação iniciada', `${event.metadata?.protocolName || 'Protocolo'} · ${name || ''}`];
    case EventType.INVESTIGATION_COMPLETED: return ['Investigação concluída', event.metadata?.protocolName || name || ''];
    case EventType.FINDING_IDENTIFIED: return ['Achado registrado', event.metadata?.title || name || ''];
    case EventType.TREATMENT_CREATED: return ['Tratamento criado', event.metadata?.title || name || ''];
    case EventType.TREATMENT_STARTED: return ['Tratamento iniciado', event.metadata?.title || name || ''];
    case EventType.COMPONENT_STARTED: return ['Componente iniciado', event.metadata?.name || 'Componente terapêutico'];
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
  return `<header class="topbar"><div class="brand">Fluxa</div>${open ? `<div class="session-indicator">Sessão aberta · ${durationLabel(open.startedAt)}</div>` : ''}</header>`;
}
function nav() {
  return `<nav class="bottom-nav" aria-label="Navegação principal">${['today','treatments','assisted','library'].map((item) => {
    const labels = { today:'Hoje', treatments:'Tratamentos', assisted:'Assistidos', library:'Biblioteca' };
    return `<button class="nav-btn ${route === item ? 'active' : ''}" data-route="${item}">${labels[item]}</button>`;
  }).join('')}</nav>`;
}
function timeline(events, state) {
  if (!events.length) return `<div class="empty">Nenhuma atividade registrada ainda.</div>`;
  return `<div class="timeline">${events.map((event) => {
    const [title, detail] = eventCopy(event, state);
    return `<div class="timeline-item"><div class="timeline-time">${formatTime(event.occurredAt)}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div></div>`;
  }).join('')}</div>`;
}

function todayView(state) {
  const session = getOpenSession(state);
  if (!session) {
    const reviewCount = state.treatmentComponents.filter((component) => component.status === 'IN_PROGRESS' && component.expectedEndAt && new Date(component.expectedEndAt) <= new Date()).length;
    const recent = [...state.events].filter(e => e.eventType !== EventType.SESSION_ASSISTED_SELECTED).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,4);
    return `<main>
      <p class="eyebrow">Hoje</p><h1>Seu espaço de trabalho, com clareza.</h1>
      <p class="lead">Abra uma sessão quando for medir, investigar ou trabalhar com ferramentas terapêuticas.</p>
      <section class="hero-card"><p class="eyebrow" style="color:#BFD1CD">Nenhuma sessão aberta</p><h2>Quando estiver pronta, abra sua janela de trabalho.</h2><p>Preparação, assistidos e atividades ficam organizados dentro dela. Tratamentos podem continuar depois do encerramento.</p><button class="btn primary wide" style="background:#F8F9F7;color:#102F35" data-action="start-session">Iniciar sessão</button></section>
      ${reviewCount ? `<section class="section card"><div class="section-head"><div><p class="eyebrow">Atenção</p><h2>${reviewCount} ${reviewCount === 1 ? 'revisão disponível' : 'revisões disponíveis'}</h2></div><button class="btn secondary small" data-route="treatments">Ver</button></div><p class="muted">O prazo chegou ao fim. Uma nova medição só deve ser feita dentro de uma sessão aberta.</p></section>` : ''}
      <section class="section"><div class="section-head"><h2>Atividade recente</h2></div>${recent.length ? timeline(recent, state) : `<div class="empty">O histórico começa quando você abrir sua primeira sessão no Fluxa.</div>`}</section>
    </main>`;
  }

  const prep = latestPreparation(state, session.id);
  const prepared = prep?.status === 'COMPLETED';
  const assisted = assistedById(state, session.currentAssistedEntityId);
  const activeInvestigation = state.investigations.find((item) => item.sessionId === session.id && item.assistedEntityId === assisted?.id && item.status === 'IN_PROGRESS');
  const events = state.events.filter((event) => event.sessionId === session.id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));

  return `<main>
    <p class="eyebrow">Sessão em andamento</p><h1>${prepared ? 'Continue de onde está.' : 'Prepare seu espaço de trabalho.'}</h1><p class="lead">Iniciada às ${formatTime(session.startedAt)} · ${durationLabel(session.startedAt)}</p>
    ${!prepared ? `<section class="hero-card"><p class="eyebrow" style="color:#BFD1CD">Preparação</p><h2>${prep ? 'Sua preparação está em andamento.' : 'Comece pela preparação da sessão.'}</h2><p>Respiração, frequência, proteção e permissão ficam registradas uma vez para esta janela de trabalho.</p><button class="btn primary wide" style="background:#F8F9F7;color:#102F35" data-action="open-preparation">${prep ? 'Continuar preparação' : 'Iniciar preparação'}</button></section>` : `
      <section class="card soft section"><div class="section-head"><div><p class="eyebrow">Contexto atual</p><h2>${assisted ? esc(assisted.displayName) : 'Escolha um assistido'}</h2></div>${assisted ? `<span class="muted">${assistedLabels[assisted.type]}</span>` : ''}</div><button class="btn secondary wide" data-action="choose-assisted">${assisted ? 'Trocar assistido' : 'Selecionar assistido'}</button></section>
      ${activeInvestigation ? `<section class="section card"><p class="eyebrow">Em andamento</p><h2>Triagem rápida</h2><p class="muted">A investigação foi salva e pode continuar exatamente do ponto atual.</p><button class="btn primary wide" data-action="continue-investigation">Continuar investigação</button></section>` : ''}
      <section class="section"><div class="section-head"><h2>Novo trabalho</h2></div><div class="action-grid">
        <button class="action-card" data-action="start-investigation" ${assisted ? '' : 'disabled'}><strong>Investigar</strong><span>Perguntas e achados</span></button>
        <button class="action-card" data-action="start-treatment" ${assisted ? '' : 'disabled'}><strong>Tratar</strong><span>Plano longitudinal</span></button>
        <button class="action-card" disabled><strong>Reiki</strong><span>Timer e aplicação · próximo incremento</span></button>
        <button class="action-card" data-action="add-note" ${assisted ? '' : 'disabled'}><strong>Anotar</strong><span>Registro rápido</span></button>
      </div></section>`}
    <section class="section"><div class="section-head"><h2>Timeline da sessão</h2><button class="btn ghost small" data-action="close-session">Encerrar</button></div>${timeline(events, state)}</section><div class="save-state">${esc(saveMessage)}</div>
  </main>`;
}

function treatmentsView(state) {
  const treatments = [...state.treatments].sort((a,b) => b.startedAt.localeCompare(a.startedAt));
  return `<main><p class="eyebrow">Tratamentos</p><h1>Continuidade sem perder o fio.</h1><p class="lead">Tratamentos vivem além da sessão. O prazo de cada componente indica quando uma revisão fica disponível.</p>
    <section class="section stack">${treatments.length ? treatments.map((treatment) => {
      const assisted = assistedById(state, treatment.assistedEntityId);
      const components = state.treatmentComponents.filter((c) => c.treatmentId === treatment.id);
      const next = components.filter(c => c.status === 'IN_PROGRESS' && c.expectedEndAt).sort((a,b) => a.expectedEndAt.localeCompare(b.expectedEndAt))[0];
      const due = next && new Date(next.expectedEndAt) <= new Date();
      return `<article class="card"><div class="section-head"><div><p class="eyebrow">${due ? 'Revisão disponível' : 'Em andamento'}</p><h2>${esc(treatment.title)}</h2></div><span class="muted">${esc(assisted?.displayName || '')}</span></div>${components.map(c => `<p><strong>${esc(c.name)}</strong><br><span class="muted">${c.durationValue || '—'} ${durationLabels[c.durationUnit] || ''}${c.expectedEndAt ? ` · ${due ? 'disponível desde' : 'previsto até'} ${formatDateTime(c.expectedEndAt)}` : ''}</span></p>`).join('')}</article>`;
    }).join('') : `<div class="empty">Nenhum tratamento criado ainda.</div>`}</section></main>`;
}

function assistedView(state) {
  const items = state.assistedEntities.filter(i => !i.archivedAt).sort((a,b) => a.displayName.localeCompare(b.displayName));
  return `<main><p class="eyebrow">Assistidos</p><h1>Histórias que continuam.</h1><p class="lead">Pessoas, grupos, pets, ambientes e processos ficam independentes das sessões.</p><section class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></section><section class="section assisted-list">${items.length ? items.map(item => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><span class="muted">${formatDateTime(item.createdAt)}</span></div>`).join('') : `<div class="empty">Nenhum assistido cadastrado.</div>`}</section></main>`;
}

function libraryView() {
  return `<main><p class="eyebrow">Biblioteca</p><h1>Métodos disponíveis quando você precisar.</h1><p class="lead">O primeiro vertical slice usa uma versão congelada de protocolo para provar versionamento e retomada.</p><section class="section card"><p class="eyebrow">Protocolo v${MVP_PROTOCOL.version}</p><h2>${MVP_PROTOCOL.name}</h2><p class="muted">${MVP_PROTOCOL.questions.length} perguntas · versão histórica imutável na investigação</p></section></main>`;
}

function preparationSheet(state) {
  const session = getOpenSession(state);
  if (!session) return '';
  let prep = latestPreparation(state, session.id);
  if (!prep) prep = startPreparation(store, session.id);
  const allDone = prep.steps.every(s => s.completed);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Preparação da sessão</p><h2>Antes de começar</h2></div><button class="close-btn" data-action="dismiss-sheet" aria-label="Fechar">×</button></div><p class="muted">Marque cada etapa conforme concluir. O progresso é salvo automaticamente neste dispositivo.</p><div class="checklist">${prep.steps.map(step => `<label class="check-row"><input type="checkbox" data-prep-step="${step.key}" ${step.completed ? 'checked' : ''}><span>${esc(step.label)}</span></label>`).join('')}</div><div class="section"><button class="btn primary wide" data-action="complete-preparation" ${allDone ? '' : 'disabled'}>Concluir preparação</button></div></section></div>`;
}

function assistedSheet(state) {
  const items = state.assistedEntities.filter(i => !i.archivedAt);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Contexto da sessão</p><h2>Escolha um assistido</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>${items.length ? `<div class="assisted-list">${items.map(item => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><button class="btn secondary small" data-select-assisted="${item.id}">Usar</button></div>`).join('')}</div>` : `<div class="empty">Cadastre o primeiro assistido para começar.</div>`}<div class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></div></section></div>`;
}

function newAssistedSheet() {
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Novo assistido</p><h2>Identificação essencial</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="assisted-form" class="form-grid"><div class="field"><label for="assisted-type">Tipo</label><select id="assisted-type" name="type">${Object.values(AssistedType).map(type => `<option value="${type}">${assistedLabels[type]}</option>`).join('')}</select></div><div class="field"><label for="assisted-name">Nome ou identificação</label><input id="assisted-name" name="displayName" required autocomplete="off" placeholder="Ex.: Maria Silva ou Família Silva"></div><div class="field"><label for="assisted-details">Detalhes opcionais</label><textarea id="assisted-details" name="details" placeholder="Informações úteis para identificar este assistido"></textarea></div><button class="btn primary wide" type="submit">Criar assistido</button></form></section></div>`;
}

function investigationSheet(state) {
  const investigation = state.investigations.find((item) => item.id === sheetContext?.investigationId);
  if (!investigation) return '';
  const assisted = assistedById(state, investigation.assistedEntityId);
  if (investigation.status === 'COMPLETED') {
    const positives = investigation.answers.filter((a) => a.answer === 'YES');
    return `<div class="modal-backdrop"><section class="sheet focus-sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Investigação concluída</p><h2>O que merece virar achado?</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Uma resposta “Sim” não vira achado automaticamente. Confirme apenas o que deve seguir para o tratamento.</p>${positives.length ? `<form id="finding-form" class="form-grid"><input type="hidden" name="investigationId" value="${investigation.id}"><div class="checklist">${positives.map((answer) => `<label class="check-row"><input type="checkbox" name="questionId" value="${answer.questionId}"><span>${esc(answer.questionTextSnapshot)}</span></label>`).join('')}</div><button class="btn primary wide" type="submit">Confirmar achados</button></form>` : `<div class="empty">Nenhuma resposta positiva nesta triagem.</div><div class="section"><button class="btn primary wide" data-action="finish-investigation-no-findings">Voltar ao workspace</button></div>`}</section></div>`;
  }
  const question = investigation.protocolSnapshot.questions[investigation.currentIndex];
  return `<div class="modal-backdrop"><section class="sheet focus-sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">${esc(investigation.protocolSnapshot.name)} · ${esc(assisted?.displayName || '')}</p><h2>${investigation.currentIndex + 1} de ${investigation.protocolSnapshot.questions.length}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><div class="question-panel"><p class="muted">Consulte o pêndulo</p><h1>${esc(question.text)}</h1></div><div class="binary-actions"><button class="binary-btn" data-answer="YES">Sim</button><button class="binary-btn" data-answer="NO">Não</button></div><p class="save-state">Cada resposta é salva imediatamente.</p></section></div>`;
}

function findingsDoneSheet(state) {
  const findingIds = sheetContext?.findingIds || [];
  const findings = state.findings.filter((f) => findingIds.includes(f.id));
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Achados registrados</p><h2>${findings.length ? `${findings.length} ${findings.length === 1 ? 'achado confirmado' : 'achados confirmados'}` : 'Investigação concluída'}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>${findings.length ? `<div class="stack">${findings.map(f => `<div class="card soft"><strong>${esc(f.title)}</strong><p class="muted">Fator relevante · rastreável até a investigação</p></div>`).join('')}</div><div class="section stack"><button class="btn primary wide" data-action="treat-findings">Criar tratamento</button><button class="btn secondary wide" data-action="dismiss-sheet">Tratar depois</button></div>` : `<button class="btn primary wide" data-action="dismiss-sheet">Voltar ao workspace</button>`}</section></div>`;
}

function treatmentSheet(state) {
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) return '';
  const assisted = assistedById(state, session.currentAssistedEntityId);
  const candidateIds = sheetContext?.findingIds || [];
  const findings = state.findings.filter((f) => f.assistedEntityId === assisted.id && (candidateIds.length ? candidateIds.includes(f.id) : f.status === 'IDENTIFIED'));
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Novo tratamento</p><h2>${esc(assisted.displayName)}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="treatment-form" class="form-grid"><div class="field"><label for="treatment-title">Objetivo do tratamento</label><input id="treatment-title" name="title" required placeholder="Ex.: Harmonizar o fator prioritário"></div>${findings.length ? `<div><p class="eyebrow">Achados relacionados</p><div class="checklist">${findings.map(f => `<label class="check-row"><input type="checkbox" name="findingId" value="${f.id}" checked><span>${esc(f.title)}</span></label>`).join('')}</div></div>` : ''}<div class="field"><label for="component-name">Gráfico / componente</label><input id="component-name" name="componentName" required placeholder="Nome do gráfico ou recurso"></div><div class="duration-grid"><div class="field"><label for="duration-value">Duração</label><input id="duration-value" name="durationValue" type="number" min="1" step="1" required value="1"></div><div class="field"><label for="duration-unit">Unidade</label><select id="duration-unit" name="durationUnit"><option value="MINUTE">Minutos</option><option value="HOUR">Horas</option><option value="DAY" selected>Dias</option><option value="WEEK">Semanas</option><option value="MONTH">Meses</option></select></div></div><div class="field"><label for="component-instructions">Comando / instrução opcional</label><textarea id="component-instructions" name="instructions" placeholder="Comando indicado para este componente"></textarea></div><button class="btn primary wide" type="submit">Iniciar tratamento</button></form></section></div>`;
}

function treatmentCreatedSheet(state) {
  const treatment = state.treatments.find(t => t.id === sheetContext?.treatmentId);
  const component = state.treatmentComponents.find(c => c.treatmentId === treatment?.id);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Tratamento iniciado</p><h2>${esc(treatment?.title || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><div class="card soft"><strong>${esc(component?.name || '')}</strong><p class="muted">${component?.durationValue || ''} ${durationLabels[component?.durationUnit] || ''}${component?.expectedEndAt ? ` · revisão disponível em ${formatDateTime(component.expectedEndAt)}` : ''}</p></div><div class="notice section">Você pode encerrar a sessão normalmente. Este tratamento continuará em andamento e aparecerá em Tratamentos.</div><div class="section"><button class="btn primary wide" data-action="dismiss-sheet">Voltar ao workspace</button></div></section></div>`;
}

function noteSheet(state) {
  const session = getOpenSession(state);
  const assisted = assistedById(state, session?.currentAssistedEntityId);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Anotar</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="note-form" class="form-grid"><div class="field"><label for="note-body">Registro</label><textarea id="note-body" name="body" required autofocus placeholder="Algo importante desta sessão..."></textarea></div><button class="btn primary wide" type="submit">Adicionar à timeline</button></form></section></div>`;
}

function closeSheet() {
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Encerramento</p><h2>Encerrar esta janela de trabalho?</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Encerrar a sessão não encerra tratamentos que continuem ativos. Investigações incompletas permanecem salvas para correção/continuidade futura.</p><div class="notice">O checklist de fechamento completo entra no próximo incremento; a separação entre sessão e tratamento já está aplicada no domínio.</div><div class="section stack"><button class="btn primary wide" data-action="confirm-close-session">Encerrar sessão</button><button class="btn secondary wide" data-action="dismiss-sheet">Continuar trabalhando</button></div></section></div>`;
}

function renderSheet(state) {
  if (sheet === 'preparation') return preparationSheet(state);
  if (sheet === 'choose-assisted') return assistedSheet(state);
  if (sheet === 'new-assisted') return newAssistedSheet();
  if (sheet === 'investigation') return investigationSheet(state);
  if (sheet === 'findings-done') return findingsDoneSheet(state);
  if (sheet === 'treatment') return treatmentSheet(state);
  if (sheet === 'treatment-created') return treatmentCreatedSheet(state);
  if (sheet === 'note') return noteSheet(state);
  if (sheet === 'close-session') return closeSheet();
  return '';
}

function render() {
  const state = store.getState();
  const view = route === 'today' ? todayView(state) : route === 'assisted' ? assistedView(state) : route === 'treatments' ? treatmentsView(state) : libraryView(state);
  root.innerHTML = `${topbar(state)}${view}${nav()}${renderSheet(state)}`;
}

root.addEventListener('click', (event) => {
  const routeBtn = event.target.closest('[data-route]');
  if (routeBtn) { route = routeBtn.dataset.route; sheet = null; sheetContext = null; render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start-session') { startSession(store); sheet = 'preparation'; setSaved(); return; }
  if (action === 'open-preparation') { sheet = 'preparation'; render(); return; }
  if (action === 'choose-assisted') { sheet = 'choose-assisted'; render(); return; }
  if (action === 'new-assisted') { sheet = 'new-assisted'; render(); return; }
  if (action === 'add-note') { sheet = 'note'; render(); return; }
  if (action === 'close-session') { sheet = 'close-session'; render(); return; }
  if (action === 'dismiss-sheet' || action === 'finish-investigation-no-findings') { sheet = null; sheetContext = null; render(); return; }
  if (action === 'complete-preparation') {
    const session = getOpenSession(store.getState());
    const prep = latestPreparation(store.getState(), session.id);
    completePreparation(store, prep.id); sheet = null; setSaved('Preparação concluída'); return;
  }
  if (action === 'confirm-close-session') {
    const session = getOpenSession(store.getState());
    if (session) closeSession(store, session.id);
    sheet = null; sheetContext = null; setSaved('Sessão encerrada'); return;
  }
  if (action === 'start-investigation') {
    const state = store.getState(); const session = getOpenSession(state);
    const investigation = startInvestigation(store, session.id, session.currentAssistedEntityId);
    sheet = 'investigation'; sheetContext = { investigationId: investigation.id }; render(); return;
  }
  if (action === 'continue-investigation') {
    const state = store.getState(); const session = getOpenSession(state);
    const investigation = state.investigations.find(i => i.sessionId === session.id && i.assistedEntityId === session.currentAssistedEntityId && i.status === 'IN_PROGRESS');
    if (investigation) { sheet = 'investigation'; sheetContext = { investigationId: investigation.id }; render(); } return;
  }
  if (action === 'start-treatment') { sheet = 'treatment'; sheetContext = { findingIds: [] }; render(); return; }
  if (action === 'treat-findings') { sheet = 'treatment'; sheetContext = { findingIds: sheetContext?.findingIds || [] }; render(); return; }

  const answer = event.target.closest('[data-answer]')?.dataset.answer;
  if (answer && sheetContext?.investigationId) { answerInvestigation(store, sheetContext.investigationId, answer); setSaved('Resposta salva'); return; }

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
    togglePreparationStep(store, prep.id, event.target.dataset.prepStep); setSaved();
  }
});

root.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'assisted-form') {
    const data = new FormData(event.target);
    const entity = createAssistedEntity(store, { type: data.get('type'), displayName: data.get('displayName'), details: data.get('details') });
    const session = getOpenSession(store.getState());
    if (session) selectAssistedForSession(store, session.id, entity.id);
    sheet = null; route = session ? 'today' : 'assisted'; setSaved('Assistido criado');
  }
  if (event.target.id === 'finding-form') {
    const data = new FormData(event.target);
    const ids = data.getAll('questionId');
    const created = confirmFindings(store, data.get('investigationId'), ids);
    sheet = 'findings-done'; sheetContext = { findingIds: created.map(f => f.id) }; setSaved('Achados registrados');
  }
  if (event.target.id === 'treatment-form') {
    const data = new FormData(event.target); const state = store.getState(); const session = getOpenSession(state);
    const result = createTreatment(store, { sessionId: session.id, assistedEntityId: session.currentAssistedEntityId, title: data.get('title'), findingIds: data.getAll('findingId'), componentName: data.get('componentName'), durationValue: data.get('durationValue'), durationUnit: data.get('durationUnit'), instructions: data.get('instructions') });
    sheet = 'treatment-created'; sheetContext = { treatmentId: result.treatment.id }; setSaved('Tratamento iniciado');
  }
  if (event.target.id === 'note-form') {
    const data = new FormData(event.target); const session = getOpenSession(store.getState());
    if (session?.currentAssistedEntityId) addSessionNote(store, session.id, session.currentAssistedEntityId, data.get('body'));
    sheet = null; setSaved('Anotação adicionada');
  }
});

store.subscribe(() => render());
render();
setInterval(() => { if (getOpenSession(store.getState()) && route === 'today' && !sheet) render(); }, 60000);
