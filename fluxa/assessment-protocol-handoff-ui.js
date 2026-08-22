import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { ensureRootProtocolCatalog, rootProtocolCatalog, activeRootProtocol } from './legacy-protocol-adapter.js';
import { ORIENTING_ASSESSMENT_AREAS, recordOrientingAssessment, linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';

const store = createStore();
let assessmentId = null;
let enhancing = false;

function esc(value='') { return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function close(id) { document.querySelector(id)?.remove(); }
function currentContext() {
  const state = store.getState();
  const session = getOpenSession(state);
  const assisted = state.assistedEntities.find((item) => item.id === session?.currentAssistedEntityId && !item.archivedAt);
  return { state, session, assisted };
}
function prepared(session, state) { return Boolean(session && latestPreparation(state, session.id)?.status === 'COMPLETED'); }

function injectAssessmentEntry() {
  if (enhancing) return;
  const overlay = document.querySelector('#investigation-chooser-overlay');
  const featured = overlay?.querySelector('.featured-protocol-grid');
  if (!featured || featured.querySelector('[data-open-orienting-assessment]')) return;
  enhancing = true;
  try {
    const card = document.createElement('article');
    card.className = 'featured-protocol assessment';
    card.innerHTML = `<p class="eyebrow">Escolha assistida</p><h3>Avaliação orientadora</h3><p>Registre quais áreas pedem atenção e receba sugestões de protocolos sem iniciar nada automaticamente.</p><button class="btn secondary" data-open-orienting-assessment>Avaliar e escolher protocolo</button>`;
    featured.prepend(card);
    featured.classList.add('with-assessment');
  } finally { enhancing = false; }
}

function assessmentDialog() {
  close('#orienting-assessment-overlay');
  const { state, session, assisted } = currentContext();
  if (!session) { alert('Abra uma sessão antes de fazer a avaliação orientadora.'); return; }
  if (!prepared(session, state)) { alert('Conclua a preparação da sessão antes de fazer a avaliação orientadora.'); return; }
  if (!assisted) { alert('Escolha o Assistido antes de fazer a avaliação orientadora.'); return; }
  const wrap = document.createElement('div');
  wrap.id = 'orienting-assessment-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet orienting-assessment-sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliação orientadora</p><h2>Qual área pede mais atenção agora?</h2><p class="muted">${esc(assisted.displayName)}</p></div><button class="close-btn" data-close-orienting-assessment>×</button></div>
    <p class="muted">Use esta etapa apenas para organizar a escolha do protocolo. Uma área marcada não é registrada como causa e nenhuma investigação será iniciada sem sua escolha.</p>
    <form id="orienting-assessment-form" data-session="${esc(session.id)}" data-assisted="${esc(assisted.id)}" class="form-grid">
      <fieldset class="assessment-area-fieldset"><legend>Áreas observadas</legend><div class="assessment-area-grid">${ORIENTING_ASSESSMENT_AREAS.map((area) => `<label class="assessment-area-option ${area.id === 'unclear' ? 'unclear' : ''}"><input type="checkbox" name="focusArea" value="${esc(area.id)}"><span>${esc(area.label)}</span></label>`).join('')}</div></fieldset>
      <div class="field"><label>Observações <span class="muted">opcional</span></label><textarea name="notes" placeholder="Contexto que você quer preservar no histórico desta avaliação"></textarea></div>
      <button class="btn primary wide" type="submit">Ver protocolos sugeridos</button>
    </form></section>`;
  document.body.appendChild(wrap);
}

function suggestionDialog(assessment) {
  close('#orienting-assessment-overlay');
  close('#assessment-suggestions-overlay');
  assessmentId = assessment.id;
  const wrap = document.createElement('div');
  wrap.id = 'assessment-suggestions-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet assessment-suggestions-sheet"><div class="sheet-head"><div><p class="eyebrow">Próximo passo</p><h2>Protocolos sugeridos</h2></div><button class="close-btn" data-close-assessment-suggestions>×</button></div>
    <p class="muted">As sugestões refletem apenas as áreas registradas nesta avaliação. Escolha uma investigação, volte ao catálogo completo ou retorne à sessão.</p>
    <div class="assessment-suggestion-list">${assessment.protocolSuggestions.map((item, index) => `<article class="assessment-suggestion-card ${index === 0 ? 'primary-suggestion' : ''}"><div><p class="eyebrow">${esc(item.category)}</p><h3>${esc(item.protocolName)}</h3><p class="muted">Relacionado a: ${esc(item.reason)}</p></div><button class="btn ${index === 0 ? 'primary' : 'secondary'}" data-assessment-start-protocol="${esc(item.protocolId)}" data-assessment-protocol-name="${esc(item.protocolName)}">${activeRootProtocol(item.protocolId, assessment.assistedEntityId) ? 'Retomar protocolo' : 'Iniciar protocolo'}</button></article>`).join('')}</div>
    <div class="assessment-handoff-actions"><button class="btn secondary wide" data-assessment-open-catalog>Ver catálogo completo</button><button class="btn ghost wide" data-close-assessment-suggestions>Voltar à sessão</button></div>
  </section>`;
  document.body.appendChild(wrap);
}

async function submitAssessment(form) {
  const catalog = await ensureRootProtocolCatalog();
  const data = new FormData(form);
  const assessment = recordOrientingAssessment(store, {
    sessionId: form.dataset.session,
    assistedEntityId: form.dataset.assisted,
    focusAreas: data.getAll('focusArea'),
    notes: data.get('notes')
  }, catalog);
  suggestionDialog(assessment);
}

function startSuggestedProtocol(button) {
  const protocolId = button.dataset.assessmentStartProtocol;
  const protocolName = button.dataset.assessmentProtocolName;
  const { session } = currentContext();
  const selectedAssessmentId = assessmentId;
  close('#assessment-suggestions-overlay');
  if (!protocolId || !session || !selectedAssessmentId) return;
  const proxy = document.createElement('button');
  proxy.hidden = true;
  proxy.dataset.startRootProtocol = protocolId;
  document.body.appendChild(proxy);
  proxy.click();
  proxy.remove();
  const investigation = activeRootProtocol(protocolId, session.currentAssistedEntityId)
    || [...(store.getState().investigations || [])].reverse().find((item) => item.kind === 'ROOT_PROTOCOL' && item.protocolId === protocolId && item.assistedEntityId === session.currentAssistedEntityId);
  linkOrientingAssessmentToProtocol(store, selectedAssessmentId, { protocolId, protocolName, investigationId:investigation?.id || null });
  assessmentId = null;
}

new MutationObserver(() => queueMicrotask(injectAssessmentEntry)).observe(document.body, { childList:true, subtree:true });
window.addEventListener('fluxa:root-protocols-ready', () => queueMicrotask(injectAssessmentEntry));
queueMicrotask(injectAssessmentEntry);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.openOrientingAssessment !== undefined) { document.querySelector('#investigation-chooser-overlay')?.remove(); assessmentDialog(); return; }
  if (button.dataset.closeOrientingAssessment !== undefined) { close('#orienting-assessment-overlay'); return; }
  if (button.dataset.closeAssessmentSuggestions !== undefined) { close('#assessment-suggestions-overlay'); assessmentId = null; return; }
  if (button.dataset.assessmentStartProtocol) { startSuggestedProtocol(button); return; }
  if (button.dataset.assessmentOpenCatalog !== undefined) {
    close('#assessment-suggestions-overlay'); assessmentId = null;
    document.querySelector('[data-action="investigate"]')?.click();
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'orienting-assessment-form') return;
  event.preventDefault();
  submitAssessment(form).catch((error) => alert(error.message));
});
