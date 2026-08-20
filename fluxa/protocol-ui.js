import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import {
  PROTOCOL_LIBRARY, startBranchingInvestigation, answerBranchingInvestigation,
  currentProtocolNode, confirmBranchingFindings
} from './protocol-engine.js';

const store = createStore();
let activeId = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function preparedSession() {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session) return null;
  if (latestPreparation(state, session.id)?.status !== 'COMPLETED') return null;
  return session;
}

function ensureLibraryCards() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('.eyebrow')?.textContent?.trim() !== 'Biblioteca') return;
  if (main.querySelector('[data-branching-library]')) return;
  const section = document.createElement('section');
  section.className = 'section stack';
  section.dataset.branchingLibrary = 'true';
  section.innerHTML = `<div class="section-head"><div><p class="eyebrow">Protocolos versionados</p><h2>Investigações ramificadas</h2></div></div>${PROTOCOL_LIBRARY.map((protocol) => `<article class="card"><p class="eyebrow">${esc(protocol.category)}</p><h2>${esc(protocol.name)}</h2><p class="muted">${esc(protocol.description)} · versão ${protocol.version}</p><button class="btn secondary wide" data-start-branching="${protocol.id}">Iniciar protocolo</button></article>`).join('')}`;
  main.appendChild(section);
}

function renderDialog() {
  document.querySelector('#protocol-overlay')?.remove();
  if (!activeId) return;
  const state = store.getState();
  const investigation = state.investigations.find((item) => item.id === activeId);
  if (!investigation) { activeId = null; return; }
  const assisted = state.assistedEntities.find((item) => item.id === investigation.assistedEntityId);
  const node = currentProtocolNode(investigation);
  const wrap = document.createElement('div');
  wrap.id = 'protocol-overlay';
  wrap.className = 'modal-backdrop';

  if (investigation.status === 'COMPLETED') {
    const yes = investigation.answers.filter((item) => item.answer === 'YES');
    wrap.innerHTML = `<section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(investigation.protocolSnapshot.name)} concluída</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-close-protocol>×</button></div><section class="card soft"><p class="eyebrow">Resultado do caminho</p><h2>${esc(node?.title || 'Investigação concluída')}</h2><p class="muted">${esc(node?.summary || '')}</p></section><form id="branch-findings-form" data-investigation="${investigation.id}" class="form-grid section"><p class="muted">Confirme somente respostas positivas que realmente devem virar achados. Elas não serão classificadas automaticamente como causa.</p>${yes.length ? `<div class="checklist">${yes.map((item) => `<label class="check-row"><input type="checkbox" name="finding" value="${item.nodeId}"><span>${esc(item.questionTextSnapshot)}</span></label>`).join('')}</div><div class="field"><label>Classificação dos itens confirmados</label><select name="classification"><option value="FACTOR_RELEVANT">Fator relevante</option><option value="CAUSE">Causa</option><option value="MAINTAINER">Mantenedor</option><option value="CONSEQUENCE">Consequência</option><option value="ASSOCIATION">Associação</option><option value="DEEPEN">Item a aprofundar</option></select></div>` : `<div class="empty">Este caminho não possui respostas positivas para consolidar.</div>`}<button class="btn primary wide" type="submit">Concluir e registrar</button></form></section>`;
  } else {
    wrap.innerHTML = `<section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(investigation.protocolSnapshot.name)}</p><h2>${esc(assisted?.displayName || '')}</h2></div><button class="close-btn" data-close-protocol>×</button></div><div class="question-panel"><p class="muted">Consulte o pêndulo</p><h1>${esc(node?.text || '')}</h1></div><div class="binary-actions"><button class="binary-btn" data-branch-answer="YES">Sim</button><button class="binary-btn" data-branch-answer="NO">Não</button></div><div class="save-state">Autosave ativo · versão ${investigation.protocolSnapshot.version}</div></section>`;
  }
  document.body.appendChild(wrap);
}

const observer = new MutationObserver(ensureLibraryCards);
observer.observe(document.querySelector('#app'), { childList:true, subtree:true });
queueMicrotask(ensureLibraryCards);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.closeProtocol !== undefined) {
    document.querySelector('#protocol-overlay')?.remove();
    activeId = null;
    return;
  }
  if (button.dataset.startBranching) {
    const session = preparedSession();
    if (!session) {
      alert('Abra e conclua a preparação de uma sessão antes de iniciar uma investigação.');
      document.querySelector('[data-route="today"]')?.click();
      return;
    }
    if (!session.currentAssistedEntityId) {
      alert('Selecione um assistido no workspace antes de iniciar o protocolo.');
      document.querySelector('[data-route="today"]')?.click();
      return;
    }
    const investigation = startBranchingInvestigation(store, session.id, session.currentAssistedEntityId, button.dataset.startBranching);
    activeId = investigation.id;
    renderDialog();
    return;
  }
  if (button.dataset.branchAnswer) {
    answerBranchingInvestigation(store, activeId, button.dataset.branchAnswer);
    renderDialog();
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'branch-findings-form') return;
  event.preventDefault();
  const data = new FormData(form);
  try {
    confirmBranchingFindings(store, form.dataset.investigation, data.getAll('finding'), data.get('classification'));
    document.querySelector('#protocol-overlay')?.remove();
    activeId = null;
    alert('Investigação registrada no histórico do assistido.');
  } catch (error) { alert(error.message); }
});
