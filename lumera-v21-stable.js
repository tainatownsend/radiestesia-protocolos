(function(){
'use strict';
const $=id=>document.getElementById(id);
const LANG='lumera_language_v13';
const t=(pt,en)=>localStorage.getItem(LANG)==='en'?en:pt;

function ensurePractitioner(){
  const dash=$('v16Dashboard');
  if(!dash)return;
  let card=$('v21Practitioner');
  if(!card){
    card=document.createElement('section');
    card.id='v21Practitioner';
    card.className='v21Practitioner';
    dash.appendChild(card);
  }
  card.innerHTML=`<div><b>${t('Jornada do terapeuta','Practitioner journey')}</b><span>${t('Prepare uma vez no início do período e encerre quando terminar o dia.','Prepare once at the start of the work period and close when you finish the day.')}</span></div><div><button type="button" id="v21Prepare">${t('Preparar','Prepare')}</button><button type="button" id="v21CloseDay">${t('Encerrar dia','Close day')}</button></div>`;
  $('v21Prepare').onclick=()=>$('prepareSessionBtn')?.click();
  $('v21CloseDay').onclick=()=>$('closeSessionBtn')?.click();
  const legacy=dash.querySelector('[data-v16-action="practitioner"]');
  if(legacy)legacy.hidden=true;
}

function polishHome(){
  const home=$('homeView');
  if(!home||home.classList.contains('hidden'))return;
  ensurePractitioner();
  document.querySelector('.lumeraWorkspace')?.classList.add('v21HiddenWorkspace');
  document.querySelector('.v16Head>span')?.remove();
}

function install(){
  /* v21 now owns only the compact practitioner state. Library, history,
     treatment continuity and session resume are handled by their dedicated
     event-driven modules loaded after this file. Keeping responsibilities
     separate prevents competing renders and iOS Safari layout loops. */
  localStorage.removeItem('lumera_protocol_draft_v14');
  setTimeout(polishHome,0);

  window.addEventListener('click',e=>{
    const practitioner=e.target.closest?.('[data-v16-action="practitioner"]');
    if(practitioner&&$('v16Dashboard')?.contains(practitioner)){
      e.preventDefault();
      e.stopImmediatePropagation();
      polishHome();
      $('v21Practitioner')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(e.target.closest?.('#headerHomeBtn,#newBtn,.backHome'))setTimeout(polishHome,40);
  },true);

  window.addEventListener('pageshow',()=>setTimeout(polishHome,40));
  window.addEventListener('lumera:languagechange',()=>setTimeout(polishHome,40));
  window.addEventListener('error',e=>console.error('Lumera runtime error:',e.error||e.message));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
