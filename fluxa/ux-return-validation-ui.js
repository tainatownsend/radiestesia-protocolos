import { createStore } from './store.js';

const store=createStore();
let enhancing=false;
const classifications={CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',FACTOR_RELEVANT:'Fator relevante',DEEPEN:'Item a aprofundar'};
const treatmentStatuses={PLANNED:'Planejado',IN_PROGRESS:'Em andamento',INTERRUPTED:'Interrompido',COMPLETED:'Concluído'};
function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function time(value){const n=new Date(value||'').getTime();return Number.isFinite(n)?n:null;}
function fmt(value){const n=time(value);return n==null?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(n));}
function assistedId(detail){return detail?.querySelector('[data-assisted-edit]')?.dataset.assistedEdit||detail?.querySelector('[data-assisted-archive]')?.dataset.assistedArchive||null;}
function sessionHasAssisted(state,sessionId,id){
  if((state.events||[]).some((e)=>e.sessionId===sessionId&&e.assistedEntityId===id))return true;
  if((state.investigations||[]).some((i)=>i.assistedEntityId===id&&(i.originSessionId===sessionId||i.currentSessionId===sessionId||i.sessionId===sessionId)))return true;
  if((state.reikiApplications||[]).some((r)=>r.assistedEntityId===id&&r.sessionId===sessionId))return true;
  if((state.assessments||[]).some((a)=>a.assistedEntityId===id&&a.sessionId===sessionId))return true;
  return false;
}
function previousClosedSession(state,id){
  return (state.sessions||[])
    .filter((s)=>s.status==='CLOSED'&&sessionHasAssisted(state,s.id,id))
    .sort((a,b)=>(time(b.endedAt)||0)-(time(a.endedAt)||0))[0]||null;
}
function investigationsForSession(state,sessionId,id){return (state.investigations||[]).filter((i)=>i.assistedEntityId===id&&(i.originSessionId===sessionId||i.currentSessionId===sessionId||i.sessionId===sessionId));}
function currentTreatments(state,id){return (state.treatments||[]).filter((t)=>t.assistedEntityId===id&&['IN_PROGRESS','INTERRUPTED','PLANNED'].includes(t.status));}

function consolidateReturnSummary(){
  const detail=document.querySelector('.detail-sheet');if(!detail)return;
  const id=assistedId(detail);if(!id)return;
  /* Remove the older summary layer so only one return context is visible. */
  detail.querySelector('[data-return-summary]')?.remove();
  const section=detail.querySelector('[data-ux-last-session]');if(!section||section.dataset.uxReturnValidated)return;
  section.dataset.uxReturnValidated='true';
  const state=store.getState();
  const previous=previousClosedSession(state,id);
  const treatments=currentTreatments(state,id);
  const next=(state.treatmentComponents||[])
    .filter((c)=>treatments.some((t)=>t.id===c.treatmentId)&&c.expectedEndAt&&['IN_PROGRESS','INTERRUPTED','PLANNED'].includes(c.status))
    .sort((a,b)=>(time(a.expectedEndAt)||Infinity)-(time(b.expectedEndAt)||Infinity))[0];
  let assessment=null,findings=[];
  if(previous){
    assessment=(state.assessments||[]).filter((a)=>a.assistedEntityId===id&&a.sessionId===previous.id).sort((a,b)=>(time(b.occurredAt||b.createdAt)||0)-(time(a.occurredAt||a.createdAt)||0))[0]||null;
    const invIds=new Set(investigationsForSession(state,previous.id,id).map((i)=>i.id));
    findings=(state.findings||[]).filter((f)=>f.assistedEntityId===id&&invIds.has(f.investigationId)).sort((a,b)=>(time(b.createdAt)||0)-(time(a.createdAt)||0));
  }
  const measurement=assessment?(assessment.frequency?`${esc(assessment.frequency)} Hertz`:esc(assessment.result||'')):'';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Retorno</p><h3>${previous?`Último atendimento · ${esc(fmt(previous.startedAt))}`:'Sem atendimento anterior encerrado'}</h3></div>${next?`<span class="status-pill">Próximo: ${esc(fmt(next.expectedEndAt))}</span>`:''}</div>${assessment?`<p><strong>Como terminou:</strong> ${measurement||'Avaliação registrada'}${assessment.imbalancePercent!=null?`${measurement?' · ':''}${esc(assessment.imbalancePercent)}% desequilíbrio`:''}</p>`:''}${findings.length?`<div class="ux-return-findings"><p class="eyebrow">Achados do último atendimento</p>${findings.slice(0,3).map((f)=>`<p><strong>${esc(classifications[f.classification]||'Achado')}:</strong> ${esc(f.title||f.questionTextSnapshot||'Achado registrado')}</p>`).join('')}</div>`:''}<p><strong>Tratamentos atuais:</strong> ${treatments.length}${treatments.length?` · ${treatments.slice(0,2).map((t)=>`${esc(t.title)} (${esc(treatmentStatuses[t.status]||'Registrado')})`).join(' · ')}`:''}</p>`;
}
function polishReviewStatus(){document.querySelectorAll('.ux-review-component span').forEach((node)=>{if(node.textContent?.trim()==='Concluída')node.textContent='Concluído';});}
function enhance(){if(enhancing)return;enhancing=true;try{consolidateReturnSummary();polishReviewStatus();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
