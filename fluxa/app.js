import { createStore } from './store.js';
import {
  AssistedType, EventType, TreatmentStatus, MVP_PROTOCOL,
  getOpenSession, startSession, closeSession, startPreparation, latestPreparation, togglePreparationStep, completePreparation,
  createAssistedEntity, selectAssistedForSession,
  startInvestigation, resumeInvestigation, answerInvestigation, confirmFindings,
  createTreatment, interruptTreatment, resumeTreatment, reviewTreatment, treatmentNeedsReview,
  startReiki, pauseReiki, resumeReiki, completeReiki, recordReikiRetrospective, reikiElapsedSeconds,
  addSessionNote
} from './domain.js';

const store = createStore();
const root = document.querySelector('#app');
const validRoutes = new Set(['today', 'treatments', 'assisted', 'library']);
function readRoutePreference() { try { return sessionStorage.getItem('fluxa.activeRoute'); } catch (_) { return null; } }
function saveRoutePreference(value) { try { sessionStorage.setItem('fluxa.activeRoute', value); } catch (_) {} }
const persistedRoute = readRoutePreference();
let route = validRoutes.has(persistedRoute) ? persistedRoute : 'today';
let sheet = null;
let saveMessage = '';
let timerTick = null;

const assistedLabels = { PERSON:'Pessoa', PET:'PET', ENVIRONMENT:'Ambiente', GROUP:'Grupo', SITUATION:'Situação / Processo', OTHER:'Outro' };
const treatmentLabels = { PLANNED:'Planejado', IN_PROGRESS:'Em andamento', COMPLETED:'Concluído', INTERRUPTED:'Interrompido' };
const durationLabels = { MINUTE:'minuto(s)', HOUR:'hora(s)', DAY:'dia(s)', WEEK:'semana(s)', MONTH:'mês(es)' };

