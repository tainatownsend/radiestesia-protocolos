import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';
import { ensureRootProtocolCatalog, activeRootProtocol } from './legacy-protocol-adapter.js';
import { ORIENTING_ASSESSMENT_AREAS, recordOrientingAssessment, linkOrientingAssessmentToProtocol } from './assessment-protocol-handoff.js';
import { hawkinsBaseline, recordHawkinsBaseline } from './hawkins-measurement.js';

const store = createStore();
let assessmentId = null;
let sourceAssessmentId = null;
let enhancing = false;
let generalAssessmentBefore = null;

function esc(value='') { return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function close(id) { document.querySelector(id)?.remove(); }
function currentContext() {
  const state = store.getState();
  const session = getOpenSession(state);
  const assisted = state.assistedEntities.find((item) => item.id === session?.currentAssistedEntityId && !item.archivedAt);
  return { state, session, assisted };
}
function prepared(session, state) { return Boolean(session && latestPreparation(state, session.id)?.status === 'COMPLETED'); }
function currentHawkinsBaseline(){const {state,session,assisted}=currentContext();return session&&assisted?hawkinsBaseline(state,session.id,assisted.id):null;}

function injectAssessmentEntry() {
  if (enhancing) return;
  const overlay = document.querySelector('#investigation-chooser-overlay');
  const featured = overlay?.querySelector('.featured-protocol-grid');
  if (!featured || featured.querySelector('[data-open-orienting-assessment]')) return;
  enhancing = true;
  try {
    const card = document.createElement('article');
    card.className = 'featured-protocol assessment';
    card.innerHTML = `<p class="eyebrow">Avaliar</p><h3>Avaliação orientadora</h3><p>Registre uma medição ou escolha áreas que pedem atenção para chegar ao protocolo adequado sem iniciar nada automaticamente.</p><div class="assessment-featured-actions"><button class="btn primary" data-open-orienting-assessment>Escolher protocolo</button><button class="btn secondary" data-open-general-assessment-from-catalog>Registrar medição</button></div>`;
    featured.prepend(card);
    featured.classList.add('with-assessment');
  } finally { enhancing = false; }
}

function assessmentDialog(sourceId = null) {
  close('#orienting-assessment-overlay');
  sourceAssessmentId = sourceId || null;
  const { state, session, assisted } = currentContext();
  if (!session) { alert('Abra uma sessão antes de fazer a avaliação orientadora.'); sourceAssessmentId = null; return; }
  if (!prepared(session, state)) { alert('Conclua a preparação da sessão antes de fazer a avaliação orientadora.'); sourceAssessmentId = null; return; }
  if (!assisted) { alert('Escolha o Assistido antes de fazer a avaliação orientadora.'); sourceAssessmentId = null; return; }
  const source = sourceAssessmentId ? (state.assessments || []).find((item) => item.id === sourceAssessmentId) : null;
  if (sourceAssessmentId && (!source || source.sessionId !== session.id || source.assistedEntityId !== assisted.id)) {
    sourceAssessmentId = null;
    alert('Esta medição pertence a outra sessão ou Assistido. Registre uma nova medição no atendimento atual antes de usá-la para escolher um protocolo.');
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'orienting-assessment-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet orienting-assessment-sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliação orientadora</p><h2>Qual área pede mais atenção agora?</h2><p class="muted">${esc(assisted.displayName)}</p></div><button class="close-btn" data-close-orienting-assessment>×</button></div>
    ${source ? `<div class="assessment-source-note"><strong>Medição registrada</strong><span>${esc(source.subject)} · ${esc(source.result)}${source.scale ? ` ${esc(source.scale)}` : ''}</span></div>` : ''}
    <p class="muted">Use esta etapa apenas para organizar a escolha do protocolo. A medição e as áreas marcadas não são registradas como causa e nenhuma investigação será iniciada sem sua escolha.</p>
    <form id="orienting-assessment-form" data-session="${esc(session.id)}" data-assisted="${esc(assisted.id)}" data-source-assessment="${esc(sourceAssessmentId || '')}" class="form-grid">
      <fieldset class="assessment-area-fieldset"><legend>Áreas observadas</legend><div class="assessment-area-grid">${ORIENTING_ASSESSMENT_AREAS.map((area) => `<label class="assessment-area-option ${area.id === 'unclear' ? 'unclear' : ''}"><input type="checkbox" name="focusArea" value="${esc(area.id)}"><span>${esc(area.label)}</span></label>`).join('')}</div></fieldset>
      <div class="field"><label>Observações <span class="muted">opcional</span></label><textarea name="notes" placeholder="Contexto que você quer preservar no histórico desta avaliação"></textarea></div>
      <button class="btn primary wide" type="submit">Ver protocolos sugeridos</button>
    </form></section>`;
  document.body.appendChild(wrap);
}

function generalAssessmentHandoff(assessment) {
  close('#general-assessment-handoff-overlay');
  const wrap = document.createElement('div');
  wrap.id = 'general-assessment-handoff-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet assessment-suggestions-sheet"><div class="sheet-head"><div><p class="eyebrow">Avaliação registrada</p><h2>${esc(assessment.subject)}</h2></div><button class="close-btn" data-close-general-assessment-handoff>×</button></div><div class="assessment-source-note"><strong>Resultado</strong><span>${esc(assessment.result)}${assessment.scale ? ` ${esc(assessment.scale)}` : ''}</span></div><p class="muted">Se esta medição apontou uma área que precisa ser investigada, você pode escolher o protocolo agora. O Fluxa não interpreta o valor nem define a causa automaticamente.</p><div class="assessment-handoff-actions"><button class="btn primary wide" data-general-assessment-to-protocol="${esc(assessment.id)}">Escolher protocolo</button><button class="btn ghost wide" data-close-general-assessment-handoff>Voltar à sessão</button></div></section>`;
  document.body.appendChild(wrap);
}

function suggestionDialog(assessment) {
  close('#orienting-assessment-overlay');
  close('#assessment-suggestions-overlay');
  sourceAssessmentId = null;
  assessmentId = assessment.id;
  const {session,assisted}=currentContext();
  const baseline=currentHawkinsBaseline();
  const baselineBlock=baseline?`<section class="assessment-source-note" data-assessment-hawkins-ready><strong>Frequência inicial de Hawkins</strong><span>${esc(baseline.hertz)} Hz · registrada nesta sessão</span></section>`:(session&&assisted?`<section class="hawkins-measurement-card compact" data-assessment-hawkins-required><div><p class="eyebrow">Antes de iniciar</p><strong>Frequência vibracional de Hawkins</strong><p>Registre a medição inicial obrigatória em Hz para seguir ao protocolo.</p></div><form id="assessment-hawkins-baseline-form" data-session="${esc(session.id)}" data-assisted="${esc(assisted.id)}"><label><span>Frequência</span><span class="hawkins-input"><input name="hertz" type="number" min="0.01" step="any" inputmode="decimal" required placeholder="Ex.: 540"><b>Hz</b></span></label><button class="btn primary" type="submit">Registrar</button></form></section>`:'');
  const wrap = document.createElement('div');
  wrap.id = 'assessment-suggestions-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet assessment-suggestions-sheet"><div class="sheet-head"><div><p class="eyebrow">Próximo passo</p><h2>Protocolos sugeridos</h2></div><button class="close-btn" data-close-assessment-suggestions>×</button></div>
    <p class="muted">As sugestões refletem apenas as áreas registradas nesta avaliação. Escolha uma investigação, volte ao catálogo completo ou retorne à sessão.</p>
    ${baselineBlock}
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
    sourceAssessmentId: form.dataset.sourceAssessment || null,
    focusAreas: data.getAll('focusArea'),
    notes: data.get('notes')
  }, catalog);
  suggestionDialog(assessment);
}

