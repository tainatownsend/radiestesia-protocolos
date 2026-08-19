(function(){
'use strict';
const $=id=>document.getElementById(id);
const lang=()=>localStorage.getItem('lumera_language_v13')==='en'?'en':'pt';
const t=(pt,en)=>lang()==='en'?en:pt;
let busy=false;
function isVisible(id){const e=$(id);return !!(e&&!e.classList.contains('hidden'))}
function setStateClasses(){document.body.classList.toggle('v18HomeOpen',isVisible('homeView'));document.body.classList.toggle('v18AssessmentOpen',isVisible('assessmentView')||isVisible('reevalView'))}
function practitionerHTML(){return `<section id="v18PractitionerCompact" class="v18PractitionerCompact"><div><h2>${t('Jornada do terapeuta','Practitioner journey')}</h2><p>${t('Prepare uma vez no início do período e encerre somente quando terminar as atividades do dia.','Prepare once at the start of your work period and close only when you finish for the day.')}</p></div><div class="v18PractitionerActions"><button type="button" class="v18Prepare">${t('Preparar','Prepare')}</button><button type="button" class="v18CloseDay">${t('Encerrar dia','Close day')}</button></div></section>`}
function ensurePractitioner(){const home=$('homeView'),dash=$('v16Dashboard');if(!home||!dash)return;let c=$('v18PractitionerCompact');if(!c){dash.insertAdjacentHTML('afterend',practitionerHTML());c=$('v18PractitionerCompact')}else{const fresh=document.createElement('div');fresh.innerHTML=practitionerHTML();c.replaceWith(fresh.firstElementChild);c=$('v18PractitionerCompact')}
 c.querySelector('.v18Prepare')?.addEventListener('click',()=>{$('prepareSessionBtn')?.click()});
 c.querySelector('.v18CloseDay')?.addEventListener('click',()=>{$('closeSessionBtn')?.click()});
}
function simplifyDashboard(){const dash=$('v16Dashboard');if(!dash)return;const secondary=dash.querySelector('.v16Secondary');if(secondary){const practitioner=secondary.querySelector('[data-v16-action="practitioner"]');if(practitioner)practitioner.remove();const history=secondary.querySelector('[data-v16-action="history"]');if(history)history.textContent=t('Clientes e histórico','Clients & history')}
}
function removeLegacyHomeArtifacts(){const home=$('homeView');if(!home)return;home.querySelectorAll('.homeTools,.lumeraWorkspace,.sessionLauncher,.divorceLauncher,#v14Dashboard,.homeIntro,.howItWorks,.homeSection,.homeDivider').forEach(el=>{el.setAttribute('aria-hidden','true')})}
function cleanHome(){if(!isVisible('homeView'))return;simplifyDashboard();ensurePractitioner();removeLegacyHomeArtifacts()}
function routeLegacyJumps(e){const btn=e.target.closest?.('[data-v16-action="practitioner"]');if(btn){e.preventDefault();setTimeout(()=>$('v18PractitionerCompact')?.scrollIntoView({behavior:'smooth',block:'center'}),0)}}
function install(){document.addEventListener('click',routeLegacyJumps,true);const obs=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{setStateClasses();cleanHome();busy=false})});obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setStateClasses();cleanHome();window.addEventListener('lumera:languagechange',()=>{cleanHome();setStateClasses()});window.addEventListener('storage',()=>{cleanHome();setStateClasses()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