function esc(value = '') {
  return String(value).replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '\"':'&quot;' }[c]));
}
function formatTime(iso) { return iso ? new Intl.DateTimeFormat('pt-BR', { hour:'2-digit', minute:'2-digit' }).format(new Date(iso)) : ''; }
function formatDate(iso) { return iso ? new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(iso)) : ''; }
function formatDateTime(iso) { return iso ? new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)) : ''; }
function formatClock(totalSeconds = 0) {
  const s = Math.max(0, Number(totalSeconds) || 0); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function durationLabel(startedAt) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins} min`; const hours = Math.floor(mins / 60); const rem = mins % 60; return rem ? `${hours}h ${rem}min` : `${hours}h`;
}
function isPrepared(state, sessionId) { return latestPreparation(state, sessionId)?.status === 'COMPLETED'; }
function assistedById(state, id) { return state.assistedEntities.find((item) => item.id === id); }
function treatmentComponents(state, treatmentId) { return state.treatmentComponents.filter((item) => item.treatmentId === treatmentId); }

function setSaved(message = 'Salvo neste dispositivo') {
  saveMessage = message; render(); window.clearTimeout(setSaved.timer);
  setSaved.timer = window.setTimeout(() => { saveMessage = ''; render(); }, 1400);
}

function eventCopy(event, state) {
  const name = assistedById(state, event.assistedEntityId)?.displayName;
  const copies = {
    [EventType.SESSION_STARTED]: ['Sessão iniciada', 'Janela de trabalho aberta'],
    [EventType.PREPARATION_STARTED]: ['Preparação iniciada', 'Procedimento da sessão'],
    [EventType.PREPARATION_COMPLETED]: ['Preparação concluída', 'Pronta para iniciar os trabalhos'],
    [EventType.CLOSING_COMPLETED]: ['Encerramento realizado', 'Procedimento de fechamento confirmado'],
    [EventType.SESSION_CLOSED]: ['Sessão encerrada', `Encerrada às ${formatTime(event.occurredAt)}`],
    [EventType.ASSISTED_CREATED]: ['Assistido criado', name || 'Novo assistido'],
    [EventType.SESSION_ASSISTED_SELECTED]: ['Contexto selecionado', name || 'Assistido'],
    [EventType.INVESTIGATION_STARTED]: ['Investigação iniciada', event.metadata?.protocolName || 'Investigação'],
    [EventType.INVESTIGATION_RESUMED]: ['Investigação retomada', name || 'Continuidade em nova sessão'],
    [EventType.INVESTIGATION_COMPLETED]: ['Investigação concluída', event.metadata?.protocolName || 'Investigação'],
    [EventType.FINDING_IDENTIFIED]: ['Achado registrado', event.metadata?.title || 'Fator relevante'],
    [EventType.TREATMENT_CREATED]: ['Tratamento criado', event.metadata?.title || 'Tratamento'],
    [EventType.TREATMENT_STARTED]: ['Tratamento iniciado', event.metadata?.title || 'Tratamento'],
    [EventType.TREATMENT_INTERRUPTED]: ['Tratamento interrompido', event.metadata?.reason || 'Histórico preservado'],
    [EventType.TREATMENT_RESUMED]: ['Tratamento retomado', 'Voltando para Em andamento'],
    [EventType.TREATMENT_REVIEWED]: ['Tratamento revisado', event.metadata?.verifiedComplete ? 'Finalização confirmada' : 'Continua em andamento'],
    [EventType.TREATMENT_COMPLETED]: ['Tratamento concluído', 'Componentes finalizados'],
    [EventType.REIKI_STARTED]: ['Reiki iniciado', name || 'Aplicação'],
    [EventType.REIKI_PAUSED]: ['Reiki pausado', name || 'Aplicação'],
    [EventType.REIKI_RESUMED]: ['Reiki retomado', name || 'Aplicação'],
    [EventType.REIKI_COMPLETED]: ['Reiki concluído', event.metadata?.durationSeconds != null ? formatClock(event.metadata.durationSeconds) : 'Aplicação registrada'],
    [EventType.NOTE_CREATED]: ['Anotação', event.metadata?.body || 'Registro da sessão']
  };
  return copies[event.eventType] || [event.eventType, name || ''];
}

function timeline(events, state) {
  if (!events.length) return `<div class="empty">Nenhuma atividade registrada ainda.</div>`;
  return `<div class="timeline">${events.map((event) => { const [title, detail] = eventCopy(event, state); return `<div class="timeline-item"><div class="timeline-time">${formatTime(event.occurredAt)}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div></div>`; }).join('')}</div>`;
}

function topbar(state) {
  const open = getOpenSession(state);
  return `<header class="topbar"><button class="brand brand-button" data-route="today">Fluxa</button>${open ? `<div class="session-indicator">Sessão aberta · ${durationLabel(open.startedAt)}</div>` : ''}</header>`;
}
function nav() {
  const labels = { today:'Hoje', treatments:'Tratamentos', assisted:'Assistidos', library:'Biblioteca' };
  return `<nav class="bottom-nav" aria-label="Navegação principal">${Object.keys(labels).map((item) => `<button class="nav-btn ${route === item ? 'active' : ''}" data-route="${item}">${labels[item]}</button>`).join('')}</nav>`;
}

function reviewSummary(state) {
  const needs = state.treatments.filter((item) => treatmentNeedsReview(state, item));
  if (!needs.length) return '';
  return `<section class="section notice-card"><div><p class="eyebrow">Atenção</p><h2>${needs.length} ${needs.length === 1 ? 'tratamento disponível' : 'tratamentos disponíveis'} para revisão</h2><p>O prazo chegou. A revisão com nova medição deve acontecer dentro de uma sessão aberta e preparada.</p></div><button class="btn secondary" data-route="treatments">Ver tratamentos</button></section>`;
}

function todayView(state) {
  const session = getOpenSession(state);
  if (!session) {
    const recent = [...state.events].filter((e) => e.eventType !== EventType.SESSION_ASSISTED_SELECTED).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,5);
    return `<main><p class="eyebrow">Hoje</p><h1>Seu espaço de trabalho, com clareza.</h1><p class="lead">Abra uma sessão quando for medir, investigar ou trabalhar com ferramentas terapêuticas.</p>
      <section class="hero-card"><p class="eyebrow hero-eyebrow">Nenhuma sessão aberta</p><h2>Quando estiver pronta, abra sua janela de trabalho.</h2><p>Tratamentos continuam ativos mesmo depois do encerramento.</p><button class="btn hero-btn wide" data-action="start-session">Iniciar sessão</button></section>
      ${reviewSummary(state)}
      <section class="section"><button class="btn secondary wide" data-action="reiki-retro">Registrar aplicação de Reiki realizada</button></section>
      <section class="section"><div class="section-head"><h2>Atividade recente</h2></div>${recent.length ? timeline(recent, state) : `<div class="empty">O histórico começa quando você abrir sua primeira sessão no Fluxa.</div>`}</section></main>`;
  }

  const prep = latestPreparation(state, session.id); const prepared = prep?.status === 'COMPLETED';
  const assisted = assistedById(state, session.currentAssistedEntityId);
  const events = state.events.filter((event) => event.sessionId === session.id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  const unfinished = assisted ? state.investigations.filter((item) => item.assistedEntityId === assisted.id && item.status === 'IN_PROGRESS') : [];
  const activeReiki = state.reikiApplications.find((item) => item.sessionId === session.id && ['RUNNING','PAUSED'].includes(item.status));

  return `<main><p class="eyebrow">Sessão em andamento</p><h1>${prepared ? 'Continue de onde está.' : 'Prepare seu espaço de trabalho.'}</h1><p class="lead">Iniciada às ${formatTime(session.startedAt)} · ${durationLabel(session.startedAt)}</p>
    ${!prepared ? `<section class="hero-card"><p class="eyebrow hero-eyebrow">Preparação</p><h2>${prep ? 'Sua preparação está em andamento.' : 'Comece pela preparação da sessão.'}</h2><p>Respiração, frequência, proteção e permissão ficam registradas para esta janela de trabalho.</p><button class="btn hero-btn wide" data-action="open-preparation">${prep ? 'Continuar preparação' : 'Iniciar preparação'}</button></section>` : `
      <section class="card soft section"><div class="section-head"><div><p class="eyebrow">Contexto atual</p><h2>${assisted ? esc(assisted.displayName) : 'Escolha um assistido'}</h2></div>${assisted ? `<span class="muted">${assistedLabels[assisted.type]}</span>` : ''}</div><button class="btn secondary wide" data-action="choose-assisted">${assisted ? 'Trocar assistido' : 'Selecionar assistido'}</button></section>
      ${unfinished.length ? `<section class="section notice-card"><div><p class="eyebrow">Continuidade</p><h2>${unfinished.length === 1 ? 'Há uma investigação para retomar' : 'Há investigações para retomar'}</h2><p>O progresso anterior permanece intacto, mesmo quando começou em outra sessão.</p></div><button class="btn secondary" data-action="resume-latest-investigation" ${assisted ? '' : 'disabled'}>Retomar</button></section>` : ''}
      ${activeReiki ? `<section class="section timer-card"><p class="eyebrow">Reiki ${activeReiki.status === 'PAUSED' ? 'pausado' : 'em andamento'}</p><div class="timer-value">${formatClock(reikiElapsedSeconds(activeReiki))}</div><button class="btn secondary wide" data-open-reiki="${activeReiki.id}">Abrir timer</button></section>` : ''}
      <section class="section"><div class="section-head"><h2>Novo trabalho</h2></div><div class="action-grid">
        <button class="action-card" data-action="investigate" ${assisted ? '' : 'disabled'}><strong>Investigar</strong><span>Perguntas e achados</span></button>
        <button class="action-card" data-action="treat-direct" ${assisted ? '' : 'disabled'}><strong>Tratar</strong><span>Plano longitudinal</span></button>
        <button class="action-card" data-action="reiki" ${assisted ? '' : 'disabled'}><strong>Reiki</strong><span>Timer e aplicação</span></button>
        <button class="action-card" data-action="add-note" ${assisted ? '' : 'disabled'}><strong>Anotar</strong><span>Registro rápido</span></button>
      </div></section>`}
    <section class="section"><div class="section-head"><h2>Timeline da sessão</h2><button class="btn ghost small" data-action="close-session">Encerrar</button></div>${timeline(events, state)}</section><div class="save-state">${esc(saveMessage)}</div></main>`;
}

function treatmentCard(item, state) {
  const assisted = assistedById(state, item.assistedEntityId); const components = treatmentComponents(state, item.id); const needs = treatmentNeedsReview(state, item);
  const next = components.filter((c) => c.expectedEndAt && c.status === TreatmentStatus.IN_PROGRESS).sort((a,b) => a.expectedEndAt.localeCompare(b.expectedEndAt))[0];
  return `<article class="card treatment-card"><div class="section-head"><div><p class="eyebrow">${esc(assisted?.displayName || 'Assistido')}</p><h2>${esc(item.title)}</h2></div><span class="status-pill status-${item.status.toLowerCase()}">${needs ? 'Revisão disponível' : treatmentLabels[item.status]}</span></div>
    <p class="muted">${components.length} ${components.length === 1 ? 'componente' : 'componentes'}${next?.expectedEndAt ? ` · ${needs ? 'Disponível desde' : 'Próxima revisão'} ${formatDateTime(next.expectedEndAt)}` : ''}</p>
    <div class="button-row">${item.status === TreatmentStatus.IN_PROGRESS ? `<button class="btn secondary small" data-review-treatment="${item.id}">Revisar</button><button class="btn danger small" data-interrupt-treatment="${item.id}">Interromper</button>` : ''}${item.status === TreatmentStatus.INTERRUPTED ? `<button class="btn primary small" data-resume-treatment="${item.id}">Retomar tratamento</button>` : ''}</div></article>`;
}

function treatmentsView(state) {
  const items = [...state.treatments].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return `<main><p class="eyebrow">Tratamentos</p><h1>Continuidade sem pressa.</h1><p class="lead">Tratamentos vivem além das sessões. Prazo atingido significa revisão disponível, não atraso.</p>
    <section class="section stack">${items.length ? items.map((item) => treatmentCard(item, state)).join('') : `<div class="empty">Nenhum tratamento criado ainda.</div>`}</section></main>`;
}

function assistedView(state) {
  const items = state.assistedEntities.filter((i) => !i.archivedAt).sort((a,b) => a.displayName.localeCompare(b.displayName));
  return `<main><p class="eyebrow">Assistidos</p><h1>Histórias que continuam.</h1><p class="lead">Cada assistido reúne sessões, investigações, tratamentos, Reiki e registros ao longo do tempo.</p>
    <section class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></section>
    <section class="section assisted-list">${items.length ? items.map((item) => `<button class="assisted-row row-button" data-assisted-detail="${item.id}"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><span class="muted">Ver histórico</span></button>`).join('') : `<div class="empty">Nenhum assistido cadastrado.</div>`}</section></main>`;
}

function libraryView() {
  return `<main><p class="eyebrow">Biblioteca</p><h1>Métodos como ferramentas.</h1><p class="lead">Protocolos são versionados para que uma investigação histórica nunca mude quando o método evoluir.</p>
    <section class="section card"><p class="eyebrow">Investigação</p><h2>${MVP_PROTOCOL.name}</h2><p class="muted">Versão ${MVP_PROTOCOL.version} · ${MVP_PROTOCOL.questions.length} perguntas · protocolo representativo do primeiro vertical slice.</p></section></main>`;
}

function preparationSheet(state) {
  const session = getOpenSession(state); if (!session) return '';
  let prep = latestPreparation(state, session.id); if (!prep) prep = startPreparation(store, session.id);
  const allDone = prep.steps.every((s) => s.completed);
  return `<div class="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><p class="eyebrow">Preparação da sessão</p><h2>Antes de começar</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Marque cada etapa conforme concluir. O progresso é salvo automaticamente.</p><div class="checklist">${prep.steps.map((step) => `<label class="check-row"><input type="checkbox" data-prep-step="${step.key}" ${step.completed ? 'checked' : ''}><span>${esc(step.label)}</span></label>`).join('')}</div><div class="section"><button class="btn primary wide" data-action="complete-preparation" ${allDone ? '' : 'disabled'}>Concluir preparação</button></div></section></div>`;
}