function restoreSuggestionAfterFailedStart(selectedAssessmentId,message){
  close('#root-protocol-overlay');
  const assessment=(store.getState().assessments||[]).find((item)=>item.id===selectedAssessmentId&&item.kind==='ORIENTING');
  if(assessment)suggestionDialog(assessment);else assessmentId=null;
  alert(message);
}

function startSuggestedProtocol(button) {
  const protocolId = button.dataset.assessmentStartProtocol;
  const protocolName = button.dataset.assessmentProtocolName;
  const { session } = currentContext();
  const selectedAssessmentId = assessmentId;
  if (!protocolId || !session || !selectedAssessmentId) return;
  const selectedAssessment=(store.getState().assessments||[]).find((item)=>item.id===selectedAssessmentId&&item.kind==='ORIENTING');
  if(!selectedAssessment){assessmentId=null;alert('A avaliação orientadora não está mais disponível. Refaça a avaliação antes de iniciar o protocolo.');return;}
  if(selectedAssessment.sessionId!==session.id||selectedAssessment.assistedEntityId!==session.currentAssistedEntityId){
    close('#assessment-suggestions-overlay');
    assessmentId=null;
    alert('Esta avaliação pertence a outra sessão ou Assistido. Refaça a avaliação no contexto atual antes de iniciar um protocolo.');
    return;
  }
  if(!currentHawkinsBaseline()){
    alert('Registre a frequência vibracional de Hawkins em Hz antes de iniciar o protocolo.');
    document.querySelector('#assessment-hawkins-baseline-form [name="hertz"]')?.focus();
    return;
  }
  close('#assessment-suggestions-overlay');
  const proxy = document.createElement('button');
  proxy.hidden = true;
  proxy.dataset.startRootProtocol = protocolId;
  document.body.appendChild(proxy);
  proxy.click();
  proxy.remove();
  const investigation = activeRootProtocol(protocolId, session.currentAssistedEntityId)
    || [...(store.getState().investigations || [])].reverse().find((item) => item.kind === 'ROOT_PROTOCOL' && item.protocolId === protocolId && item.assistedEntityId === session.currentAssistedEntityId);
  if(!investigation){restoreSuggestionAfterFailedStart(selectedAssessmentId,'Não foi possível iniciar o protocolo agora. As sugestões foram preservadas para você tentar novamente.');return;}
  try{
    linkOrientingAssessmentToProtocol(store, selectedAssessmentId, { protocolId, protocolName, investigationId:investigation.id });
    assessmentId = null;
  }catch(error){
    restoreSuggestionAfterFailedStart(selectedAssessmentId,error.message||'Não foi possível vincular o protocolo à avaliação. As sugestões foram preservadas.');
  }
}

