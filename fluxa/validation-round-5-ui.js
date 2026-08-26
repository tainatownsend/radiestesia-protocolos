const STYLE='validation-round-5.css';
const HAWKINS_SELECTOR='[data-prep-frequency],[data-hawkins-baseline-form] [name="hertz"],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]';
const HAWKINS_LEVELS=[
  [700,'Iluminação'],[600,'Paz'],[540,'Alegria'],[500,'Amor'],[400,'Razão'],[350,'Aceitação'],[310,'Boa vontade'],[250,'Neutralidade'],[200,'Coragem'],[175,'Orgulho'],[150,'Raiva'],[125,'Desejo'],[100,'Medo'],[75,'Tristeza'],[50,'Apatia'],[30,'Culpa'],[20,'Vergonha']
];
let hawkinsCounter=0;

function ensureStyle(){
  if(document.querySelector(`link[href="${STYLE}"]`))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=STYLE;document.head.appendChild(link);
}
function normalizeText(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}
function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function isIdleHome(){
  const main=document.querySelector('#app > main:not([data-workspace-view])');
  return Boolean(main&&!document.querySelector('.session-indicator')&&main.querySelector('[data-action="start-session"],.hero-card'));
}
function reconcileIdleHome(){
  const idle=isIdleHome();
  document.body.classList.toggle('fluxa-home-idle',idle);
  if(!idle)return;
  const main=document.querySelector('#app > main:not([data-workspace-view])');
  main?.querySelectorAll('.section').forEach((section)=>{
    if(normalizeText(section).includes('Atividade recente')){
      section.classList.add('home-recent-history-hidden');
      section.hidden=true;
    }
  });
}
function compactSessionIndicator(){
  const indicator=document.querySelector('.topbar .session-indicator');
  if(!indicator)return;
  const current=normalizeText(indicator);
  const full=indicator.dataset.fullSessionLabel||current;
  if(!/^Sessão aberta\s*·/i.test(full))return;
  const compact=full.replace(/^Sessão aberta\s*·\s*/i,'Sessão · ');
  indicator.dataset.fullSessionLabel=full;
  indicator.setAttribute('aria-label',full);
  indicator.classList.add('session-indicator-mobile-compact');
  if(current!==compact)indicator.textContent=compact;
}
function resetScroll(){
  try{window.scrollTo(0,0);}catch(_){}
  if(document.scrollingElement)document.scrollingElement.scrollTop=0;
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}
function resetWorkspaceScroll(route){
  resetScroll();
  requestAnimationFrame(()=>{
    resetScroll();
    if(route==='history'||route==='acervo')document.querySelector(`[data-workspace-view="${route}"]`)?.scrollIntoView({block:'start'});
  });
  setTimeout(resetScroll,80);
}
function hawkinsHit(value){
  const n=Number(value);if(!Number.isFinite(n))return null;
  return HAWKINS_LEVELS.find(([hz])=>hz===n)||null;
}
function syncHawkinsLaunch(input){
  const id=input.id||`fluxa-hawkins-${++hawkinsCounter}`;
  if(!input.id)input.id=id;
  let button=document.querySelector(`[data-round5-hawkins-for="${CSS.escape(id)}"]`);
  if(!button){
    button=document.createElement('button');button.type='button';button.className='hawkins-scale-launch';button.dataset.round5HawkinsFor=id;
    const anchor=input.closest('label')||input.closest('.field')||input.closest('.hawkins-input')||input;
    anchor.insertAdjacentElement('afterend',button);
  }
  const hit=hawkinsHit(input.value);
  button.textContent=hit?`${hit[1]} · ${hit[0]===700?'700+':hit[0]} Hz — alterar`:'Escolher na escala de Hawkins';
}
function enhanceHawkinsLaunchers(){document.querySelectorAll(HAWKINS_SELECTOR).forEach(syncHawkinsLaunch);}
function closeHawkinsScale(){document.querySelector('#hawkins-scale-mobile-overlay')?.remove();}
function openHawkinsScale(input){
  closeHawkinsScale();
  const wrap=document.createElement('div');wrap.id='hawkins-scale-mobile-overlay';wrap.className='modal-backdrop hawkins-scale-mobile-overlay';
  wrap.innerHTML=`<section class="sheet hawkins-scale-mobile-sheet"><div class="sheet-head"><div><p class="eyebrow">Escala de Hawkins</p><h2>Escolha o nível medido</h2></div><button class="close-btn" type="button" data-close-round5-hawkins>×</button></div><p class="muted">Selecione um nível de referência. Se sua medição for intermediária, feche esta lista e digite o valor exato no campo.</p><div class="hawkins-scale-mobile-grid">${HAWKINS_LEVELS.map(([hz,emotion])=>`<button type="button" class="hawkins-scale-mobile-choice" data-round5-hawkins-choice="${hz}"><strong>${hz===700?'700+':hz} Hz</strong><span>${esc(emotion)}</span></button>`).join('')}</div></section>`;
  wrap.dataset.hawkinsInputId=input.id;
  document.body.appendChild(wrap);
}
function chooseHawkins(value,overlay){
  const id=overlay?.dataset.hawkinsInputId;if(!id)return;
  const input=document.getElementById(id);if(!input)return;
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  input.blur();
  closeHawkinsScale();
  syncHawkinsLaunch(input);
}
function enhance(){ensureStyle();reconcileIdleHome();compactSessionIndicator();enhanceHawkinsLaunchers();}

new MutationObserver(()=>queueMicrotask(enhance)).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);
window.addEventListener('fluxa:state-changed',()=>queueMicrotask(enhance));
document.addEventListener('input',(event)=>{if(event.target.matches?.(HAWKINS_SELECTOR))syncHawkinsLaunch(event.target);},true);
document.addEventListener('pointerdown',(event)=>{
  const routeButton=event.target.closest?.('[data-workspace-route]');
  if(routeButton)resetWorkspaceScroll(routeButton.dataset.workspaceRoute);
},true);
document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('button');if(!button)return;
  if(button.dataset.round5HawkinsFor){event.preventDefault();const input=document.getElementById(button.dataset.round5HawkinsFor);if(input)openHawkinsScale(input);return;}
  if(button.dataset.round5HawkinsChoice){event.preventDefault();chooseHawkins(button.dataset.round5HawkinsChoice,button.closest('#hawkins-scale-mobile-overlay'));return;}
  if(button.dataset.closeRound5Hawkins!==undefined){event.preventDefault();closeHawkinsScale();}
},true);
