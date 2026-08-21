import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store=createStore();
let enhancing=false;
let lastOpenSessionId=getOpenSession(store.getState())?.id||null;

const classificationLabels={
  CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',FACTOR_RELEVANT:'Fator relevante',DEEPEN:'Item a aprofundar'
};
const statusLabels={IN_PROGRESS:'Em andamento',COMPLETED:'Concluída',PLANNED:'Planejado',INTERRUPTED:'Interrompido',RUNNING:'Em andamento',PAUSED:'Pausado'};
function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function safeTime(value){const n=new Date(value||'').getTime();return Number.isFinite(n)?n:null;}
function assistedName(state,id){return state.assistedEntities.find((a)=>a.id===id)?.displayName||'Assistido';}
function protocolName(inv){return inv?.protocolSnapshot?.name||inv?.protocolName||'Investigação';}
function isPrepared(state,sessionId){return latestPreparation(state,sessionId)?.status==='COMPLETED';}
function sessionInvestigations(state,sessionId){return (state.investigations||[]).filter((i)=>i.originSessionId===sessionId||i.currentSessionId===sessionId||i.sessionId===sessionId);}
function activeForAssisted(state,id){return (state.investigations||[]).filter((i)=>i.assistedEntityId===id&&i.status==='IN_PROGRESS').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]||null;}
function activeReiki(state,id){return (state.reikiApplications||[]).find((r)=>r.assistedEntityId===id&&['RUNNING','PAUSED'].includes(r.status))||null;}
function dueTreatment(state,id){const now=Date.now();return (state.treatments||[]).find((t)=>t.assistedEntityId===id&&t.status==='IN_PROGRESS'&&(state.treatmentComponents||[]).some((c)=>c.treatmentId===t.id&&c.status==='IN_PROGRESS'&&safeTime(c.expectedEndAt)!=null&&safeTime(c.expectedEndAt)<=now))||null;}

function markTechnicalEnums(){
  document.querySelectorAll('[data-treatment-trace], .timeline-copy span').forEach((node)=>{
    let text=node.textContent||'';
    for(const [key,label] of Object.entries(classificationLabels))text=text.replaceAll(key,label);
    if(node.textContent!==text)node.textContent=text;
  });
}

