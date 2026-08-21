import { createStore } from './store.js';
import { getOpenSession, selectAssistedForSession } from './domain.js';

const store=createStore();
let enhancing=false;
const FOCUS_KEY='fluxa.session.focusMode';

function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function safeSessionGet(key){try{return sessionStorage.getItem(key);}catch(_){return null;}}
function safeSessionSet(key,value){try{sessionStorage.setItem(key,value);}catch(_){}}
function safeText(value=''){return String(value||'');}
function activeAssisted(state){return (state.assistedEntities||[]).filter((a)=>!a.archivedAt);}
function sessionAssistedIds(state,sessionId){
  const ids=[]; const seen=new Set();
  const add=(id)=>{if(id&&!seen.has(id)){seen.add(id);ids.push(id);}};
  (state.events||[]).filter((e)=>e.sessionId===sessionId).sort((a,b)=>safeText(a.occurredAt).localeCompare(safeText(b.occurredAt))).forEach((e)=>add(e.assistedEntityId));
  (state.investigations||[]).filter((x)=>x.originSessionId===sessionId||x.currentSessionId===sessionId||x.sessionId===sessionId).forEach((x)=>add(x.assistedEntityId));
  add(state.sessions.find((s)=>s.id===sessionId)?.currentAssistedEntityId);
  return ids;
}
function assistedName(state,id){return state.assistedEntities.find((a)=>a.id===id)?.displayName||'Assistido';}
function protocolName(inv){return inv?.protocolSnapshot?.name||inv?.protocolName||'Investigação';}
function activeInvestigation(state,assistedId){return (state.investigations||[]).filter((i)=>i.assistedEntityId===assistedId&&i.status==='IN_PROGRESS').sort((a,b)=>safeText(b.updatedAt||b.createdAt).localeCompare(safeText(a.updatedAt||a.createdAt)))[0]||null;}
function activeReiki(state,assistedId){return (state.reikiApplications||[]).find((r)=>r.assistedEntityId===assistedId&&['RUNNING','PAUSED'].includes(r.status))||null;}
function reviewableTreatment(state,assistedId){
  const now=Date.now();
  const treatments=(state.treatments||[]).filter((t)=>t.assistedEntityId===assistedId&&t.status==='IN_PROGRESS');
  return treatments.find((t)=>(state.treatmentComponents||[]).some((c)=>c.treatmentId===t.id&&c.status==='IN_PROGRESS'&&c.expectedEndAt&&Number.isFinite(new Date(c.expectedEndAt).getTime())&&new Date(c.expectedEndAt).getTime()<=now))||null;
}
function setFocusMode(enabled){document.body.classList.toggle('fluxa-focus-mode',enabled);safeSessionSet(FOCUS_KEY,enabled?'1':'0');}

function ensureFastContext(){
  const state=store.getState();const session=getOpenSession(state);const main=document.querySelector('main');
  if(!session||!main)return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Sessão em andamento')return;
  if(main.querySelector('[data-fast-session-context]'))return;
  const current=session.currentAssistedEntityId;
  const ids=sessionAssistedIds(state,session.id).filter((id)=>state.assistedEntities.some((a)=>a.id===id&&!a.archivedAt));
  const inv=current?activeInvestigation(state,current):null;
  const reiki=current?activeReiki(state,current):null;
  const review=current?reviewableTreatment(state,current):null;
  const bar=document.createElement('section');
  bar.className='fast-session-context';bar.dataset.fastSessionContext='true';
  bar.innerHTML=`<div class="fast-context-main"><div><p class="eyebrow">Atendimento atual</p><strong>${current?esc(assistedName(state,current)):'Nenhum assistido selecionado'}</strong></div><div class="fast-context-actions"><button class="btn ghost small" data-fast-focus-mode>${document.body.classList.contains('fluxa-focus-mode')?'Mostrar contexto':'Modo atendimento'}</button><button class="btn secondary small" data-action="choose-assisted">${current?'Trocar':'Escolher assistido'}</button></div></div>
    ${ids.length>1?`<div class="fast-assisted-chips">${ids.map((id)=>`<button class="fast-assisted-chip ${id===current?'active':''}" data-fast-assisted="${esc(id)}">${esc(assistedName(state,id))}</button>`).join('')}</div>`:''}
    ${current&&(inv||reiki||review)?`<div class="fast-next-actions">${inv?`<button class="fast-next" data-fast-resume-investigation><span>Continuar</span><strong>${esc(protocolName(inv))}</strong></button>`:''}${reiki?`<button class="fast-next" data-fast-open-reiki="${esc(reiki.id)}"><span>${reiki.status==='PAUSED'?'Reiki pausado':'Reiki ativo'}</span><strong>Abrir timer</strong></button>`:''}${review?`<button class="fast-next" data-fast-review-treatment="${esc(review.id)}"><span>Revisão disponível</span><strong>${esc(review.title)}</strong></button>`:''}</div>`:''}`;
  main.prepend(bar);
}

function enhance(){if(enhancing)return;enhancing=true;try{ensureFastContext();}finally{enhancing=false;}}
setFocusMode(safeSessionGet(FOCUS_KEY)==='1');
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

store.subscribe(()=>{document.querySelector('[data-fast-session-context]')?.remove();queueMicrotask(enhance);});

document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.fastFocusMode!==undefined){setFocusMode(!document.body.classList.contains('fluxa-focus-mode'));document.querySelector('[data-fast-session-context]')?.remove();enhance();return;}
  if(button.dataset.fastAssisted){const session=getOpenSession(store.getState());if(!session)return;try{selectAssistedForSession(store,session.id,button.dataset.fastAssisted);}catch(error){alert(error.message);}return;}
  if(button.dataset.fastResumeInvestigation!==undefined){document.querySelector('[data-action="resume-latest-investigation"]')?.click();return;}
  if(button.dataset.fastOpenReiki){const target=document.querySelector(`[data-open-reiki="${CSS.escape(button.dataset.fastOpenReiki)}"]`);if(target)target.click();else document.querySelector('[data-action="reiki"]')?.click();return;}
  if(button.dataset.fastReviewTreatment){
    const id=button.dataset.fastReviewTreatment;
    document.querySelector('[data-route="treatments"]')?.click();
    requestAnimationFrame(()=>document.querySelector(`[data-review-treatment="${CSS.escape(id)}"]`)?.click());
  }
},true);
