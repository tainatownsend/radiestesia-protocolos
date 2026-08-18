(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let state={items:[],phase:null,index:0,step:null,afterIndex:0,afterStep:null};
let bypassTreatment=false,bypassReport=false;

function ensureView(){
 if($('causalView'))return;
 const s=document.createElement('section');s.id='causalView';s.className='card hidden';
 s.innerHTML='<div class="questionTop"><span id="causalPill" class="pill">Validação causal</span><span id="causalCounter" class="muted"></span></div><div class="progress"><span id="causalProgress"></span></div><p id="causalMicro" class="microInstruction">Consulte o pêndulo</p><h2 id="causalTitle"></h2><p id="causalContext" class="causalContext muted"></p><div id="causalAnswers" class="answerGrid"><button class="answer yes" data-causal-answer="yes">Sim</button><button class="answer no" data-causal-answer="no">Não</button></div><div id="causalSummary" class="hidden"></div>';
 document.querySelector('main')?.appendChild(s);
 s.querySelectorAll('[data-causal-answer]').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.causalAnswer==='yes')));
}
function hideMain(){['homeView','startView','questionView','priorityView','treatmentView','reportView','historyView'].forEach(id=>$(id)?.classList.add('hidden'));$('causalView')?.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function findings(){return Array.from(document.querySelectorAll('#priorityList .check')).map((el,i)=>({id:'finding_'+i,label:el.querySelector('b')?.textContent.trim()||('Item '+(i+1)),command:(el.querySelector('small')?.textContent||'').replace(/^Comando sugerido:\s*/i,'').trim(),root:null,priorCause:null,priorIdentified:null,treat:null,priority:null,neutralized:null,followup:null,element:el}))}
function setQuestion(title,context,counter,pct){$('causalTitle').textContent=title;$('causalContext').textContent=context||'';$('causalCounter').textContent=counter;$('causalProgress').style.width=pct+'%';$('causalAnswers').classList.remove('hidden');$('causalSummary').classList.add('hidden')}
function startPre(){state={items:findings(),phase:'pre',index:0,step:'root',afterIndex:0,afterStep:null};window.__causalReview={export:exportState};if(!state.items.length){continueTreatment();return}hideMain();renderPre()}
function renderPre(){const it=state.items[state.index],n=state.items.length,p=Math.round(((state.index)+(state.step==='root'?0:.45))/n*100);if(!it){showPlan();return}
 const ctx='Achado: '+it.label;
 if(state.step==='root')setQuestion('Este achado é uma causa raiz ativa, e não apenas uma consequência?',ctx,(state.index+1)+' de '+n,p);
 else if(state.step==='prior')setQuestion('Há uma causa anterior a este achado que precisa ser considerada?',ctx,(state.index+1)+' de '+n,p);
 else if(state.step==='identified')setQuestion('Essa causa anterior já foi identificada em outro ramo desta investigação?',ctx,(state.index+1)+' de '+n,p);
 else if(state.step==='treat')setQuestion('Este achado deve ser tratado nesta sessão?',ctx,(state.index+1)+' de '+n,p);
 else if(state.step==='priority')setQuestion('Este achado precisa ser tratado antes dos demais itens identificados?',ctx,(state.index+1)+' de '+n,p);
}
function answerPre(yes){const it=state.items[state.index];
 if(state.step==='root'){it.root=yes;if(yes){state.step='treat'}else state.step='prior'}
 else if(state.step==='prior'){it.priorCause=yes;if(yes)state.step='identified';else state.step='treat'}
 else if(state.step==='identified'){it.priorIdentified=yes;state.step='treat'}
 else if(state.step==='treat'){it.treat=yes;if(yes)state.step='priority';else nextPre()}
 else if(state.step==='priority'){it.priority=yes;nextPre()}
 renderPre();}
function nextPre(){state.index++;state.step='root'}
function showPlan(){state.phase='plan';$('causalProgress').style.width='100%';$('causalCounter').textContent='Plano';$('causalMicro').textContent='Resultado da validação';$('causalTitle').textContent='Ordem sugerida para esta sessão';$('causalContext').textContent='A ordem abaixo segue exclusivamente as respostas registradas com o pêndulo.';$('causalAnswers').classList.add('hidden');const host=$('causalSummary');host.classList.remove('hidden');const ordered=orderedItems();host.innerHTML='<div class="causalPlan">'+ordered.map((it,i)=>`<div class="causalPlanItem"><span class="pill">${i+1}</span><div><b>${esc(it.label)}</b><small>${esc(classification(it))}</small></div></div>`).join('')+'</div><button id="causalContinue" class="primary wide">Continuar para tratamento</button>';$('#causalContinue').onclick=continueTreatment}
function classification(it){let a=it.root===true?'Causa raiz':it.priorCause===true?(it.priorIdentified===false?'Consequência • causa anterior ainda não delimitada':'Consequência de causa anterior'):'Fator intermediário / associado';if(it.treat===false)a+=' • não tratar nesta sessão';else if(it.priority===true)a+=' • prioridade';return a}
function orderedItems(){return state.items.slice().sort((a,b)=>Number(b.treat===true)-Number(a.treat===true)||Number(b.priority===true)-Number(a.priority===true)||Number(b.root===true)-Number(a.root===true))}
function continueTreatment(){
 const list=$('priorityList');if(list&&state.items.length){orderedItems().forEach(it=>{it.element.dataset.causal=classification(it);list.appendChild(it.element)})}
 $('causalView')?.classList.add('hidden');$('priorityView')?.classList.remove('hidden');bypassTreatment=true;$('toTreatmentBtn')?.click();setTimeout(annotateTreatment,40)}
function annotateTreatment(){const cards=Array.from(document.querySelectorAll('#treatmentItems .treatmentCard'));const ordered=orderedItems();cards.forEach((card,i)=>{const it=ordered[i];if(!it)return;card.querySelector('.causalBadge')?.remove();const p=document.createElement('p');p.className='causalBadge';p.textContent=classification(it);card.insertBefore(p,card.querySelector('.fieldTitle'));if(it.treat===false)card.classList.add('causalDeferred')})}
function startPost(){const todo=orderedItems().filter(x=>x.treat===true);if(!todo.length){continueReport();return}state.phase='post';state.afterItems=todo;state.afterIndex=0;state.afterStep='neutralized';hideMain();renderPost()}
function renderPost(){const arr=state.afterItems,it=arr[state.afterIndex],n=arr.length;if(!it){continueReport();return}const pct=Math.round((state.afterIndex+(state.afterStep==='neutralized'?0:.5))/n*100),ctx='Achado tratado: '+it.label;if(state.afterStep==='neutralized')setQuestion('Após o tratamento, este fator foi neutralizado suficientemente nesta sessão?',ctx,(state.afterIndex+1)+' de '+n,pct);else setQuestion('Este fator precisa de uma nova sessão específica de acompanhamento?',ctx,(state.afterIndex+1)+' de '+n,pct)}
function answerPost(yes){const it=state.afterItems[state.afterIndex];if(state.afterStep==='neutralized'){it.neutralized=yes;if(yes){it.followup=false;state.afterIndex++;state.afterStep='neutralized'}else state.afterStep='followup'}else{it.followup=yes;state.afterIndex++;state.afterStep='neutralized'}renderPost()}
function answer(yes){if(state.phase==='pre')answerPre(yes);else if(state.phase==='post')answerPost(yes)}
function continueReport(){$('causalView')?.classList.add('hidden');$('treatmentView')?.classList.remove('hidden');bypassReport=true;$('makeReportBtn')?.click();setTimeout(appendCausalReport,80)}
function appendCausalReport(){const body=$('reportBody');if(!body||!state.items.length)return;body.querySelector('.causalReport')?.remove();const sec=document.createElement('section');sec.className='card reportSection causalReport';sec.innerHTML='<h3>Validação causal e ordem de tratamento</h3>'+orderedItems().map((it,i)=>`<div class="reportTreatment"><h4>${i+1}. ${esc(it.label)}</h4><p><b>Classificação:</b> ${esc(classification(it))}</p>${it.treat===true?`<p><b>Validação após tratamento:</b> ${it.neutralized===true?'Neutralizado suficientemente nesta sessão':it.neutralized===false?(it.followup===true?'Não neutralizado • nova sessão indicada':'Não neutralizado • sem nova sessão indicada'):'Não registrada'}</p>`:''}</div>`).join('');body.appendChild(sec)}
function exportState(){return {items:state.items.map(({element,...x})=>x),ordered:orderedItems().map(x=>x.id)}}
function install(){ensureView();$('toTreatmentBtn')?.addEventListener('click',e=>{if(bypassTreatment){bypassTreatment=false;return}e.preventDefault();e.stopImmediatePropagation();startPre()},true);$('makeReportBtn')?.addEventListener('click',e=>{if(bypassReport){bypassReport=false;return}e.preventDefault();e.stopImmediatePropagation();startPost()},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();