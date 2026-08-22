import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store=createStore();
let enhancing=false;

function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function safeTime(value){const n=new Date(value||'').getTime();return Number.isFinite(n)?n:null;}
function pageEyebrow(main){return main?.querySelector(':scope > .eyebrow')?.textContent?.trim()||'';}
function isSessionHome(main){return pageEyebrow(main)==='Sessão em andamento';}
function isIdleHome(main){return pageEyebrow(main)==='Hoje';}
function prepared(state,sessionId){return latestPreparation(state,sessionId)?.status==='COMPLETED';}
function assistedName(state,id){return (state.assistedEntities||[]).find((a)=>a.id===id)?.displayName||'Escolha um assistido';}
function activeReiki(state,id){return (state.reikiApplications||[]).find((r)=>r.assistedEntityId===id&&['RUNNING','PAUSED'].includes(r.status))||null;}
function activeInvestigation(state,id){return (state.investigations||[]).filter((i)=>i.assistedEntityId===id&&i.status==='IN_PROGRESS').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]||null;}
function dueTreatment(state,id){const now=Date.now();return (state.treatments||[]).find((t)=>t.assistedEntityId===id&&t.status==='IN_PROGRESS'&&(state.treatmentComponents||[]).some((c)=>c.treatmentId===t.id&&c.status==='IN_PROGRESS'&&safeTime(c.expectedEndAt)!=null&&safeTime(c.expectedEndAt)<=now))||null;}
function protocolName(inv){return inv?.protocolSnapshot?.name||inv?.protocolName||'Investigação';}
function actionIcon(kind){
  const paths={
    investigate:'<circle cx="12" cy="12" r="3"/><path d="M4.8 18.2c2.2-3.2 4.6-4.8 7.2-4.8s5 1.6 7.2 4.8"/><path d="M12 3.8v3"/>',
    treat:'<path d="M5 17.5c2.4-5.9 7-9.5 14-10.8-1.1 6.6-4.9 10.8-11 12.5"/><path d="M7.8 16.2c2.3-2.4 4.9-4.5 7.8-6.2"/>',
    reiki:'<circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14"/><path d="M7.1 7.1l9.8 9.8M16.9 7.1l-9.8 9.8"/>',
    note:'<path d="M6 4.5h9l3 3V19.5H6z"/><path d="M15 4.5v3h3M9 11h6M9 14h6"/>'
  };
  return `<span class="home-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[kind]}</svg></span>`;
}

function buildCockpit(state,session){
  const id=session.currentAssistedEntityId;
  const assisted=assistedName(state,id);
  const reiki=id?activeReiki(state,id):null;
  const inv=id?activeInvestigation(state,id):null;
  const review=id?dueTreatment(state,id):null;
  let label='Próximo passo',title='Escolha a atividade',detail='Você pode iniciar qualquer uma das ações abaixo.',action='';
  if(!id){title='Escolha quem será atendido';detail='Defina o Assistido para iniciar o trabalho desta sessão.';action='<button class="btn primary" data-action="choose-assisted">Escolher assistido</button>';}
  else if(reiki){label=reiki.status==='PAUSED'?'Reiki pausado':'Reiki em andamento';title='Voltar para a aplicação';detail='O timer continua vinculado ao atendimento atual.';action=`<button class="btn primary" data-home-open-reiki="${esc(reiki.id)}">Abrir timer</button>`;}
  else if(inv){title=`Continuar ${esc(protocolName(inv))}`;detail='Há uma investigação aberta para este Assistido.';action='<button class="btn primary" data-home-resume-investigation>Continuar</button>';}
  else if(review){title=`Revisar ${esc(review.title)}`;detail='Há um componente disponível para revisão.';action=`<button class="btn primary" data-home-review-treatment="${esc(review.id)}">Revisar</button>`;}
  return `<section class="home-cockpit" data-home-cockpit>
    <div class="home-cockpit-context"><div><p class="eyebrow">Atendimento atual</p><h2>${esc(assisted)}</h2></div><button class="btn ghost small" data-action="choose-assisted">${id?'Trocar':'Escolher'}</button></div>
    <div class="home-cockpit-next"><div class="home-next-copy"><p class="eyebrow">${esc(label)}</p><h1>${title}</h1><p>${esc(detail)}</p></div>${action ? `<div class="home-next-action">${action}</div>` : ''}</div>
    <nav class="home-primary-actions" data-home-actions aria-label="Ações principais da sessão">
      <button class="home-action" data-action="investigate" ${id?'':'disabled'}>${actionIcon('investigate')}<strong>Investigar</strong><span>Perguntas e achados</span></button>
      <button class="home-action" data-action="treat-direct" ${id?'':'disabled'}>${actionIcon('treat')}<strong>Tratar</strong><span>Plano terapêutico</span></button>
      <button class="home-action" data-action="reiki" ${id?'':'disabled'}>${actionIcon('reiki')}<strong>Reiki</strong><span>Timer e aplicação</span></button>
      <button class="home-action" data-action="add-note" ${id?'':'disabled'}>${actionIcon('note')}<strong>Anotar</strong><span>Registro rápido</span></button>
    </nav>
  </section>`;
}

