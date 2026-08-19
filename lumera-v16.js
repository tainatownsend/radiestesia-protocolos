(function(){
'use strict';
const $=id=>document.getElementById(id);
const LANG='lumera_language_v13';
const t=(pt,en)=>localStorage.getItem(LANG)==='en'?en:pt;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function dashboardHTML(){
  return `<section class="v16Dashboard" aria-labelledby="v16Title">
    <div class="v16Head">
      <span class="v16Eyebrow">${esc(t('Início','Home'))}</span>
      <h1 id="v16Title">${esc(t('O que você quer fazer agora?','What would you like to do now?'))}</h1>
      <p>${esc(t('Escolha uma opção. O app conduz o restante do fluxo passo a passo.','Choose an option. The app guides the rest of the flow step by step.'))}</p>
    </div>
    <div class="v16Actions">
      <button type="button" data-v16-action="assessment" class="v16Action v16Primary v16Featured">
        <span aria-hidden="true">＋</span>
        <strong>${esc(t('Iniciar nova sessão','Start new session'))}</strong>
        <small>${esc(t('Avaliação inicial, investigação, tratamento e resultado','Assessment, investigation, treatment and result'))}</small>
      </button>
      <button type="button" data-v16-action="library" class="v16Action">
        <span aria-hidden="true">◎</span>
        <strong>${esc(t('Abrir protocolos','Open protocols'))}</strong>
        <small>${esc(t('Quando você já sabe o que quer investigar','When you already know what you want to investigate'))}</small>
      </button>
      <button type="button" data-v16-action="divorce" class="v16Action">
        <span aria-hidden="true">↯</span>
        <strong>${esc(t('Divórcio Energético','Energetic Divorce'))}</strong>
        <small>${esc(t('Fluxo específico individual ou coletivo','Specific individual or group flow'))}</small>
      </button>
    </div>
  </section>`;
}

function renderDashboard(){
  const home=$('homeView');
  if(!home)return;
  let host=$('v16Dashboard');
  if(!host){host=document.createElement('div');host.id='v16Dashboard';home.prepend(host)}
  host.innerHTML=dashboardHTML();
}

function act(action){
  if(action==='assessment')return $('startAssessmentBtn')?.click();
  if(action==='divorce')return $('openDivorceBtn')?.click();
  if(action==='history')return $('historyBtn')?.click();
  /* Library is owned by the dedicated v22 module. */
}

function install(){
  renderDashboard();
  document.addEventListener('click',e=>{
    const action=e.target.closest?.('[data-v16-action]');
    if(!action||action.dataset.v16Action==='library')return;
    e.preventDefault();
    act(action.dataset.v16Action);
  },false);
  window.addEventListener('lumera:languagechange',renderDashboard);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
