(function(){
'use strict';
const $=id=>document.getElementById(id);
const visible=id=>{const e=$(id);return !!(e&&!e.classList.contains('hidden'))};
const VIEW_IDS=['homeView','startView','questionView','priorityView','causalView','treatmentView','reportView','historyView','assessmentView','reevalView','divorceView'];
let refreshTimer=null;

function live(){
  let el=$('v26Live');
  if(!el){el=document.createElement('div');el.id='v26Live';el.className='v26SrOnly';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
  return el;
}
function announce(msg){const el=live();el.textContent='';requestAnimationFrame(()=>el.textContent=msg)}

function hardenControls(root=document){
  root.querySelectorAll('button').forEach(b=>{if(!b.type)b.type='button'});
  root.querySelectorAll('input,textarea,select').forEach(el=>{
    if(el.matches('input[type="text"],input[type="search"],input[type="number"],textarea'))el.setAttribute('autocomplete',el.getAttribute('autocomplete')||'off');
    if(!el.getAttribute('aria-label')&&!el.closest('label')){
      const id=el.id,label=id?root.querySelector(`label[for="${CSS.escape(id)}"]`):null;
      const guess=label?.textContent?.trim()||el.previousElementSibling?.textContent?.trim();
      if(guess)el.setAttribute('aria-label',guess);
    }
  });
  root.querySelectorAll('details>summary').forEach(s=>{if(!s.hasAttribute('tabindex'))s.tabIndex=0});
}

function activeView(){return VIEW_IDS.find(visible)||null}
function syncNav(){
  const nav=$('v23BottomNav');if(!nav)return;
  const v=activeView();
  const active=v==='homeView'?'home':v==='historyView'?'history':['startView','questionView','priorityView','causalView','treatmentView','reportView','assessmentView','reevalView','divorceView'].includes(v)?'session':null;
  nav.querySelectorAll('button[data-v23]').forEach(b=>{
    const on=b.dataset.v23===active;
    b.classList.toggle('active',on);
    if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}

function headingForView(){const v=activeView();return v?$(v)?.querySelector('h1,h2,[role="heading"]')||null:null}
function prepareHeadingFocus(){const h=headingForView();if(!h)return;h.classList.add('v26FocusTarget');if(!h.hasAttribute('tabindex'))h.tabIndex=-1}

function auditOverflow(){
  const width=document.documentElement.clientWidth;
  const offenders=[...document.querySelectorAll('main *,header *,#v23BottomNav *')].filter(el=>{
    if(el.closest('.hidden'))return false;
    const r=el.getBoundingClientRect();return r.width>width+2||r.right>width+2||r.left<-2;
  }).slice(0,8);
  offenders.forEach(el=>el.classList.add('v26OverflowGuard'));
  if(offenders.length)console.warn('QA: overflow horizontal corrigido',offenders);
}

function emptyStateAudit(){
  if(!visible('treatmentView'))return;
  const findings=(()=>{try{return JSON.parse(localStorage.getItem('lumera_treatment_findings_v24')||'[]')}catch(e){return[]}})();
  const cards=document.querySelectorAll('#treatmentItems .treatmentCard').length;
  if(findings.length&&!cards&&!$('v24Validation'))announce('Há achados identificados. Revise a seleção antes de concluir.');
}

function smokeAudit(){
  const required=['homeView','historyView','historyBtn','headerHomeBtn','startBtn','toTreatmentBtn','makeReportBtn'];
  const missing=required.filter(id=>!$(id));
  if(missing.length)console.error('QA: elementos essenciais ausentes',missing);
  const counts=[...document.querySelectorAll('[id]')].reduce((m,e)=>(m[e.id]=(m[e.id]||0)+1,m),{});
  const duplicateIds=Object.entries(counts).filter(([,n])=>n>1).map(([id])=>id);
  if(duplicateIds.length)console.warn('QA: IDs duplicados',duplicateIds);
}

function refresh({focus=false}={}){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
    hardenControls();
    syncNav();
    prepareHeadingFocus();
    emptyStateAudit();
    auditOverflow();
    if(focus){const h=headingForView();h?.focus({preventScroll:true});h?.scrollIntoView({block:'start',behavior:'auto'})}
    document.body.classList.add('v26Ready');
  },55);
}

function install(){
  live();smokeAudit();refresh();
  window.addEventListener('click',e=>{
    const b=e.target.closest?.('button,[role="button"]');if(!b)return;
    const navigation=!!b.closest('#v23BottomNav')||b.id==='historyBtn'||b.id==='closeHistory'||b.id==='headerHomeBtn'||b.id==='newBtn'||b.classList.contains('backHome')||b.hasAttribute('data-open-mode')||b.hasAttribute('data-resume')||b.hasAttribute('data-open')||b.id==='openDivorceBtn';
    refresh({focus:navigation});
  },false);
  window.addEventListener('input',e=>{if(e.target.matches('input,textarea,select'))setTimeout(auditOverflow,0)},false);
  window.addEventListener('resize',()=>refresh(),{passive:true});
  window.addEventListener('orientationchange',()=>refresh());
  window.addEventListener('pageshow',()=>refresh());
  window.addEventListener('storage',()=>refresh());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')refresh({focus:true})});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