function openGeneralAssessmentFromCatalog() {
  document.querySelector('#investigation-chooser-overlay')?.remove();
  const nativeAction = document.querySelector('[data-general-assessment]');
  if (!nativeAction) { alert('A avaliação por medição ainda não está disponível nesta tela.'); return; }
  nativeAction.click();
}

new MutationObserver(() => queueMicrotask(injectAssessmentEntry)).observe(document.body, { childList:true, subtree:true });
window.addEventListener('fluxa:root-protocols-ready', () => queueMicrotask(injectAssessmentEntry));
queueMicrotask(injectAssessmentEntry);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.openOrientingAssessment !== undefined) { document.querySelector('#investigation-chooser-overlay')?.remove(); assessmentDialog(); return; }
  if (button.dataset.openGeneralAssessmentFromCatalog !== undefined) { openGeneralAssessmentFromCatalog(); return; }
  if (button.dataset.closeOrientingAssessment !== undefined) { close('#orienting-assessment-overlay'); sourceAssessmentId = null; return; }
  if (button.dataset.closeGeneralAssessmentHandoff !== undefined) { close('#general-assessment-handoff-overlay'); return; }
  if (button.dataset.generalAssessmentToProtocol) { const id = button.dataset.generalAssessmentToProtocol; close('#general-assessment-handoff-overlay'); assessmentDialog(id); return; }
  if (button.dataset.closeAssessmentSuggestions !== undefined) { close('#assessment-suggestions-overlay'); assessmentId = null; return; }
  if (button.dataset.assessmentStartProtocol) { startSuggestedProtocol(button); return; }
  if (button.dataset.assessmentOpenCatalog !== undefined) {
    close('#assessment-suggestions-overlay'); assessmentId = null;
    document.querySelector('[data-action="investigate"]')?.click();
  }
}, true);

// Capture the assessment IDs before the existing general-assessment submit handler writes the new record.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'general-assessment-form') return;
  generalAssessmentBefore = new Set((store.getState().assessments || []).map((item) => item.id));
  queueMicrotask(() => {
    const created = [...(store.getState().assessments || [])].reverse().find((item) => item.kind === 'GENERAL' && !generalAssessmentBefore?.has(item.id));
    generalAssessmentBefore = null;
    if (created) generalAssessmentHandoff(created);
  });
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if(form.id==='assessment-hawkins-baseline-form'){
    event.preventDefault();
    try{
      const data=new FormData(form);
      recordHawkinsBaseline(store,{sessionId:form.dataset.session,assistedEntityId:form.dataset.assisted,hertz:data.get('hertz')});
      const assessment=(store.getState().assessments||[]).find(item=>item.id===assessmentId);
      if(assessment)suggestionDialog(assessment);
    }catch(error){alert(error.message);}
    return;
  }
  if (form.id !== 'orienting-assessment-form') return;
  event.preventDefault();
  submitAssessment(form).catch((error) => alert(error.message));
});