function nextAction(){
  const state=store.getState(),session=getOpenSession(state),main=document.querySelector('main');
  if(!session||!main||!isPrepared(state,session.id)||main.querySelector('[data-ux-next-action]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Sessão em andamento')return;
  const assistedId=session.currentAssistedEntityId;
  if(!assistedId)return;
  const reiki=activeReiki(state,assistedId),inv=activeForAssisted(state,assistedId),review=dueTreatment(state,assistedId);
  let title='Escolha o próximo passo',detail='Investigar, tratar, aplicar Reiki ou registrar uma anotação.',action='',button='';
  if(reiki){title=reiki.status==='PAUSED'?'Retomar Reiki':'Reiki em andamento';detail='A aplicação continua vinculada ao assistido atual.';action=`data-ux-open-reiki="${esc(reiki.id)}"`;button='Abrir timer';}
  else if(inv){title=`Continuar ${protocolName(inv)}`;detail='Há uma investigação aberta para este assistido.';action='data-ux-resume-investigation';button='Continuar investigação';}
  else if(review){title=`Revisar ${review.title}`;detail='Há componente com prazo de revisão atingido.';action=`data-ux-review-treatment="${esc(review.id)}"`;button='Revisar tratamento';}
  else {action='data-ux-open-investigation';button='Iniciar investigação';}
  const section=document.createElement('section');section.className='ux-next-action';section.dataset.uxNextAction='true';
  section.innerHTML=`<p class="eyebrow">Próxima ação</p><h2>${esc(title)}</h2><p>${esc(detail)}</p><button class="btn ${reiki||inv||review?'primary':'secondary'}" ${action}>${esc(button)}</button>`;
  const fast=main.querySelector('[data-fast-session-context]');
  (fast||main.querySelector('.lead'))?.after(section);
}

function investigationStack(){
  const state=store.getState(),session=getOpenSession(state),main=document.querySelector('main');
  if(!session||!main||!isPrepared(state,session.id)||main.querySelector('[data-ux-investigation-stack]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Sessão em andamento')return;
  const items=sessionInvestigations(state,session.id).sort((a,b)=>String(b.updatedAt||b.completedAt||b.startedAt||'').localeCompare(String(a.updatedAt||a.completedAt||a.startedAt||'')));
  if(!items.length)return;
  const section=document.createElement('section');section.className='section ux-investigation-stack';section.dataset.uxInvestigationStack='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Investigações</p><h2>Trabalhos desta sessão</h2></div><button class="btn ghost small" data-manage-session-investigations>Ver todas</button></div><div class="ux-investigation-list">${items.slice(0,5).map((inv)=>`<article class="ux-investigation-item ${inv.status==='IN_PROGRESS'?'is-open':''}"><span class="ux-investigation-mark">${inv.status==='COMPLETED'?'✓':'●'}</span><div class="ux-investigation-copy"><strong>${esc(protocolName(inv))}</strong><span>${esc(assistedName(state,inv.assistedEntityId))} · ${esc(statusLabels[inv.status]||'Registrada')}</span></div>${inv.status==='IN_PROGRESS'?`<button class="btn ghost small" data-ux-resume-specific="${esc(inv.id)}" data-ux-assisted="${esc(inv.assistedEntityId)}">Retomar</button>`:''}</article>`).join('')}</div>`;
  const actionGrid=[...main.querySelectorAll('h2')].find((h)=>h.textContent?.trim()==='Novo trabalho')?.closest('.section');
  if(actionGrid)actionGrid.before(section);else main.appendChild(section);
}

function compactDailyCopy(){
  const main=document.querySelector('main');if(!main)return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()==='Sessão em andamento')document.body.classList.add('ux-daily-compact-copy');
  else document.body.classList.remove('ux-daily-compact-copy');
  const timerStatus=main.querySelector('.timer-status');
  if(timerStatus&&timerStatus.textContent?.includes('o tempo é reconstruído'))timerStatus.textContent=timerStatus.textContent.startsWith('Pausado')?'Pausado':'Em andamento';
}

function forgottenSession(){
  const state=store.getState(),session=getOpenSession(state);if(!session)return;
  const start=safeTime(session.startedAt);if(start==null)return;
  const age=Date.now()-start;const differentDay=new Date(start).toDateString()!==new Date().toDateString();
  if(age<12*3600000&&!differentDay)return;
  const indicator=document.querySelector('.session-indicator');if(!indicator||indicator.dataset.uxForgotten)return;
  indicator.dataset.uxForgotten='true';indicator.textContent=`Sessão possivelmente esquecida · ${indicator.textContent.replace(/^Sessão aberta ·\s*/,'')}`;
}

function closingReview(){
  const overlay=document.querySelector('#session-close-review-overlay');if(!overlay)return;
  const reports=[...overlay.querySelectorAll('h3')].find((h)=>h.textContent?.trim()==='Relatórios')?.closest('.section');
  if(reports&&!reports.classList.contains('ux-hide-before-close')){
    reports.classList.add('ux-hide-before-close');
    const note=document.createElement('p');note.className='muted';note.dataset.uxPostCloseNote='true';note.textContent='Relatórios e resumos ficam disponíveis logo após o encerramento.';reports.after(note);
  }
  const button=overlay.querySelector('[data-session-close-proceed]');if(button)button.textContent='Revisar pendências e continuar';
}

function postCloseDialog(sessionId){
  const state=store.getState(),session=state.sessions.find((s)=>s.id===sessionId);if(!session)return;
  document.querySelector('#ux-post-close-overlay')?.remove();
  const ids=new Set();(state.events||[]).filter((e)=>e.sessionId===sessionId&&e.assistedEntityId).forEach((e)=>ids.add(e.assistedEntityId));
  const wrap=document.createElement('div');wrap.id='ux-post-close-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet ux-completion-sheet"><div class="sheet-head"><div><p class="eyebrow">Sessão encerrada</p><h2>Encerramento registrado com segurança</h2></div><button class="close-btn" data-ux-post-close-close>×</button></div><div class="ux-complete-mark">✓</div><p class="muted">Agora você pode gerar a documentação sem interromper a decisão de encerramento.</p><div class="ux-post-close-actions"><button class="btn secondary wide" data-session-report data-session="${esc(sessionId)}">Registro técnico completo</button>${[...ids].map((id)=>`<button class="btn secondary wide" data-session-report data-session="${esc(sessionId)}" data-assisted="${esc(id)}">Relatório · ${esc(assistedName(state,id))}</button>`).join('')}</div><button class="btn primary wide" data-ux-post-close-close>Voltar para Hoje</button></section>`;
  document.body.appendChild(wrap);
}

function enhanceReviewSheet(){
  const form=document.querySelector('#review-form');if(!form||form.dataset.uxGuidedReview)return;
  form.dataset.uxGuidedReview='true';const treatmentId=form.dataset.treatment,state=store.getState(),t=state.treatments.find((x)=>x.id===treatmentId);if(!t)return;
  const comps=(state.treatmentComponents||[]).filter((c)=>c.treatmentId===t.id);
  const box=document.createElement('section');box.className='ux-review-context';
  box.innerHTML=`<article class="card soft"><p class="eyebrow">Objetivo</p><strong>${esc(t.objective||t.therapeuticObjective||t.title)}</strong></article>${comps.length?`<article class="card soft"><p class="eyebrow">Componentes</p><div class="ux-review-components">${comps.map((c)=>`<div class="ux-review-component"><strong>${esc(c.name)}</strong><span>${esc(statusLabels[c.status]||'Registrado')}</span></div>`).join('')}</div></article>`:''}<p class="muted">Revise primeiro os componentes. Depois registre a nova medição para decidir continuidade ou avaliação final.</p>`;
  form.before(box);
}

function enhance(){if(enhancing)return;enhancing=true;try{markTechnicalEnums();nextAction();investigationStack();compactDailyCopy();forgottenSession();closingReview();enhanceReviewSheet();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

let scrollScheduled=false;addEventListener('scroll',()=>{if(scrollScheduled)return;scrollScheduled=true;requestAnimationFrame(()=>{document.body.classList.toggle('fluxa-context-collapsed',scrollY>110);scrollScheduled=false;});},{passive:true});

store.subscribe((state)=>{
  const open=getOpenSession(state);const current=open?.id||null;
  document.querySelector('[data-ux-next-action]')?.remove();document.querySelector('[data-ux-investigation-stack]')?.remove();
  if(lastOpenSessionId&&!current){const closed=lastOpenSessionId;queueMicrotask(()=>postCloseDialog(closed));}
  lastOpenSessionId=current;queueMicrotask(enhance);
});

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.uxOpenInvestigation!==undefined){document.querySelector('[data-action="investigate"]')?.click();return;}
  if(b.dataset.uxResumeInvestigation!==undefined){document.querySelector('[data-action="resume-latest-investigation"]')?.click();return;}
  if(b.dataset.uxOpenReiki){const target=document.querySelector(`[data-open-reiki="${CSS.escape(b.dataset.uxOpenReiki)}"]`);target?.click();return;}
  if(b.dataset.uxReviewTreatment){document.querySelector('[data-route="treatments"]')?.click();requestAnimationFrame(()=>document.querySelector(`[data-review-treatment="${CSS.escape(b.dataset.uxReviewTreatment)}"]`)?.click());return;}
  if(b.dataset.uxResumeSpecific){const session=getOpenSession(store.getState());if(!session)return;const assisted=b.dataset.uxAssisted;const chip=document.querySelector(`[data-fast-assisted="${CSS.escape(assisted)}"]`);chip?.click();requestAnimationFrame(()=>document.querySelector('[data-action="resume-latest-investigation"]')?.click());return;}
  if(b.dataset.uxPostCloseClose!==undefined){document.querySelector('#ux-post-close-overlay')?.remove();return;}
},true);
