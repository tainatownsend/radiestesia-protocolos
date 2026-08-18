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
 ['Proteção e limites',['Estabelecer a proteção vibracional utilizada na sua prática','Reforçar a intenção de manter limites claros entre terapeuta e clientes']],
 ['Conexão com o pêndulo',['Segurar o pêndulo e aguardar a estabilização','Conferir o movimento neutro','Perguntar se há condições adequadas para trabalhar neste período']],
 ['Ambiente',['Organizar os objetos de trabalho','Reduzir distrações físicas e digitais','Verificar conforto, silêncio e condições do espaço']],
 ['Intenção do período de trabalho',['Definir com clareza a intenção para os atendimentos e análises','Estabelecer intenção de clareza, precisão e respeito aos limites da prática']],
 ['Estado emocional e ético',['Confirmar que estou emocionalmente estável para conduzir os trabalhos','Entrar em postura neutra, sem buscar induzir respostas','Reconhecer os limites da prática e encaminhar questões concretas quando necessário']],
 ['Prontidão',['Confirmar que me sinto centrada(o), presente e pronta(o) para iniciar as atividades']]
];
const CLOSE_GROUPS=[
 ['Revisão do dia',['Confirmar se os trabalhos previstos para hoje foram concluídos ou se exigem acompanhamento','Registrar qualquer ponto que deva ser retomado em outro momento']],
 ['Encerramento do campo de trabalho',['Encerrar formalmente o período de atividades dentro da sua prática','Desconectar testemunhos, clientes ou grupos utilizados ao longo do período']],
 ['Limpeza e centramento',['Liberar simbolicamente o que não me pertence','Realizar a limpeza pessoal e do espaço conforme a sua prática','Retornar a atenção ao corpo e ao ambiente presente']],
 ['Registros',['Confirmar que gráficos, tempos, observações e resultados importantes foram registrados','Salvar ou gerar os relatórios necessários antes de finalizar']],
 ['Fechamento',['Organizar os materiais utilizados','Confirmar que não há mais análises ou tratamentos previstos para hoje','Fazer uma pausa e encerrar as atividades']]
];
function parse(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}}
function flows(){try{return JSON.parse(localStorage.getItem(FLOW_STORE)||'[]')}catch(e){return[]}}
function saveFlows(arr){try{localStorage.setItem(FLOW_STORE,JSON.stringify(arr.slice(0,100)))}catch(e){console.error('Lumera: não foi possível salvar o fluxo do terapeuta',e)}}
function latest(arr){return Array.isArray(arr)&&arr.length?arr[0]:null}
function day(){return new Date().toISOString().slice(0,10)}
function stamp(){return new Date().toISOString()}
function sameDay(iso){return iso&&String(iso).slice(0,10)===day()}
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
function todayActivity(){
 const assessments=parse(ASSESSMENT_STORE).filter(x=>sameDay(x.createdAt)||sameDay(x.completedAt));
 const sessions=parse(SESSION_STORE).filter(x=>sameDay(x.date));
 const divorces=parse(DIVORCE_STORE).filter(x=>sameDay(x.createdAt)||sameDay(x.completedAt));
 const all=[...assessments.map(x=>({t:x.createdAt||x.completedAt,type:'Avaliação'})),...sessions.map(x=>({t:x.date,type:'Protocolo'})),...divorces.map(x=>({t:x.createdAt||x.completedAt,type:'Divórcio Energético'}))].filter(x=>x.t);
 all.sort((a,b)=>new Date(b.t)-new Date(a.t));
 return {count:assessments.length+sessions.length+divorces.length,last:all[0]||null};
}
function stageData(){
 const a=activeAssessment(),sessions=parse(SESSION_STORE),divorce=parse(DIVORCE_STORE),f=flows(),activity=todayActivity();
 const recentPrep=f.find(x=>x.type==='prepare'&&x.date===day());
 const lastClose=f.find(x=>x.type==='close'&&x.date===day());
 const reopened=!!(lastClose&&activity.last&&new Date(activity.last.t)>new Date(lastClose.createdAt));
 const dayClosed=!!lastClose&&!reopened;
 let treatment=false,report=false,reeval=false,investigation=false,standalone=false;
 if(a){
   investigation=!!a.linkedSessionId;
   const s=sessions.find(x=>String(x.id)===String(a.linkedSessionId));
   if(s){treatment=(s.treatment||[]).length>0;report=s.final!==null&&s.final!==undefined;reeval=!!a.reevaluatedAt}
 }
 if(!a){const s=latest(sessions);if(s){standalone=true;investigation=true;treatment=(s.treatment||[]).length>0;report=s.final!==null&&s.final!==undefined}}
 const d=latest(divorce);if(d&&d.status==='completed'){standalone=true;investigation=true;treatment=true;reeval=Object.keys(d.rescan||{}).length>0;report=true}
 return {a,recentPrep,lastClose,dayClosed,reopened,activity,investigation,treatment,reeval,report,standalone};
}
function ensureOverlay(){if($('practitionerView'))return;const v=document.createElement('div');v.id='practitionerView';v.className='practitionerView hidden';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.innerHTML='<div class="practitionerPanel"><div id="practitionerContent"></div></div>';document.body.appendChild(v)}
function flowHTML(type){
 const prep=type==='prepare',groups=prep?PREP_GROUPS:CLOSE_GROUPS,title=prep?'Preparar atividades':'Encerrar atividades do dia',copy=prep?'Faça esta preparação uma vez antes de iniciar seu período de análises e tratamentos. Você pode conduzir várias sessões depois sem repetir este checklist.':'Use este encerramento quando não pretende realizar mais análises ou tratamentos hoje.';
 return `<div class="practitionerHeader"><span class="micro">Lumera • ${prep?'Início do período':'Fim do período'}</span><h2>${title}</h2><p>${copy}</p></div><div class="practitionerBody"><form id="practiceForm">${groups.map((g,gi)=>`<section class="practiceGroup"><h3>${gi+1}. ${g[0]}</h3>${g[1].map((t,i)=>`<label class="practiceCheck"><input type="checkbox" name="c_${gi}_${i}"><span>${t}</span></label>`).join('')}</section>`).join('')}<div class="practiceNote"><label for="practiceNotes"><b>Observações</b> <span class="muted">opcional</span></label><textarea id="practiceNotes" placeholder="Algo que deseja registrar sobre este momento..."></textarea></div><div class="practitionerActions"><button id="cancelPractice" type="button" class="ghost">Cancelar</button><button type="submit" class="primary">${prep?'Iniciar atividades':'Encerrar atividades de hoje'}</button></div></form></div>`;
}
function openFlow(type){
 ensureOverlay();const d=stageData();
 if(type==='prepare'&&d.recentPrep&&!d.dayClosed){if(!confirm('A preparação de hoje já foi registrada. Deseja refazê-la?'))return}
 if(type==='close'&&d.dayClosed){if(!confirm('As atividades de hoje já foram encerradas. Deseja registrar um novo encerramento?'))return}
 const v=$('practitionerView'),c=$('practitionerContent');c.innerHTML=flowHTML(type);v.classList.remove('hidden');document.body.style.overflow='hidden';
 $('cancelPractice').onclick=closeOverlay;
 $('practiceForm').onsubmit=e=>{e.preventDefault();const checks=Array.from(e.currentTarget.querySelectorAll('input[type=checkbox]'));const item={id:Date.now(),type,date:day(),createdAt:stamp(),completed:checks.filter(x=>x.checked).length,total:checks.length,notes:$('practiceNotes').value||''};const arr=flows();arr.unshift(item);saveFlows(arr);closeOverlay();renderWorkspace();if(type==='prepare')$('startAssessmentBtn')?.focus()}
}
function closeOverlay(){$('practitionerView')?.classList.add('hidden');document.body.style.overflow=''}
function dashboardHTML(){
 const d=stageData(),a=d.a;
 const workflow=[['Preparação do dia',!!d.recentPrep],['Avaliação',!!a],['Investigação',d.investigation],['Tratamento',d.treatment],['Reavaliação',d.reeval],['Relatório',d.report]];
 let active=workflow.findIndex(x=>!x[1]);if(active<0)active=workflow.length-1;
 const life=a?.lifeAreas||{},vals=Object.entries(life).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>[k,Number(v)]).sort((x,y)=>y[1]-x[1]);
 const names={family:'Familiar',affective:'Relacionamento',professional:'Profissional',financial:'Financeiro',mission:'Missão de vida'},worst=vals[0];
 const vib=a?.vibration?.hz?`${a.vibration.hz} Hz${a.vibration.label?' • '+a.vibration.label:''}`:'Não aferida';
 const next=d.dayClosed?'Atividades encerradas por hoje':!d.recentPrep?'Preparar atividades':!a&&!d.standalone?'Iniciar uma análise ou sessão':!d.investigation?'Escolher investigação':!d.treatment?'Realizar tratamento':!d.reeval&&a?'Reavaliar':!d.report?'Concluir e gerar relatório':'Continuar com outra análise ou encerrar o dia';
 const status=d.dayClosed?'Dia encerrado':d.recentPrep?'Período preparado':'Aguardando preparação';
 return `<section class="sessionDashboard"><div class="sessionDashboardHead"><div><h3>Jornada de trabalho de hoje</h3><p>${d.activity.count?`${d.activity.count} registro${d.activity.count===1?'':'s'} de análise/tratamento hoje`:'Nenhuma análise registrada ainda hoje'}</p></div><span class="sessionStatus ${d.dayClosed?'closed':''}">${status}</span></div><div class="sessionTimeline">${workflow.map((s,i)=>`<div class="sessionStage ${s[1]?'done':i===active?'active':''}">${s[1]?'✓ ':''}${s[0]}</div>`).join('')}</div><div class="dashboardFacts"><div class="dashboardFact"><small>Frequência vibracional atual</small><strong>${vib}</strong></div><div class="dashboardFact"><small>Área que mais pede atenção</small><strong>${worst?(names[worst[0]]||worst[0])+' • '+worst[1]+'%':'Ainda não aferida'}</strong></div><div class="dashboardFact"><small>Próximo passo</small><strong>${next}</strong></div></div></section>`;
}
function workspaceHTML(){const d=stageData();return `<section class="lumeraWorkspace"><div class="lumeraHero compactHero"><div><small>Lumera • Jornada do terapeuta</small><h2>${d.dayClosed?'Atividades encerradas por hoje':'Prepare uma vez. Trabalhe em quantas análises precisar.'}</h2><p>${d.dayClosed?'Se você iniciar um novo trabalho depois do encerramento, o Lumera reabre automaticamente a jornada do dia.':'A preparação vale para seu período de trabalho. Faça várias avaliações, protocolos e tratamentos e encerre somente quando terminar as atividades do dia.'}</p></div><div class="lumeraQuickActions"><button id="prepareSessionBtn" class="primaryLumera" type="button">${d.recentPrep&&!d.dayClosed?'Preparação concluída':'Preparar atividades'}</button><button id="jumpAssessmentBtn" type="button">Nova análise</button><button id="closeSessionBtn" type="button">Encerrar o dia</button></div></div>${dashboardHTML()}</section>`}
function renderWorkspace(){const home=$('homeView');if(!home)return;let w=home.querySelector('.lumeraWorkspace');if(!w){w=document.createElement('div');w.className='lumeraWorkspace';home.querySelector('.homeIntro')?.after(w)}w.outerHTML=workspaceHTML();bindWorkspace()}
function bindWorkspace(){$('prepareSessionBtn')?.addEventListener('click',()=>openFlow('prepare'));$('closeSessionBtn')?.addEventListener('click',()=>openFlow('close'));$('jumpAssessmentBtn')?.addEventListener('click',()=>{const b=$('startAssessmentBtn');if(b)b.click();else document.querySelector('.sessionLauncher')?.scrollIntoView({behavior:'smooth',block:'start'})})}
function decorateBrand(){document.title='Lumera — Radiestesia Terapêutica';const b=$('headerHomeBtn');if(b){b.textContent='Lumera';b.setAttribute('aria-label','Voltar ao início do Lumera')}const footer=document.querySelector('footer');if(footer&&!footer.querySelector('.lumeraFooterMark')){const s=document.createElement('span');s.className='lumeraFooterMark';s.textContent='Lumera • Radiestesia Terapêutica';footer.appendChild(s)}}
function addContinuePrompt(){
 const report=$('reportView');if(report&&!report.classList.contains('hidden')&&!report.querySelector('.reportClosePrompt')){const actions=report.querySelector('.noPrint')||report.lastElementChild;if(actions){const box=document.createElement('div');box.className='reportClosePrompt noPrint';box.innerHTML='<b>O que deseja fazer agora?</b><p>Este relatório conclui esta análise, mas não encerra seu período de trabalho. Você pode iniciar outra análise ou voltar ao painel e encerrar as atividades apenas quando terminar o dia.</p><div class="reportDayActions"><button type="button" class="ghost" id="reportAnotherAnalysis">Nova análise</button><button type="button" class="ghost" id="reportBackHome">Voltar ao Lumera</button></div>';actions.prepend(box);$('reportAnotherAnalysis').onclick=()=>{document.getElementById('newBtn')?.click();setTimeout(()=>$('startAssessmentBtn')?.click(),80)};$('reportBackHome').onclick=()=>document.getElementById('newBtn')?.click()}}
 const divorce=$('divorceView');if(divorce&&!divorce.classList.contains('hidden')&&!divorce.querySelector('.divorceClosePrompt')){const printBtn=Array.from(divorce.querySelectorAll('button')).find(b=>/pdf|imprimir/i.test(b.textContent||''));if(printBtn){const box=document.createElement('div');box.className='reportClosePrompt divorceClosePrompt noPrint';box.innerHTML='<b>Tratamento concluído</b><p>Este trabalho foi finalizado. Volte ao Lumera para iniciar outra análise ou encerre as atividades somente quando terminar seu período de trabalho.</p>';printBtn.parentElement?.appendChild(box)}}
}
function observe(){let timer;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{decorateBrand();if($('homeView')&&!$('homeView').classList.contains('hidden'))renderWorkspace();addContinuePrompt()},30)});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});window.addEventListener('storage',()=>renderWorkspace());document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderWorkspace()})}
function install(){ensureOverlay();decorateBrand();renderWorkspace();addContinuePrompt();observe()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();