function assistedPickerSheet(state) {
  const items = state.assistedEntities.filter((i) => !i.archivedAt);
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Contexto da sessão</p><h2>Escolha um assistido</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>${items.length ? `<div class="assisted-list">${items.map((item) => `<div class="assisted-row"><div class="assisted-meta"><strong>${esc(item.displayName)}</strong><span>${assistedLabels[item.type]}</span></div><button class="btn secondary small" data-select-assisted="${item.id}">Usar</button></div>`).join('')}</div>` : `<div class="empty">Cadastre o primeiro assistido para começar.</div>`}<div class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></div></section></div>`;
}

function newAssistedSheet() {
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Novo assistido</p><h2>Identificação essencial</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="assisted-form" class="form-grid"><div class="field"><label>Tipo</label><select name="type">${Object.values(AssistedType).map((type) => `<option value="${type}">${assistedLabels[type]}</option>`).join('')}</select></div><div class="field"><label>Nome ou identificação</label><input name="displayName" required autocomplete="off" placeholder="Ex.: Maria Silva ou Família Silva"></div><div class="field"><label>Detalhes opcionais</label><textarea name="details" placeholder="Informações úteis para identificar este assistido"></textarea></div><button class="btn primary wide" type="submit">Criar assistido</button></form></section></div>`;
}