function collapseSection(section,{buttonLabel='Ver atividade'}={}){
  if(!section||section.dataset.homeCollapsed)return;
  const content=section.querySelector('.timeline,.stack,.empty');const head=section.querySelector('.section-head');
  if(!content||!head)return;
  section.dataset.homeCollapsed='true';section.classList.add('home-collapsible-section');content.hidden=true;
  const btn=document.createElement('button');btn.type='button';btn.className='btn ghost small';btn.dataset.homeToggleSection='true';btn.textContent=buttonLabel;head.appendChild(btn);
}
function moveInvestigationStack(main,cockpit){const stack=main.querySelector('[data-ux-investigation-stack]');if(!stack)return;stack.classList.add('home-support-section');cockpit.after(stack);}
function hideLegacySessionLayers(main){
  main.querySelector('[data-fast-session-context]')?.setAttribute('hidden','');
  main.querySelector('[data-ux-next-action]')?.setAttribute('hidden','');
  const context=[...main.querySelectorAll('.card.soft.section')].find((s)=>s.querySelector('.eyebrow')?.textContent?.trim()==='Contexto atual');context?.setAttribute('hidden','');
  const newWork=[...main.querySelectorAll('.section')].find((s)=>s.querySelector('h2')?.textContent?.trim()==='Novo trabalho');newWork?.setAttribute('hidden','');
  document.querySelector('[data-session-dashboard]')?.setAttribute('hidden','');
}
function simplifySessionTimeline(main){
  const timeline=[...main.querySelectorAll('.section')].find((s)=>s.querySelector('h2')?.textContent?.trim()==='Timeline da sessão');
  if(!timeline||timeline.dataset.homeCollapsed)return;
  const list=timeline.querySelector('.timeline'),head=timeline.querySelector('.section-head');if(!list||!head)return;
  timeline.dataset.homeCollapsed='true';timeline.classList.add('home-collapsible-section');list.hidden=true;
  const btn=document.createElement('button');btn.type='button';btn.className='btn ghost small';btn.dataset.homeToggleSection='true';btn.textContent='Atividade';head.querySelector('[data-action="close-session"]')?.before(btn);
  const close=head.querySelector('[data-action="close-session"]');if(close){close.textContent='Encerrar';close.classList.add('home-close-session');}
}
function simplifyIdle(main){
  document.body.classList.remove('fluxa-home-refreshed','fluxa-home-preparing');document.body.classList.add('fluxa-home-idle');
  const recent=[...main.querySelectorAll('.section')].find((s)=>s.querySelector('h2')?.textContent?.trim()==='Atividade recente');collapseSection(recent);
  const reikiButton=main.querySelector('[data-action="reiki-retro"]')?.closest('.section');reikiButton?.classList.add('home-idle-secondary');
}
function simplifyPreparing(main){
  document.body.classList.remove('fluxa-home-refreshed','fluxa-home-idle');document.body.classList.add('fluxa-home-preparing');
  main.querySelector('[data-fast-session-context]')?.setAttribute('hidden','');
  document.querySelector('[data-session-dashboard]')?.setAttribute('hidden','');
}
function ensurePreparedHome(state,session,main){
  document.body.classList.remove('fluxa-home-idle','fluxa-home-preparing');document.body.classList.add('fluxa-home-refreshed');
  let cockpit=main.querySelector('[data-home-cockpit]');
  if(!cockpit){const wrap=document.createElement('div');wrap.innerHTML=buildCockpit(state,session);cockpit=wrap.firstElementChild;const lead=main.querySelector(':scope > .lead');(lead||main.firstElementChild)?.after(cockpit);}
  hideLegacySessionLayers(main);simplifySessionTimeline(main);moveInvestigationStack(main,cockpit);
}
function enhance(){
  if(enhancing)return;enhancing=true;
  try{
    const state=store.getState(),session=getOpenSession(state),main=document.querySelector('main');if(!main)return;
    if(!session&&isIdleHome(main)){simplifyIdle(main);return;}
    if(session&&isSessionHome(main)){if(!prepared(state,session.id)){simplifyPreparing(main);return;}ensurePreparedHome(state,session,main);return;}
    document.body.classList.remove('fluxa-home-refreshed','fluxa-home-idle','fluxa-home-preparing');
  }finally{enhancing=false;}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
store.subscribe(()=>{document.querySelector('[data-home-cockpit]')?.remove();queueMicrotask(enhance);});

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.homeResumeInvestigation!==undefined){document.querySelector('[data-action="resume-latest-investigation"]')?.click();return;}
  if(b.dataset.homeOpenReiki){document.querySelector(`[data-open-reiki="${CSS.escape(b.dataset.homeOpenReiki)}"]`)?.click();return;}
  if(b.dataset.homeReviewTreatment){document.querySelector('[data-route="treatments"]')?.click();requestAnimationFrame(()=>document.querySelector(`[data-review-treatment="${CSS.escape(b.dataset.homeReviewTreatment)}"]`)?.click());return;}
  if(b.dataset.homeToggleSection!==undefined){const section=b.closest('.home-collapsible-section');const content=section?.querySelector('.timeline,.stack,.empty');if(!content)return;content.hidden=!content.hidden;b.textContent=content.hidden?'Atividade':'Ocultar';return;}
},true);
