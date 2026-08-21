import { createStore } from './store.js';
import { confirmFindings } from './domain.js';
import { confirmBranchingFindings } from './protocol-engine.js';

const store=createStore();
let pendingFindingIds=[];
let enhancing=false;
const FAVORITES_KEY='fluxa.protocolFavorites';
const RECENTS_KEY='fluxa.protocolRecents';

function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function safeJsonGet(key,fallback=[]){try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(parsed)?parsed:fallback;}catch(_){return fallback;}}
function safeJsonSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(_){}}
function safeTime(value){const t=new Date(value||'').getTime();return Number.isFinite(t)?t:null;}
function fmt(value){const t=safeTime(value);return t==null?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(t));}
function statusLabel(value){return ({IN_PROGRESS:'Em andamento',PLANNED:'Planejado',INTERRUPTED:'Interrompido',COMPLETED:'Concluído'})[value]||'Registrado';}
function classificationLabel(value){return ({CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',FACTOR_RELEVANT:'Fator relevante',DEEPEN:'Item a aprofundar'})[value]||'Achado';}
function closeCompletion(){document.querySelector('#ux-findings-completion-overlay')?.remove();}

function findingsCompletion(ids){
  if(!ids.length)return;
  const state=store.getState();const findings=ids.map((id)=>state.findings.find((f)=>f.id===id)).filter(Boolean);
  if(!findings.length)return;
  closeCompletion();
  const wrap=document.createElement('div');wrap.id='ux-findings-completion-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet ux-completion-sheet"><div class="sheet-head"><div><p class="eyebrow">Investigação concluída</p><h2>Achados registrados</h2></div><button class="close-btn" data-ux-findings-back>×</button></div><div class="ux-complete-mark">✓</div><div class="stack">${findings.map((f)=>`<article class="card soft"><p class="eyebrow">${esc(classificationLabel(f.classification))}</p><strong>${esc(f.title||f.questionTextSnapshot||'Achado registrado')}</strong></article>`).join('')}</div><section class="section"><p class="eyebrow">Próximo passo</p><div class="stack"><button class="btn primary wide" data-ux-findings-treat>Iniciar tratamento</button><button class="btn secondary wide" data-ux-findings-investigate>Continuar investigando</button><button class="btn ghost wide" data-ux-findings-back>Voltar à sessão</button></div></section></section>`;
  document.body.appendChild(wrap);
}

function handleQuickFindings(form,event){
  event.preventDefault();event.stopImmediatePropagation();
  const data=new FormData(form);const created=confirmFindings(store,form.dataset.investigation,data.getAll('finding'));
  pendingFindingIds=created.map((f)=>f.id);
  document.querySelector('.modal-backdrop:has(#findings-form)')?.remove();
  requestAnimationFrame(()=>findingsCompletion(pendingFindingIds));
}

function handleBranchFindings(form,event){
  event.preventDefault();event.stopImmediatePropagation();
  const data=new FormData(form),created=[];
  for(const nodeId of data.getAll('finding')){
    const select=form.querySelector(`[data-finding-classification-for="${CSS.escape(nodeId)}"]`);
    const fallback=data.get('classification')||'FACTOR_RELEVANT';
    created.push(...confirmBranchingFindings(store,form.dataset.investigation,[nodeId],select?.value||fallback));
  }
  pendingFindingIds=[...new Set(created.map((f)=>f.id))];
  document.querySelector('#protocol-overlay')?.remove();
  requestAnimationFrame(()=>findingsCompletion(pendingFindingIds));
}

function assistedReturnSummary(){
  const detail=document.querySelector('.detail-sheet');if(!detail||detail.querySelector('[data-ux-last-session]'))return;
  const id=detail.querySelector('[data-assisted-edit]')?.dataset.assistedEdit||detail.querySelector('[data-assisted-archive]')?.dataset.assistedArchive;if(!id)return;
  const state=store.getState();
  const events=(state.events||[]).filter((e)=>e.assistedEntityId===id&&e.sessionId).sort((a,b)=>(safeTime(b.occurredAt)||0)-(safeTime(a.occurredAt)||0));
  const lastSessionId=events[0]?.sessionId;const lastSession=state.sessions.find((s)=>s.id===lastSessionId);
  const assessments=(state.assessments||[]).filter((a)=>a.assistedEntityId===id).sort((a,b)=>(safeTime(b.occurredAt||b.createdAt)||0)-(safeTime(a.occurredAt||a.createdAt)||0));
  const findings=(state.findings||[]).filter((f)=>f.assistedEntityId===id).sort((a,b)=>(safeTime(b.createdAt)||0)-(safeTime(a.createdAt)||0));
  const treatments=(state.treatments||[]).filter((t)=>t.assistedEntityId===id&&['IN_PROGRESS','INTERRUPTED','PLANNED'].includes(t.status));
  const nextComponent=(state.treatmentComponents||[]).filter((c)=>treatments.some((t)=>t.id===c.treatmentId)&&c.expectedEndAt&&['IN_PROGRESS','INTERRUPTED','PLANNED'].includes(c.status)).sort((a,b)=>(safeTime(a.expectedEndAt)||Infinity)-(safeTime(b.expectedEndAt)||Infinity))[0];
  const latest=assessments[0];
  const section=document.createElement('section');section.className='section card soft ux-last-session-summary';section.dataset.uxLastSession='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Último atendimento</p><h3>${lastSession?fmt(lastSession.startedAt):'Sem sessão anterior'}</h3></div>${nextComponent?`<span class="status-pill">Próximo: ${esc(fmt(nextComponent.expectedEndAt))}</span>`:''}</div>${latest?`<p><strong>Última medição:</strong> ${latest.frequency?`${esc(latest.frequency)} Hertz`:''}${latest.imbalancePercent!=null?`${latest.frequency?' · ':''}${esc(latest.imbalancePercent)}% desequilíbrio`:''}</p>`:''}${findings.length?`<div class="ux-return-findings"><p class="eyebrow">Achados recentes</p>${findings.slice(0,3).map((f)=>`<p><strong>${esc(classificationLabel(f.classification))}:</strong> ${esc(f.title||'Achado registrado')}</p>`).join('')}</div>`:''}<p><strong>Tratamentos atuais:</strong> ${treatments.length}${treatments.length?` · ${treatments.slice(0,2).map((t)=>`${esc(t.title)} (${esc(statusLabel(t.status))})`).join(' · ')}`:''}</p>`;
  detail.querySelector('.sheet-head')?.after(section);
}

function dashboardCollapse(){
  const dashboard=document.querySelector('[data-session-dashboard]');if(!dashboard||dashboard.dataset.uxCollapsible)return;
  dashboard.dataset.uxCollapsible='true';dashboard.classList.add('ux-dashboard-collapsed');
  const head=dashboard.querySelector('.section-head');if(!head)return;
  const button=document.createElement('button');button.className='btn ghost small';button.dataset.uxToggleDashboard='true';button.textContent='Resumo';
  const investigationButton=head.querySelector('[data-manage-session-investigations]');investigationButton?.before(button);
}

function protocolPreferences(){
  const chooser=document.querySelector('#investigation-chooser-overlay');if(!chooser)return;
  const favorites=new Set(safeJsonGet(FAVORITES_KEY));const recents=safeJsonGet(RECENTS_KEY);
  const cards=[...chooser.querySelectorAll('article.card')].filter((card)=>card.querySelector('[data-start-branching]'));
  for(const card of cards){
    const start=card.querySelector('[data-start-branching]'),id=start?.dataset.startBranching;if(!id)continue;
    card.dataset.protocolId=id;
    if(!card.querySelector('[data-ux-protocol-favorite]')){
      const star=document.createElement('button');star.type='button';star.className=`ux-protocol-favorite ${favorites.has(id)?'active':''}`;star.dataset.uxProtocolFavorite=id;star.setAttribute('aria-label',favorites.has(id)?'Remover dos favoritos':'Adicionar aos favoritos');star.textContent=favorites.has(id)?'★':'☆';
      card.prepend(star);
    }
    if(recents.includes(id)&&!card.querySelector('[data-ux-protocol-recent]')){const badge=document.createElement('span');badge.className='ux-protocol-recent';badge.dataset.uxProtocolRecent='true';badge.textContent='Recente';card.querySelector('.eyebrow')?.after(badge);}
  }
  const stack=cards[0]?.parentElement;if(!stack||stack.dataset.uxProtocolSorted)return;stack.dataset.uxProtocolSorted='true';
  cards.sort((a,b)=>{const ai=a.dataset.protocolId,bi=b.dataset.protocolId;const af=favorites.has(ai)?0:1,bf=favorites.has(bi)?0:1;if(af!==bf)return af-bf;const ar=recents.indexOf(ai),br=recents.indexOf(bi);return (ar<0?999:ar)-(br<0?999:br);}).forEach((card)=>stack.appendChild(card));
}

function enhance(){if(enhancing)return;enhancing=true;try{assistedReturnSummary();dashboardCollapse();protocolPreferences();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(form.id==='findings-form'){handleQuickFindings(form,event);return;}
  if(form.id==='branch-findings-form'){handleBranchFindings(form,event);return;}
  if(form.id==='treatment-form'&&pendingFindingIds.length){
    const before=new Set(store.getState().treatments.map((t)=>t.id));const ids=[...pendingFindingIds];pendingFindingIds=[];
    queueMicrotask(()=>{const created=store.getState().treatments.filter((t)=>!before.has(t.id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];if(!created)return;store.setState((state)=>{const draft=structuredClone(state),target=draft.treatments.find((t)=>t.id===created.id);if(target)target.findingIds=[...new Set([...(target.findingIds||[]),...ids])];return draft;});});
  }
},true);

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.uxFindingsTreat!==undefined){closeCompletion();document.querySelector('[data-action="treat-direct"]')?.click();return;}
  if(b.dataset.uxFindingsInvestigate!==undefined){pendingFindingIds=[];closeCompletion();document.querySelector('[data-action="investigate"]')?.click();return;}
  if(b.dataset.uxFindingsBack!==undefined){pendingFindingIds=[];closeCompletion();return;}
  if(b.dataset.uxToggleDashboard!==undefined){const dashboard=b.closest('[data-session-dashboard]');dashboard?.classList.toggle('ux-dashboard-collapsed');b.textContent=dashboard?.classList.contains('ux-dashboard-collapsed')?'Resumo':'Recolher';return;}
  if(b.dataset.uxProtocolFavorite){event.preventDefault();event.stopImmediatePropagation();const id=b.dataset.uxProtocolFavorite;const favorites=new Set(safeJsonGet(FAVORITES_KEY));favorites.has(id)?favorites.delete(id):favorites.add(id);safeJsonSet(FAVORITES_KEY,[...favorites]);document.querySelector('#investigation-chooser-overlay')?.remove();document.querySelector('[data-action="investigate"]')?.click();return;}
  if(b.dataset.startBranching){const id=b.dataset.startBranching;const list=safeJsonGet(RECENTS_KEY).filter((x)=>x!==id);list.unshift(id);safeJsonSet(RECENTS_KEY,list.slice(0,5));}
},true);
