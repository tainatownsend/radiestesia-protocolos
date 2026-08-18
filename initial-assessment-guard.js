(function(){
'use strict';
const STORE='rt_assessments_v1',ACTIVE='rt_active_assessment_v1';
const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch(e){return[]}}
function save(arr){try{localStorage.setItem(STORE,JSON.stringify(arr.slice(0,100)))}catch(e){}}
function hideAssessment(){document.getElementById('assessmentView')?.classList.add('hidden');document.getElementById('reevalView')?.classList.add('hidden')}
function clearAbandonedLink(){const id=localStorage.getItem(ACTIVE);if(!id)return;const arr=load(),i=arr.findIndex(x=>String(x.id)===String(id));if(i<0){localStorage.removeItem(ACTIVE);return}const a=arr[i];if(a.status==='protocol-pending'&&!a.linkedSessionId){a.status='assessment-only';a.completedAt=a.completedAt||new Date().toISOString();arr[i]=a;save(arr);localStorage.removeItem(ACTIVE)}}
function path(active){return '<div class="sessionPath linkedSessionPath"><span>1 Avaliação</span><span class="'+(active==='investigation'?'active':'')+'">2 Investigação</span><span class="'+(active==='treatment'?'active':'')+'">3 Tratamento</span><span>4 Reavaliação</span><span>5 Relatório</span></div>'}
function decorateStage(){if(!localStorage.getItem(ACTIVE))return;const map=[['startView','investigation'],['questionView','investigation'],['priorityView','investigation'],['causalView','investigation'],['treatmentView','treatment']];map.forEach(([id,stage])=>{const el=$(id);if(!el||el.classList.contains('hidden')||el.querySelector('.linkedSessionPath'))return;el.insertAdjacentHTML('afterbegin',path(stage))})}
function check(){const home=$('homeView'),history=$('historyView');if(home&&!home.classList.contains('hidden')){hideAssessment();clearAbandonedLink()}if(history&&!history.classList.contains('hidden'))hideAssessment();decorateStage()}
function install(){const o=new MutationObserver(check);['homeView','historyView','startView','questionView','priorityView','treatmentView','causalView'].forEach(id=>{const el=$(id);if(el)o.observe(el,{attributes:true,attributeFilter:['class']})});check()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();