function noteSheet(state) {
  const session = getOpenSession(state); const assisted = assistedById(state, session?.currentAssistedEntityId);
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Anotar</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="note-form" class="form-grid"><div class="field"><label>Registro</label><textarea name="body" required placeholder="Algo importante desta sessão..."></textarea></div><button class="btn primary wide" type="submit">Adicionar à timeline</button></form></section></div>`;
}

function investigationSheet(state, investigationId) {
  const investigation = state.investigations.find((item) => item.id === investigationId); if (!investigation) return '';
  const assisted = assistedById(state, investigation.assistedEntityId);
  if (investigation.status === 'COMPLETED') {
    const yesAnswers = investigation.answers.filter((a) => a.answer === 'YES');
    const existing = state.findings.filter((f) => f.investigationId === investigation.id && f.status !== 'DISMISSED');
    return `<div class="modal-backdrop"><section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">Investigação concluída</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Respostas positivas não viram achados automaticamente. Confirme apenas o que deve entrar no registro.</p>
      <form id="findings-form" data-investigation="${investigation.id}" class="stack">${yesAnswers.length ? `<div class="checklist">${yesAnswers.map((a) => `<label class="check-row"><input type="checkbox" name="finding" value="${a.questionId}" ${existing.some((f) => f.sourceQuestionId === a.questionId) ? 'checked disabled' : ''}><span>${esc(a.questionTextSnapshot)}</span></label>`).join('')}</div>` : `<div class="empty">Nenhuma resposta “Sim” nesta investigação.</div>`}<button class="btn primary wide" type="submit">Confirmar achados</button></form></section></div>`;
  }
  const question = investigation.protocolSnapshot.questions[investigation.currentIndex];
  return `<div class="modal-backdrop"><section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(investigation.protocolSnapshot.name)} · ${investigation.currentIndex + 1}/${investigation.protocolSnapshot.questions.length}</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><div class="question-panel"><p class="muted">Consulte o pêndulo</p><h1>${esc(question.text)}</h1></div><div class="binary-actions"><button class="binary-btn" data-answer="YES" data-investigation="${investigation.id}">Sim</button><button class="binary-btn" data-answer="NO" data-investigation="${investigation.id}">Não</button></div><div class="save-state">Autosave ativo</div></section></div>`;
}

function treatmentFormSheet(state, findingIds = []) {
  const session = getOpenSession(state); const assisted = assistedById(state, session?.currentAssistedEntityId);
  const findings = state.findings.filter((f) => findingIds.includes(f.id));
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Novo tratamento</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div>${findings.length ? `<div class="notice">${findings.length} ${findings.length === 1 ? 'achado vinculado' : 'achados vinculados'} à origem deste tratamento.</div>` : `<p class="muted">Tratamentos podem ser criados diretamente, mesmo sem investigação anterior.</p>`}
    <form id="treatment-form" data-findings="${findingIds.join(',')}" class="form-grid section"><div class="field"><label>Objetivo / nome do tratamento</label><input name="title" required placeholder="Ex.: Reequilíbrio do tema prioritário"></div><div class="field"><label>Gráfico, ferramenta ou componente</label><input name="componentName" required placeholder="Nome do recurso"></div><div class="field"><label>Comando / orientação</label><textarea name="instructions" placeholder="Comando associado ao componente"></textarea></div><div class="duration-grid"><div class="field"><label>Duração</label><input name="durationValue" type="number" min="1" required inputmode="numeric"></div><div class="field"><label>Unidade</label><select name="durationUnit">${Object.entries(durationLabels).map(([key,label]) => `<option value="${key}">${label}</option>`).join('')}</select></div></div><button class="btn primary wide" type="submit">Iniciar tratamento</button></form></section></div>`;
}

