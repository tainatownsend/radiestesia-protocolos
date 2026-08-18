(function(){
'use strict';
const $=id=>document.getElementById(id);
const FLOW_STORE='lumera_practitioner_flows_v1';
const ACTIVE_ASSESSMENT='rt_active_assessment_v1';
const ASSESSMENT_STORE='rt_assessments_v1';
const SESSION_STORE='rt_sessions_v4';
const DIVORCE_STORE='rt_divorce_sessions_v1';
const PREP_GROUPS=[
 ['Centro e presença',['Respirar profundamente por alguns minutos','Silenciar a mente e estabilizar as emoções','Perceber o próprio corpo e chegar ao momento presente']],
 ['Limpeza pessoal',['Fazer uma breve varredura ou limpeza conforme a sua prática','Liberar tensões, pensamentos ou emoções acumuladas antes de iniciar']],
 ['Proteção e limites',['Estabelecer a proteção vibracional utilizada na sua prática','Reforçar a intenção de manter limites claros entre terapeuta e cliente']],
 ['Conexão com o pêndulo',['Segurar o pêndulo e aguardar a estabilização','Conferir o movimento neutro','Perguntar se há condições adequadas para trabalhar neste momento']],
 ['Ambiente',['Organizar os objetos de trabalho','Reduzir distrações físicas e digitais','Verificar conforto, silêncio e condições do espaço']],
 ['Intenção da sessão',['Definir com clareza o objetivo do trabalho','Estabelecer intenção de clareza, precisão e respeito aos limites da prática']],
 ['Estado emocional e ético',['Confirmar que estou emocionalmente estável para conduzir a sessão','Entrar em postura neutra, sem buscar induzir respostas','Reconhecer os limites da prática e encaminhar questões concretas quando necessário']],
 ['Prontidão',['Confirmar que me sinto centrada(o), presente e pronta(o) para iniciar']]
];
const CLOSE_GROUPS=[
 ['Validação',['Confirmar se o trabalho previsto para esta sessão foi concluído ou se exige acompanhamento','Registrar qualquer ponto que deva ser retomado posteriormente']],
 ['Encerramento do campo',['Encerrar formalmente a sessão dentro da sua prática','Desconectar o testemunho, cliente ou grupo do campo de trabalho']],
 ['Limpeza e centramento',['Liberar simbolicamente o que não me pertence','Realizar a limpeza pessoal e do espaço conforme a sua prática','Retornar a atenção ao corpo e ao ambiente presente']],
 ['Registro',['Confirmar que gráficos, tempos, observações e resultados foram registrados','Salvar ou gerar o relatório quando necessário']],
 ['Pós-sessão',['Organizar os materiais utilizados','Fazer uma pausa breve antes de iniciar outra sessão']]
];
function parse(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}}
function flows(){try{return JSON.parse(localStorage.getItem(FLOW_STORE)||'[]')}catch(e){return[]}}
function saveFlows(arr){try{localStorage.setItem(FLOW_STORE,JSON.stringify(arr.slice(0,100)))}catch(e){console.error('Lumera: não foi possível salvar o fluxo do terapeuta',e)}}
function latest(arr){return Array.isArray(arr)&&arr.length?arr[0]:null}
function day(){return new Date().toISOString().slice(0,10)}
function stamp(){return new Date().toISOString()}
function activeAssessment(){
 let raw=null;try{raw=JSON.parse(localStorage.getItem(ACTIVE_ASSESSMENT)||'null')}catch(e){}
 const all=parse(ASSESSMENT_STORE);
 if(raw&&typeof raw==='object')return raw;
 if(raw!==null){const byId=all.find(x=>String(x.id)===String(raw));if(byId)return byId}
 return all.find(x=>x.status==='draft')||latest(all);
}
function personLabel(a){
 if(!a)return 'Nenhuma avaliação vinculada';
 const id=a.identity||{};
 if(id.sessionType==='collective'){const n=(id.participants||[]).filter(p=>p.name).length;return n?`Sessão coletiva • ${n} participantes`:'Sessão coletiva'}
 return id.name||'Sessão individual';
}
function stageData(){
 const a=activeAssessment(),sessions=parse(SESSION_STORE),divorce=parse(DIVORCE_STORE),f=flows();
 const recentPrep=f.find(x=>x.type==='prepare'&&x.date===day()),recentClose=f.find(x=>x.type==='close'&&x.date===day());
 let treatment=false,report=false,reeval=false,investigation=false,standalone=false;
 if(a){
   investigation=!!a.linkedSessionId;
   const s=sessions.find(x=>String(x.id)===String(a.linkedSessionId));
   if(s){treatment=(s.treatment||[]).length>0;report=s.final!==null&&s.final!==undefined;reeval=!!a.reevaluatedAt}
 }
 if(!a){const s=latest(sessions);if(s){standalone=true;investigation=true;treatment=(s.treatment||[]).length>0;report=s.final!==null&&s.final!==undefined}}
 const d=latest(divorce);if(d&&d.status==='completed'){standalone=true;investigation=true;treatment=true;reeval=Object.keys(d.rescan||{}).length>0;report=true}
 return {a,recentPrep,recentClose,investigation,treatment,reeval,report,standalone};
}
function ensureOverlay(){if($('practitionerView'))return;const v=document.createElement('div');v.id='practitionerView';v.className='practitionerView hidden';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.innerHTML='<div class="practitionerPanel"><div id="practitionerContent"></div></div>';document.body.appendChild(v)}
function flowHTML(type){
 const prep=type==='prepare',groups=prep?PREP_GROUPS:CLOSE_GROUPS,title=prep?'Preparar sessão':'Encerrar sessão',copy=prep?'Um roteiro curto para chegar à sessão com presença, intenção e limites claros. Marque apenas o que fizer sentido dentro da sua prática.':'Finalize o trabalho, registre pendências e saia da sessão com clareza sobre o que foi concluído.';
 return `<div class="practitionerHeader"><span class="micro">Lumera • ${prep?'Antes da sessão':'Depois da sessão'}</span><h2>${title}</h2><p>${copy}</p></div><div class="practitionerBody"><form id="practiceForm">${groups.map((g,gi)=>`<section class="practiceGroup"><h3>${gi+1}. ${g[0]}</h3>${g[1].map((t,i)=>`<label class="practiceCheck"><input type="checkbox" name="c_${gi}_${i}"><span>${t}</span></label>`).join('')}</section>`).join('')}<div class="practiceNote"><label for="practiceNotes"><b>Observações</b> <span class="muted">opcional</span></label><textarea id="practiceNotes" placeholder="Algo que deseja registrar sobre este momento..."></textarea></div><div class="practitionerActions"><button id="cancelPractice" type="button" class="ghost">Cancelar</button><button type="submit" class="primary">${prep?'Estou pronta(o) para iniciar':'Concluir encerramento'}</button></div></form></div>`;
}
function openFlow(type){
 ensureOverlay();const v=$('practitionerView'),c=$('practitionerContent');c.innerHTML=flowHTML(type);v.classList.remove('hidden');document.body.style.overflow='hidden';
 $('cancelPractice').onclick=closeOverlay;
 $('practiceForm').onsubmit=e=>{e.preventDefault();const checks=Array.from(e.currentTarget.querySelectorAll('input[type=checkbox]'));const item={id:Date.now(),type,date:day(),createdAt:stamp(),completed:checks.filter(x=>x.checked).length,total:checks.length,notes:$('practiceNotes').value||''};const arr=flows();arr.unshift(item);saveFlows(arr);closeOverlay();renderWorkspace();if(type==='prepare')$('startAssessmentBtn')?.focus()}
}
function closeOverlay(){$('practitionerView')?.classList.add('hidden');document.body.style.overflow=''}
function dashboardHTML(){
 const d=stageData(),a=d.a,stages=[['Preparação',!!d.recentPrep],['Avaliação',!!a],['Investigação',d.investigation],['Tratamento',d.treatment],['Reavaliação',d.reeval],['Relatório',d.report],['Encerramento',!!d.recentClose]];
 let active=stages.findIndex(x=>!x[1]);if(active<0)active=stages.length-1;
 const life=a?.lifeAreas||{},vals=Object.entries(life).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>[k,Number(v)]).sort((x,y)=>y[1]-x[1]);
 const names={family:'Familiar',affective:'Relacionamento',professional:'Profissional',financial:'Financeiro',mission:'Missão de vida'},worst=vals[0];
 const vib=a?.vibration?.hz?`${a.vibration.hz} Hz${a.vibration.label?' • '+a.vibration.label:''}`:'Não aferida';
 const next=!d.recentPrep?'Preparar sessão':!a&&!d.standalone?'Avaliação inicial':!d.investigation?'Escolher investigação':!d.treatment?'Realizar tratamento':!d.reeval&&a?'Reavaliar':!d.report?'Concluir e gerar relatório':!d.recentClose?'Encerrar sessão':'Sessão concluída';
 return `<section class="sessionDashboard"><div class="sessionDashboardHead"><div><h3>${(a||d.standalone)?'Sessão em andamento':'Dashboard da sessão'}</h3><p>${a?personLabel(a):d.standalone?'Sessão iniciada diretamente por protocolo':'Organize o próximo atendimento em um só lugar'}</p></div><span class="sessionStatus">${d.recentClose?'Encerrada hoje':(a||d.standalone)?'Em andamento':'Pronto para iniciar'}</span></div><div class="sessionTimeline">${stages.map((s,i)=>`<div class="sessionStage ${s[1]?'done':i===active?'active':''}">${s[1]?'✓ ':''}${s[0]}</div>`).join('')}</div><div class="dashboardFacts"><div class="dashboardFact"><small>Frequência vibracional</small><strong>${vib}</strong></div><div class="dashboardFact"><small>Área que mais pede atenção</small><strong>${worst?(names[worst[0]]||worst[0])+' • '+worst[1]+'%':'Ainda não aferida'}</strong></div><div class="dashboardFact"><small>Próximo passo</small><strong>${next}</strong></div></div></section>`;
}
function workspaceHTML(){return `<section class="lumeraWorkspace"><div class="lumeraHero"><small>Lumera • Radiestesia Terapêutica</small><h2>Um espaço para conduzir a sessão do início ao encerramento.</h2><p>Prepare-se, organize a avaliação, conduza a investigação e registre o tratamento sem perder o contexto da sessão.</p><div class="lumeraQuickActions"><button id="prepareSessionBtn" class="primaryLumera" type="button">Preparar sessão</button><button id="jumpAssessmentBtn" type="button">Nova sessão completa</button><button id="closeSessionBtn" type="button">Encerrar sessão</button></div></div>${dashboardHTML()}</section>`}
function renderWorkspace(){const home=$('homeView');if(!home)return;let w=home.querySelector('.lumeraWorkspace');if(!w){w=document.createElement('div');w.className='lumeraWorkspace';home.querySelector('.homeIntro')?.after(w)}w.outerHTML=workspaceHTML();bindWorkspace()}
function bindWorkspace(){$('prepareSessionBtn')?.addEventListener('click',()=>openFlow('prepare'));$('closeSessionBtn')?.addEventListener('click',()=>openFlow('close'));$('jumpAssessmentBtn')?.addEventListener('click',()=>{const b=$('startAssessmentBtn');if(b)b.click();else document.querySelector('.sessionLauncher')?.scrollIntoView({behavior:'smooth',block:'start'})})}
function decorateBrand(){document.title='Lumera — Radiestesia Terapêutica';const b=$('headerHomeBtn');if(b){b.textContent='Lumera';b.setAttribute('aria-label','Voltar ao início do Lumera')}const footer=document.querySelector('footer');if(footer&&!footer.querySelector('.lumeraFooterMark')){const s=document.createElement('span');s.className='lumeraFooterMark';s.textContent='Lumera • Radiestesia Terapêutica';footer.appendChild(s)}}
function addClosePrompt(){
 const report=$('reportView');if(report&&!report.classList.contains('hidden')&&!report.querySelector('.reportClosePrompt')){const actions=report.querySelector('.noPrint')||report.lastElementChild;if(actions){const box=document.createElement('div');box.className='reportClosePrompt noPrint';box.innerHTML='<b>Antes de finalizar</b><p>Use o encerramento guiado para fechar o campo de trabalho, registrar pendências e concluir a sessão.</p><button type="button" class="ghost wide" id="reportCloseSession">Encerrar sessão</button>';actions.prepend(box);$('reportCloseSession').onclick=()=>openFlow('close')}}
 const divorce=$('divorceView');if(divorce&&!divorce.classList.contains('hidden')&&!divorce.querySelector('.divorceClosePrompt')){const printBtn=Array.from(divorce.querySelectorAll('button')).find(b=>/pdf|imprimir/i.test(b.textContent||''));if(printBtn){const box=document.createElement('div');box.className='reportClosePrompt divorceClosePrompt noPrint';box.innerHTML='<b>Fechamento do terapeuta</b><p>Depois de salvar o resultado, finalize também seu próprio fluxo de encerramento.</p><button type="button" class="ghost wide">Encerrar sessão</button>';printBtn.parentElement?.appendChild(box);box.querySelector('button').onclick=()=>openFlow('close')}}
}
function observe(){const observer=new MutationObserver(()=>{decorateBrand();if($('homeView')&&!$('homeView').classList.contains('hidden'))renderWorkspace();addClosePrompt()});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});window.addEventListener('storage',()=>renderWorkspace());document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderWorkspace()})}
function install(){ensureOverlay();decorateBrand();renderWorkspace();addClosePrompt();observe()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
