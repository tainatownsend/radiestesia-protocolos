(function(){
'use strict';
const $=id=>document.getElementById(id);

function dashboardHTML(){
  return `<section class="v16Dashboard" aria-labelledby="v16Title">
    <div class="v16Head">
      <span class="v16Eyebrow">Início</span>
      <h1 id="v16Title">Como você quer começar?</h1>
      <p>Comece uma sessão completa ou vá direto a uma ferramenta específica.</p>
    </div>

    <div class="v16PrimaryArea">
      <button type="button" data-v16-action="assessment" class="v16Action v16Primary v16Featured">
        <span aria-hidden="true">＋</span>
        <span class="v16ActionText"><strong>Nova sessão completa</strong><small>Avaliação inicial → investigação → tratamento → resultado</small></span>
        <b class="v16Chevron" aria-hidden="true">›</b>
      </button>
    </div>

    <div class="v16Direct">
      <span class="v16DirectLabel">Ou vá direto</span>
      <div class="v16DirectGrid">
        <button type="button" data-v16-action="library" class="v16Action v16CompactAction">
          <span aria-hidden="true">◎</span>
          <span class="v16ActionText"><strong>Protocolos</strong><small>Já sabe o que quer investigar?</small></span>
          <b class="v16Chevron" aria-hidden="true">›</b>
        </button>
        <button type="button" data-v16-action="divorce" class="v16Action v16CompactAction">
          <span aria-hidden="true">↯</span>
          <span class="v16ActionText"><strong>Divórcio Energético</strong><small>Fluxo individual ou coletivo</small></span>
          <b class="v16Chevron" aria-hidden="true">›</b>
        </button>
      </div>
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
