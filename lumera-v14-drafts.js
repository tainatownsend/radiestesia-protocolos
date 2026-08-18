(function(){
'use strict';
const KEY='lumera_protocol_draft_v14';
const LANG='lumera_language_v13';
const t=(pt,en)=>localStorage.getItem(LANG)==='en'?en:pt;
let replaying=false;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}}
function clear(){localStorage.removeItem(KEY);document.getElementById('v14ProtocolResume')?.remove()}
function title(mode){return window.DATA?.[mode]?.title||mode}
function activeMode(){return document.querySelector('.tab.active')?.dataset.mode||null}
function recordStart(){const mode=activeMode();if(!mode||replaying)return;save({mode,answers:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});setTimeout(decorate,30)}
function recordAnswer(value){if(replaying)return;const d=load();if(!d)return;d.answers=Array.isArray(d.answers)?d.answers:[];d.answers.push(value);d.updatedAt=new Date().toISOString();save(d)}
function recordBack(){if(replaying)return;const d=load();if(!d||!d.answers?.length)return;d.answers.pop();d.updatedAt=new Date().toISOString();save(d)}
function resume(){const d=load();if(!d)return;const src=document.querySelector(`[data-open-mode="${d.mode}"]`);if(!src)return;replaying=true;src.click();setTimeout(()=>{document.getElementById('startBtn')?.click();let i=0;const next=()=>{if(i>=d.answers.length){replaying=false;return}const val=d.answers[i++];const b=document.querySelector(`.answer[data-answer="${val}"]`);if(!b){replaying=false;return}b.click();setTimeout(next,16)};setTimeout(next,30)},40)}
function decorate(){const d=load(),dash=document.getElementById('v14Dashboard');if(!dash)return;if(!d){document.getElementById('v14ProtocolResume')?.remove();return}let b=document.getElementById('v14ProtocolResume');if(!b){b=document.createElement('button');b.id='v14ProtocolResume';b.className='v14Resume v14ProtocolResume';const actions=dash.querySelector('.v14Actions');dash.insertBefore(b,actions)}const count=d.answers?.length||0;b.innerHTML=`<span class="v14ResumeIcon">↻</span><span><small>${t('Continuar investigação interrompida','Continue interrupted investigation')}</small><strong>${title(d.mode)}</strong><em>${count?`${count} ${t('respostas registradas','answers saved')}`:t('Investigação iniciada','Investigation started')}</em></span><span class="chevron">›</span>`;b.onclick=resume}
function install(){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='startBtn')recordStart();else if(b.matches('.answer[data-answer]'))recordAnswer(b.dataset.answer);else if(b.id==='backBtn')recordBack();else if(['toTreatmentBtn','makeReportBtn','newBtn'].includes(b.id))clear()},true);const o=new MutationObserver(()=>{if(document.getElementById('homeView')&&!document.getElementById('homeView').classList.contains('hidden'))decorate()});o.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});decorate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();