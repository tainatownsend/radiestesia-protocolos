import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

const store=createStore();
let enhancing=false;
const findingLabels={CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',FACTOR_RELEVANT:'Fator relevante',DEEPEN:'Item a aprofundar'};
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function timestamp(value){const time=new Date(value||'').getTime();return Number.isFinite(time)?time:null;}
function fmt(iso){const time=timestamp(iso);return time==null?'—':new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(time));}
function sortText(value){return String(value||'');}
function validImbalance(value){const number=Number(value);return Number.isFinite(number)&&number>=0&&number<=100;}
function assistedSummary(state,id){
  const assisted=state.assistedEntities.find((a)=>a.id===id);if(!assisted)return null;
  const treatments=(state.treatments||[]).filter((t)=>t.assistedEntityId===id);
  const activeTreatments=treatments.filter((t)=>['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(t.status));
  const investigations=(state.investigations||[]).filter((i)=>i.assistedEntityId===id);
  const openInvestigations=investigations.filter((i)=>i.status==='IN_PROGRESS');
  const findings=(state.findings||[]).filter((f)=>f.assistedEntityId===id&&f.status!=='DISMISSED').sort((a,b)=>sortText(b.updatedAt||b.createdAt).localeCompare(sortText(a.updatedAt||a.createdAt)));
  const assessments=(state.assessments||[]).filter((a)=>a.assistedEntityId===id).sort((a,b)=>sortText(b.occurredAt||b.createdAt).localeCompare(sortText(a.occurredAt||a.createdAt)));
  const imbalance=[...assessments].reverse().filter((a)=>validImbalance(a.imbalancePercent)).slice(-6);
  const sessionIds=new Set((state.events||[]).filter((e)=>e.assistedEntityId===id&&e.sessionId).map((e)=>e.sessionId));
  const sessions=(state.sessions||[]).filter((s)=>sessionIds.has(s.id)).sort((a,b)=>(timestamp(b.startedAt)??-Infinity)-(timestamp(a.startedAt)??-Infinity));
  return {assisted,treatments,activeTreatments,investigations,openInvestigations,findings,assessments,imbalance,sessions};
}
function trendHtml(items){
  if(items.length<2)return '<p class="muted">A evolução percentual aparecerá aqui após pelo menos duas avaliações finais.</p>';
  return `<div class="imbalance-trend">${items.map((a)=>{const value=Number(a.imbalancePercent);return `<div class="trend-point"><div class="trend-bar-track"><span style="height:${Math.max(6,value)}%"></span></div><strong>${value}%</strong><small>${fmt(a.occurredAt||a.createdAt)}</small></div>`;}).join('')}</div><p class="muted">Percentual de desequilíbrio registrado nas avaliações finais.</p>`;
}
function content(state,id){
  const d=assistedSummary(state,id);if(!d)return'';const latest=d.assessments[0];const recent=d.findings[0];
  return `<div class="metric-grid"><div class="metric"><strong>${d.activeTreatments.length}</strong><span>tratamentos atuais</span></div><div class="metric"><strong>${d.openInvestigations.length}</strong><span>investigações abertas</span></div><div class="metric"><strong>${d.findings.length}</strong><span>achados</span></div><div class="metric"><strong>${d.sessions.length}</strong><span>sessões</span></div></div>
    <div class="insight-grid section"><article class="card soft"><p class="eyebrow">Última avaliação</p><h3>${latest?esc(latest.subject||'Avaliação final'):'Ainda sem avaliação'}</h3>${latest?`<p class="muted">${esc(latest.result??latest.frequency??'')}${latest.scale?` ${esc(latest.scale)}`:''}${validImbalance(latest.imbalancePercent)?` · ${esc(latest.imbalancePercent)}% de desequilíbrio`:''}</p>`:'<p class="muted">O histórico será resumido automaticamente conforme você usar o Fluxa.</p>'}</article><article class="card soft"><p class="eyebrow">Achado recente</p><h3>${recent?esc(recent.title||recent.questionTextSnapshot||'Achado'):'Nenhum achado confirmado'}</h3><p class="muted">${recent?esc(findingLabels[recent.classification]||'Fator relevante'):d.sessions[0]?`Última sessão: ${fmt(d.sessions[0].startedAt)}`:'Sem sessões anteriores'}</p></article></div>
    <section class="section"><div class="section-head"><h3>Evolução</h3><span class="muted">últimas avaliações</span></div>${trendHtml(d.imbalance)}</section>`;
}
function ensureDetail(){
  const detail=document.querySelector('.detail-sheet');if(!detail||detail.querySelector('[data-longitudinal-insights]'))return;
  const id=detail.querySelector('[data-assisted-edit]')?.dataset.assistedEdit;if(!id)return;
  const section=document.createElement('section');section.className='section';section.dataset.longitudinalInsights='true';section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Visão rápida</p><h2>Contexto para o próximo atendimento</h2></div></div>${content(store.getState(),id)}`;
  const actions=detail.querySelector('.assisted-detail-actions');actions?.after(section) || detail.querySelector('.sheet-head')?.after(section);
}
function ensureQuickButton(){
  const bar=document.querySelector('[data-fast-session-context]');if(!bar||bar.querySelector('[data-quick-assisted-summary]'))return;
  const session=getOpenSession(store.getState());if(!session?.currentAssistedEntityId)return;
  const actions=bar.querySelector('.fast-context-actions');if(!actions)return;
  const b=document.createElement('button');b.className='btn ghost small';b.dataset.quickAssistedSummary='true';b.textContent='Resumo';actions.prepend(b);
}
function quickDialog(){
  const state=store.getState();const session=getOpenSession(state);const id=session?.currentAssistedEntityId;if(!id)return;const d=assistedSummary(state,id);if(!d)return;
  document.querySelector('#quick-assisted-summary-overlay')?.remove();const wrap=document.createElement('div');wrap.id='quick-assisted-summary-overlay';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Contexto do assistido</p><h2>${esc(d.assisted.displayName)}</h2></div><button class="close-btn" data-quick-summary-close>×</button></div>${content(state,id)}</section>`;document.body.appendChild(wrap);
}
function enhance(){if(enhancing)return;enhancing=true;try{ensureDetail();ensureQuickButton();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.quickAssistedSummary!==undefined){quickDialog();return;}if(b.dataset.quickSummaryClose!==undefined)document.querySelector('#quick-assisted-summary-overlay')?.remove();},true);
