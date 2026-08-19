(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function dashboardHTML(){
  return `<section class="v16Dashboard" aria-labelledby="v16Title">
    <div class="v16Head">
      <span class="v16Eyebrow">Início</span>
      <h1 id="v16Title">O que você quer fazer agora?</h1>
      <p>Escolha uma opção. O app conduz o restante do fluxo passo a passo.</p>
    </div>
    <div class="v16Actions">
      <button type="button" data-v16-action="assessment" class="v16Action v16Primary v16Featured">
        <span aria-hidden="true">＋</span>
        <strong>Iniciar nova sessão</strong>
        <small>Avaliação inicial, investigação, tratamento e resultado</small>
      </button>
      <button type="button" data-v16-action="library" class="v16Action">
        <span aria-hidden="true">◎</span>
        <strong>Abrir protocolos</strong>
        <small>Quando você já sabe o que quer investigar</small>
      </button>
      <button type="button" data-v16-action="divorce" class="v16Action">
        <span aria-hidden="true">↯</span>
        <strong>Divórcio Energético</strong>
        <small>Fluxo específico individual ou coletivo</small>
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
}

function install(){
  renderDashboard();
  document.addEventListener('click',e=>{
    const action=e.target.closest?.('[data-v16-action]');
    if(!action||action.dataset.v16Action==='library')return;
    e.preventDefault();
    act(action.dataset.v16Action);
  },false);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
