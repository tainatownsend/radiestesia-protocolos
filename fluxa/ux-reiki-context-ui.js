import { createStore } from './store.js';
import { ReikiModeLabel } from './reiki-flex.js';

const store=createStore();
let enhancing=false;
function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}

function enhanceTimer(){
  document.querySelectorAll('.timer-sheet').forEach((sheet)=>{
    if(sheet.querySelector('[data-ux-reiki-context]'))return;
    const timer=sheet.querySelector('[data-live-timer],[data-reiki-outside-timer]');if(!timer)return;
    const id=timer.dataset.liveTimer||timer.dataset.reikiOutsideTimer;
    const state=store.getState();const app=state.reikiApplications.find((item)=>item.id===id);if(!app)return;
    const treatment=app.treatmentId?state.treatments.find((item)=>item.id===app.treatmentId):null;
    const mode=ReikiModeLabel[app.mode]||'Aplicação';
    const context=document.createElement('p');context.className='muted ux-reiki-context';context.dataset.uxReikiContext='true';
    context.innerHTML=`<strong>${esc(mode)}</strong>${treatment?` · vinculado a ${esc(treatment.title)}`:' · aplicação avulsa'}`;
    const head=sheet.querySelector('.sheet-head');head?.after(context);
  });
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceTimer();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