function reviewTreatmentSheet(state, treatmentId) {
  const treatment = state.treatments.find((item) => item.id === treatmentId); const assisted = assistedById(state, treatment?.assistedEntityId);
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Revisão do tratamento</p><h2>${esc(treatment?.title || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">${esc(assisted?.displayName || '')}. Esta revisão envolve nova medição e, por isso, usa a sessão aberta.</p><form id="review-form" data-treatment="${treatmentId}" class="form-grid"><label class="check-row"><input type="checkbox" name="verifiedComplete"><span>O tratamento está 100% finalizado e posso desmontar os componentes</span></label><div class="field"><label>Desequilíbrio atual (%)</label><input name="imbalancePercent" type="number" min="0" max="100" step="5" inputmode="numeric" placeholder="Opcional"></div><div class="field"><label>Observações</label><textarea name="notes" placeholder="Resultado da revisão"></textarea></div><button class="btn primary wide" type="submit">Registrar revisão</button></form></section></div>`;
}

function reikiSheet(state, applicationId) {
  const app = state.reikiApplications.find((item) => item.id === applicationId); if (!app) return '';
  const assisted = assistedById(state, app.assistedEntityId); const elapsed = reikiElapsedSeconds(app);
  return `<div class="modal-backdrop"><section class="sheet timer-sheet"><div class="sheet-head"><div><p class="eyebrow">Reiki</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><div class="timer-value timer-large" data-live-timer="${app.id}">${formatClock(elapsed)}</div><p class="muted timer-status">${app.status === 'PAUSED' ? 'Pausado' : 'Em andamento'} · o tempo é reconstruído pelos horários, não por um contador volátil.</p><div class="button-row">${app.status === 'RUNNING' ? `<button class="btn secondary" data-pause-reiki="${app.id}">Pausar</button>` : `<button class="btn secondary" data-resume-reiki="${app.id}">Retomar</button>`}<button class="btn primary" data-finish-reiki="${app.id}">Concluir</button></div></section></div>`;
}

function finishReikiSheet(state, applicationId) {
  const app = state.reikiApplications.find((item) => item.id === applicationId); const assisted = assistedById(state, app?.assistedEntityId);
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Concluir Reiki</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><form id="finish-reiki-form" data-reiki="${applicationId}" class="form-grid"><div class="field"><label>Observações opcionais</label><textarea name="notes" placeholder="Registro da aplicação"></textarea></div><button class="btn primary wide" type="submit">Concluir aplicação</button></form></section></div>`;
}

function retrospectiveReikiSheet(state) {
  const items = state.assistedEntities.filter((i) => !i.archivedAt);
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Registro retrospectivo</p><h2>Aplicação de Reiki</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Use para registrar uma aplicação já realizada. Não cria uma medição radiestésica fora de sessão.</p><form id="reiki-retro-form" class="form-grid"><div class="field"><label>Assistido</label><select name="assistedEntityId" required><option value="">Selecione</option>${items.map((i) => `<option value="${i.id}">${esc(i.displayName)}</option>`).join('')}</select></div><div class="field"><label>Término da aplicação</label><input name="occurredAt" type="datetime-local" value="${localNow}" required></div><div class="field"><label>Duração em minutos</label><input name="durationMinutes" type="number" min="1" required inputmode="numeric"></div><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><button class="btn primary wide" type="submit">Registrar aplicação</button></form></section></div>`;
}

function assistedDetailSheet(state, assistedEntityId) {
  const assisted = assistedById(state, assistedEntityId); if (!assisted) return '';
  const events = state.events.filter((e) => e.assistedEntityId === assisted.id).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  const treatments = state.treatments.filter((t) => t.assistedEntityId === assisted.id && t.status !== TreatmentStatus.COMPLETED);
  const investigations = state.investigations.filter((i) => i.assistedEntityId === assisted.id && i.status === 'IN_PROGRESS');
  return `<div class="modal-backdrop"><section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">${assistedLabels[assisted.type]}</p><h2>${esc(assisted.displayName)}</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><div class="metric-grid"><div class="metric"><strong>${treatments.length}</strong><span>tratamentos ativos</span></div><div class="metric"><strong>${investigations.length}</strong><span>investigações abertas</span></div></div><section class="section"><h3>Histórico longitudinal</h3><div class="section">${timeline(events, state)}</div></section></section></div>`;
}

function closeSessionSheet(state) {
  const session = getOpenSession(state); const unfinished = state.investigations.filter((i) => i.status === 'IN_PROGRESS' && i.currentSessionId === session?.id);
  const activeTreatments = state.treatments.filter((t) => t.status === TreatmentStatus.IN_PROGRESS).length;
  return `<div class="modal-backdrop"><section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Encerramento seguro</p><h2>Fechar esta janela de trabalho</h2></div><button class="close-btn" data-action="dismiss-sheet">×</button></div><p class="muted">Tratamentos ativos continuam normalmente após o encerramento.</p>${unfinished.length ? `<div class="notice">${unfinished.length} ${unfinished.length === 1 ? 'investigação ficará' : 'investigações ficarão'} em andamento e poderá ser retomada em uma próxima sessão.</div>` : ''}${activeTreatments ? `<p class="muted">${activeTreatments} ${activeTreatments === 1 ? 'tratamento longitudinal ativo permanece' : 'tratamentos longitudinais ativos permanecem'} fora desta sessão.</p>` : ''}<form id="close-session-form" class="form-grid section"><label class="check-row"><input type="checkbox" name="confirmed" required><span>Concluí meu procedimento de encerramento e estou pronta para fechar esta sessão</span></label><button class="btn primary wide" type="submit">Encerrar sessão</button><button class="btn secondary wide" type="button" data-action="dismiss-sheet">Continuar trabalhando</button></form></section></div>`;
}

function renderSheet(state) {
  if (!sheet) return '';
  if (sheet.type === 'preparation') return preparationSheet(state);
  if (sheet.type === 'assisted-picker') return assistedPickerSheet(state);
  if (sheet.type === 'new-assisted') return newAssistedSheet();
  if (sheet.type === 'note') return noteSheet(state);
  if (sheet.type === 'investigation') return investigationSheet(state, sheet.id);
  if (sheet.type === 'treatment-form') return treatmentFormSheet(state, sheet.findingIds || []);
  if (sheet.type === 'review-treatment') return reviewTreatmentSheet(state, sheet.id);
  if (sheet.type === 'reiki') return reikiSheet(state, sheet.id);
  if (sheet.type === 'finish-reiki') return finishReikiSheet(state, sheet.id);
  if (sheet.type === 'reiki-retro') return retrospectiveReikiSheet(state);
  if (sheet.type === 'assisted-detail') return assistedDetailSheet(state, sheet.id);
  if (sheet.type === 'close-session') return closeSessionSheet(state);
  return '';
}

function render() {
  saveRoutePreference(route);
  const state = store.getState();
  if (timerTick) { clearInterval(timerTick); timerTick = null; }
  const views = { today: todayView, treatments: treatmentsView, assisted: assistedView, library: libraryView };
  root.innerHTML = `${topbar(state)}${views[route](state)}${nav()}${renderSheet(state)}`;
  if (sheet?.type === 'reiki') {
    timerTick = setInterval(() => {
      const current = store.getState().reikiApplications.find((item) => item.id === sheet?.id);
      const node = document.querySelector('[data-live-timer]');
      if (current && node && current.status === 'RUNNING') node.textContent = formatClock(reikiElapsedSeconds(current));
    }, 1000);
  }
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if (button.dataset.route) { route = button.dataset.route; sheet = null; render(); return; }
    const action = button.dataset.action;
    const state = store.getState(); const session = getOpenSession(state);
    if (action === 'start-session') { startSession(store); sheet = { type:'preparation' }; render(); return; }
    if (action === 'open-preparation') { sheet = { type:'preparation' }; render(); return; }
    if (action === 'complete-preparation') { const prep = latestPreparation(state, session.id); completePreparation(store, prep.id); sheet = null; setSaved('Preparação concluída'); return; }
    if (action === 'choose-assisted') { sheet = { type:'assisted-picker' }; render(); return; }
    if (action === 'new-assisted') { sheet = { type:'new-assisted' }; render(); return; }
    if (action === 'add-note') { sheet = { type:'note' }; render(); return; }
    if (action === 'dismiss-sheet') { sheet = null; render(); return; }
    if (action === 'close-session') { sheet = { type:'close-session' }; render(); return; }
    if (action === 'investigate') {
      const active = state.investigations.filter((i) => i.assistedEntityId === session.currentAssistedEntityId && i.status === 'IN_PROGRESS').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (active) resumeInvestigation(store, active.id, session.id);
      const inv = active || startInvestigation(store, session.id, session.currentAssistedEntityId); sheet = { type:'investigation', id:inv.id }; render(); return;
    }
    if (action === 'resume-latest-investigation') {
      const active = state.investigations.filter((i) => i.assistedEntityId === session.currentAssistedEntityId && i.status === 'IN_PROGRESS').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (active) { resumeInvestigation(store, active.id, session.id); sheet = { type:'investigation', id:active.id }; render(); } return;
    }
    if (action === 'treat-direct') { sheet = { type:'treatment-form', findingIds:[] }; render(); return; }
    if (action === 'reiki') { const app = startReiki(store, session.id, session.currentAssistedEntityId); sheet = { type:'reiki', id:app.id }; render(); return; }
    if (action === 'reiki-retro') { sheet = { type:'reiki-retro' }; render(); return; }

    if (button.dataset.selectAssisted) { selectAssistedForSession(store, session.id, button.dataset.selectAssisted); sheet = null; setSaved('Assistido selecionado'); return; }
    if (button.dataset.answer) { answerInvestigation(store, button.dataset.investigation, button.dataset.answer); render(); return; }
    if (button.dataset.openReiki) { sheet = { type:'reiki', id:button.dataset.openReiki }; render(); return; }
    if (button.dataset.pauseReiki) { pauseReiki(store, button.dataset.pauseReiki); render(); return; }
    if (button.dataset.resumeReiki) { resumeReiki(store, button.dataset.resumeReiki); render(); return; }
    if (button.dataset.finishReiki) { sheet = { type:'finish-reiki', id:button.dataset.finishReiki }; render(); return; }
    if (button.dataset.assistedDetail) { sheet = { type:'assisted-detail', id:button.dataset.assistedDetail }; render(); return; }
    if (button.dataset.interruptTreatment) { interruptTreatment(store, button.dataset.interruptTreatment); setSaved('Tratamento interrompido'); return; }
    if (button.dataset.resumeTreatment) { resumeTreatment(store, button.dataset.resumeTreatment); setSaved('Tratamento retomado'); return; }
    if (button.dataset.reviewTreatment) {
      const current = store.getState(); const open = getOpenSession(current);
      if (!open) { startSession(store); route = 'today'; sheet = { type:'preparation' }; render(); return; }
      if (!isPrepared(current, open.id)) { route = 'today'; sheet = { type:'preparation' }; render(); return; }
      const treatment = current.treatments.find((t) => t.id === button.dataset.reviewTreatment);
      selectAssistedForSession(store, open.id, treatment.assistedEntityId); sheet = { type:'review-treatment', id:treatment.id }; render(); return;
    }
  } catch (error) { alert(error.message); }
});

