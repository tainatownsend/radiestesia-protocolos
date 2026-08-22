import { createStore } from './store.js';
import { TreatmentStatus } from './domain.js';

const store=createStore();
const fmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'});

function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function safeDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d:null;}
function durationRemaining(component){
  if(component.status!==TreatmentStatus.IN_PROGRESS||!component.expectedEndAt)return '';
  const end=safeDate(component.expectedEndAt);if(!end)return '';
  const ms=end.getTime()-Date.now();if(ms<=0)return 'Revisão disponível';
  const mins=Math.ceil(ms/60000);if(mins<60)return `${mins} min restantes`;
  const hours=Math.ceil(mins/60);if(hours<48)return `${hours} h restantes`;
  const days=Math.ceil(hours/24);return `${days} d restantes`;
}
function componentName(component,state){
  const tool=state.tools?.find?.(item=>item.id===component.toolId);
  return component.title||component.name||component.graphName||tool?.name||'Componente';
}
function componentStatus(component){
  if(component.status===TreatmentStatus.COMPLETED)return 'Encerrado';
  if(component.status===TreatmentStatus.INTERRUPTED)return 'Interrompido';
  return durationRemaining(component)||'Em andamento';
}
function progress(component){
  if(component.status===TreatmentStatus.COMPLETED)return 100;
  const start=safeDate(component.startedAt),end=safeDate(component.expectedEndAt);
  if(!start||!end||end<=start)return 0;
  return Math.max(0,Math.min(100,Math.round(((Date.now()-start.getTime())/(end.getTime()-start.getTime()))*100)));
}
function componentRows(treatment,state){
  const components=(state.treatmentComponents||[]).filter(c=>c.treatmentId===treatment.id).slice(0,3);
  if(!components.length)return '';
  return `<div class="premium-treatment-components" aria-label="Componentes do tratamento">${components.map(component=>{
    const pct=progress(component),end=safeDate(component.expectedEndAt);
    return `<div class="premium-treatment-component"><div class="premium-component-mark" aria-hidden="true">✦</div><div class="premium-component-copy"><div><strong>${esc(componentName(component,state))}</strong><span>${esc(componentStatus(component))}</span></div><div class="premium-component-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>${end?`<small>${component.status===TreatmentStatus.IN_PROGRESS?'Previsão ':''}${esc(fmt.format(end))}</small>`:''}</div></div>`;
  }).join('')}</div>`;
}
function enhanceTreatmentCards(){
  const state=store.getState();
  document.querySelectorAll('.treatment-card[data-treatment-id]').forEach(card=>{
    const id=card.dataset.treatmentId,treatment=state.treatments.find(t=>t.id===id);if(!treatment)return;
    const html=componentRows(treatment,state),preview=card.querySelector('.premium-treatment-components');
    if(!html){preview?.remove();return;}
    const holder=document.createElement('div');holder.innerHTML=html;const next=holder.firstElementChild;
    if(preview){preview.replaceWith(next);return;}
    const buttons=card.querySelector('.button-row');card.insertBefore(next,buttons||null);
  });
}
function enhanceProtocolSheets(){
  document.querySelectorAll('.premium-protocol-sheet').forEach(sheet=>{
    sheet.classList.add('premium-workflow-protocol');
    const head=sheet.querySelector('.sheet-head');
    if(head&&!head.querySelector('.premium-protocol-kicker')){
      const kicker=document.createElement('div');kicker.className='premium-protocol-kicker';kicker.textContent='Investigação guiada';head.prepend(kicker);
    }
  });
}
function enhance(){enhanceTreatmentCards();enhanceProtocolSheets();}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance();});}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('fluxa:state-changed',schedule);
schedule();
