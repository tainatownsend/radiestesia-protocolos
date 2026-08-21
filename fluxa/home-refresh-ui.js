import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store=createStore();
let enhancing=false;

function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function safeTime(value){const n=new Date(value||'').getTime();return Number.isFinite(n)?n:null;}
function isToday(main){return main?.querySelector(':scope > .eyebrow')?.textContent?.trim()==='Sessão em andamento';}
function prepared(state,sessionId){return latestPreparation(state,sessionId)?.status==='COMPLETED';}
function assistedName(state,id){return state.assistedEntities.find((a)=>a.id===id)?.displayName||'Escolha um assistido';}
function activeReiki(state,id){return state.reikiApplications.find((r)=>r.assistedEntityId===id&&['RUNNING','PAUSED'].includes(r.status))||null;}
function activeInvestigation(state,id){return state.investigations.filter((i)=>i.assistedEntityId===id&&i.status==='IN_PROGRESS').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]||null;}
function dueTreatment(state,id){const now=Date.now();return state.treatments.find((t)=>t.assistedEntityId===id&&t.status==='IN_PROGRESS'&&state.treatmentComponents.some((c)=>c.treatmentId===t.id&&c.status==='IN_PROGRESS'&&safeTime(c.expectedEndAt)!=null&&safeTime(c.expectedEndAt)<=now))||null;}
function protocolName(inv){return inv?.protocolSnapshot?.name||inv?.protocolName||'Investigação';}

function buildCockpit(state,session){
  const id=session.currentAssistedEntityId;
  const assisted=assistedName(state,id);
  const reiki=id?activeReiki(state,id):null;
  const inv=id?activeInvestigation(state,id):null;
  const review=id?dueTreatment(state,id):null;
  let label='Próxima ação',title='Escolha o que deseja fazer',detail='Investigar, tratar, aplicar Reiki ou registrar uma anotação.',action='<button class="btn primary wide" data-home-open-actions>Ver ações</button>';
  if(!id){title='Escolha quem será atendido';detail='Defina o Assistido para iniciar o trabalho desta sessão.';action='<button class="btn primary wide" data-action="choose-assisted">Escolher assistido</button>';}
  else if(reiki){label=reiki.status==='PAUSED'?'Reiki pausado':'Reiki em andamento';title='Voltar para a aplicação';detail='O timer continua vinculado ao atendimento atual.';action=`<button class="btn primary wide" data-home-open-reiki="${esc(reiki.id)}">Abrir timer</button>`;}
  else if(inv){title=`Continuar ${esc(protocolName(inv))}`;detail='Há uma investigação aberta para este Assistido.';action='<button class="btn primary wide" data-home-resume-investigation>Continuar investigação</button>';}
  else if(review){title=`Revisar ${esc(review.title)}`;detail='Há um componente disponível para revisão.';action=`<button class="btn primary wide" data-home-review-treatment="${esc(review.id)}">Revisar tratamento</button>`;}
  return `<section class="home-cockpit" data-home-cockpit>
    <div class="home-cockpit-context"><div><p class="eyebrow">Atendimento atual</p><h2>${esc(assisted)}</h2></div><button class="btn ghost small" data-action="choose-assisted">${id?'Trocar':'Escolher'}</button></div>
    <div class="home-cockpit-next"><p class="eyebrow">${esc(label)}</p><h1>${title}</h1><p>${esc(detail)}</p>${action}</div>
    <div class="home-primary-actions" data-home-actions>
      <button class="home-action" data-action="investigate" ${id?'':'disabled'}><strong>Investigar</strong><span>Perguntas e achados</span></button>
      <button class="home-action" data-action="treat-direct" ${id?'':'disabled'}><strong>Tratar</strong><span>Plano terapêutico</span></button>
      <button class="home-action" data-action="reiki" ${id?'':'disabled'}><strong>Reiki</strong><span>Timer e aplicação</span></button>
      <button class="home-action" data-action="add-note" ${id?'':'disabled'}><strong>Anotar</strong><span>Registro rápido</span></button>
    </div>
  </section>`;
}

function moveInvestigationStack(main,cockpit){
  const stack=main.querySelector('[data-ux-investigation-stack]');if(!stack)return;
  stack.classList.add('home-support-section');cockpit.after(stack);
}
function simplifyLegacy(main){
  main.querySelector('[data-fast-session-context]')?.setAttribute('hidden','');
  main.querySelector('[data-ux-next-action]')?.setAttribute('hidden','');
  const context=[...main.querySelectorAll('.card.soft.section')].find((s)=>s.querySelector('.eyebrow')?.textContent?.trim()==='Contexto atual');context?.setAttribute('hidden','');
  const newWork=[...main.querySelectorAll('.section')].find((s)=>s.querySelector('h2')?.textContent?.trim()==='Novo trabalho');newWork?.setAttribute('hidden','');
  const timeline=[...main.querySelectorAll('.section')].find((s)=>s.querySelector('h2')?.textContent?.trim()==='Timeline da sessão');
  if(timeline&&!timeline.dataset.homeCollapsed){timeline.dataset.homeCollapsed='true';timeline.classList.add('home-collapsible-section');const head=timeline.querySelector('.section-head');const list=timeline.querySelector('.timeline');if(head&&list){list.hidden=true;const btn=document.createElement('button');btn.type='button';btn.className='btn ghost small';btn.dataset.homeToggleTimeline='true';btn.textContent='Ver atividade';head.querySelector('[data-action="close-session"]')?.before(btn);}}
  document.querySelector('[data-session-dashboard]')?.setAttribute('hidden','');
}
function ensureCockpit(){
  const state=store.getState(),session=getOpenSession(state),main=document.querySelector('main');if(!session||!main||!isToday(main)||!prepared(state,session.id))return;
  let cockpit=main.querySelector('[data-home-cockpit]');
  if(!cockpit){const wrap=document.createElement('div');wrap.innerHTML=buildCockpit(state,session);cockpit=wrap.firstElementChild;const lead=main.querySelector(':scope > .lead');(lead||main.firstElementChild)?.after(cockpit);}
  simplifyLegacy(main);moveInvestigationStack(main,cockpit);
  document.body.classList.add('fluxa-home-refreshed');
}
function enhance(){if(enhancing)return;enhancing=true;try{const main=document.querySelector('main');if(main&&!isToday(main))document.body.classList.remove('fluxa-home-refreshed');ensureCockpit();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
store.subscribe(()=>{document.querySelector('[data-home-cockpit]')?.remove();queueMicrotask(enhance);});

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.homeOpenActions!==undefined){document.querySelector('[data-home-actions]')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(b.dataset.homeResumeInvestigation!==undefined){document.querySelector('[data-action="resume-latest-investigation"]')?.click();return;}
  if(b.dataset.homeOpenReiki){document.querySelector(`[data-open-reiki="${CSS.escape(b.dataset.homeOpenReiki)}"]`)?.click();return;}
  if(b.dataset.homeReviewTreatment){document.querySelector('[data-route="treatments"]')?.click();requestAnimationFrame(()=>document.querySelector(`[data-review-treatment="${CSS.escape(b.dataset.homeReviewTreatment)}"]`)?.click());return;}
  if(b.dataset.homeToggleTimeline!==undefined){const section=b.closest('.home-collapsible-section');const timeline=section?.querySelector('.timeline');if(!timeline)return;timeline.hidden=!timeline.hidden;b.textContent=timeline.hidden?'Ver atividade':'Ocultar atividade';return;}
},true);
