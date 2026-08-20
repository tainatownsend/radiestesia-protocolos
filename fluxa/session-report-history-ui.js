import { createStore } from './store.js';

const store=createStore();
let currentSessionId=null;

function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function assistedIdsForSession(state,sessionId){
  const ids=new Set();
  (state.events||[]).filter((e)=>e.sessionId===sessionId&&e.assistedEntityId).forEach((e)=>ids.add(e.assistedEntityId));
  (state.investigations||[]).filter((i)=>i.originSessionId===sessionId||i.currentSessionId===sessionId||i.sessionId===sessionId).forEach((i)=>i.assistedEntityId&&ids.add(i.assistedEntityId));
  (state.reikiApplications||[]).filter((r)=>r.sessionId===sessionId).forEach((r)=>r.assistedEntityId&&ids.add(r.assistedEntityId));
  return [...ids];
}
function enhance(){
  if(!currentSessionId)return;
  const sheet=document.querySelector('#history-overlay .detail-sheet');
  if(!sheet||sheet.querySelector('[data-history-reports]'))return;
  const state=store.getState();
  const session=state.sessions.find((s)=>s.id===currentSessionId);if(!session)return;
  const ids=assistedIdsForSession(state,currentSessionId);
  const section=document.createElement('section');section.className='section card soft';section.dataset.historyReports='true';
  section.innerHTML=`<p class="eyebrow">Relatórios</p><h3>Reabrir documentos desta sessão</h3><p class="muted">Os relatórios são reconstruídos a partir do histórico preservado no Fluxa.</p><div class="stack"><button class="btn secondary wide" data-session-report data-session="${currentSessionId}">Resumo interno da sessão</button>${ids.map((id)=>{const a=state.assistedEntities.find((x)=>x.id===id);return `<button class="btn secondary wide" data-session-report data-session="${currentSessionId}" data-assisted="${id}">Relatório · ${esc(a?.displayName||'Assistido')}</button>`;}).join('')}</div>`;
  const timeline=[...sheet.querySelectorAll('.section')].find((s)=>s.querySelector('h3')?.textContent?.trim()==='Timeline');
  timeline?.before(section) || sheet.appendChild(section);
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.openSessionHistory){currentSessionId=b.dataset.openSessionHistory;queueMicrotask(enhance);}
  else if(b.dataset.sessionHistory!==undefined&&!b.dataset.openSessionHistory){currentSessionId=null;}
},true);