root.addEventListener('change', (event) => {
  if (event.target.matches('[data-prep-step]')) {
    const state = store.getState(); const session = getOpenSession(state); const prep = latestPreparation(state, session.id);
    togglePreparationStep(store, prep.id, event.target.dataset.prepStep); render();
  }
});

root.addEventListener('submit', (event) => {
  event.preventDefault(); const form = event.target; const data = new FormData(form);
  try {
    if (form.id === 'assisted-form') {
      const entity = createAssistedEntity(store, { type:data.get('type'), displayName:data.get('displayName'), details:data.get('details') });
      const session = getOpenSession(store.getState()); if (session) selectAssistedForSession(store, session.id, entity.id);
      sheet = null; setSaved('Assistido criado'); return;
    }
    if (form.id === 'note-form') {
      const state = store.getState(); const session = getOpenSession(state); addSessionNote(store, session.id, session.currentAssistedEntityId, data.get('body')); sheet = null; setSaved('Anotação registrada'); return;
    }
    if (form.id === 'findings-form') {
      const ids = data.getAll('finding'); const created = confirmFindings(store, form.dataset.investigation, ids);
      sheet = created.length ? { type:'treatment-form', findingIds:created.map((f) => f.id) } : null; setSaved(created.length ? 'Achados confirmados' : 'Investigação registrada'); return;
    }
    if (form.id === 'treatment-form') {
      const state = store.getState(); const session = getOpenSession(state);
      createTreatment(store, { sessionId:session.id, assistedEntityId:session.currentAssistedEntityId, findingIds:(form.dataset.findings || '').split(',').filter(Boolean), title:data.get('title'), componentName:data.get('componentName'), instructions:data.get('instructions'), durationValue:data.get('durationValue'), durationUnit:data.get('durationUnit') });
      sheet = null; setSaved('Tratamento iniciado'); return;
    }
    if (form.id === 'review-form') {
      const session = getOpenSession(store.getState());
      reviewTreatment(store, { treatmentId:form.dataset.treatment, sessionId:session.id, verifiedComplete:data.get('verifiedComplete') === 'on', imbalancePercent:data.get('imbalancePercent'), notes:data.get('notes') });
      sheet = null; route = 'treatments'; setSaved('Revisão registrada'); return;
    }
    if (form.id === 'finish-reiki-form') { completeReiki(store, form.dataset.reiki, data.get('notes')); sheet = null; setSaved('Aplicação de Reiki concluída'); return; }
    if (form.id === 'reiki-retro-form') {
      const occurredAt = new Date(data.get('occurredAt')).toISOString();
      recordReikiRetrospective(store, { assistedEntityId:data.get('assistedEntityId'), occurredAt, durationMinutes:data.get('durationMinutes'), notes:data.get('notes') });
      sheet = null; setSaved('Aplicação registrada'); return;
    }
    if (form.id === 'close-session-form') {
      if (data.get('confirmed') !== 'on') return;
      const session = getOpenSession(store.getState()); closeSession(store, session.id, { confirmation:'Procedimento de encerramento confirmado pela terapeuta' });
      sheet = null; route = 'today'; setSaved('Sessão encerrada'); return;
    }
  } catch (error) { alert(error.message); }
});

store.subscribe(() => { if (!sheet || sheet.type !== 'preparation') render(); });
render();
