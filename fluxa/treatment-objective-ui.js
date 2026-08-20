import { createStore } from './store.js';

const store=createStore();
let enhancing=false;
let pending=null;

function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function enhanceForm(form){
  if(form.dataset.treatmentObjectiveEnhanced)return;
  const title=form.querySelector('input[name="title"]');if(!title)return;
  form.dataset.treatmentObjectiveEnhanced='true';
  const field=document.createElement('div');field.className='field';field.dataset.treatmentObjectiveField='true';field.innerHTML='<label>Objetivo terapêutico <span class="muted">(opcional)</span></label><textarea name="therapeuticObjective" rows="2" placeholder="Ex.: favorecer equilíbrio e estabilidade do tema trabalhado"></textarea>';
  title.closest('.field')?.after(field);
}
function enhanceCards(){
  const state=store.getState();
  document.querySelectorAll('.treatment-card').forEach((card)=>{
    if(card.querySelector('[data-treatment-objective]'))return;
    const id=card.dataset.treatmentId||card.querySelector('[data-review-treatment]')?.dataset.reviewTreatment||card.querySelector('[data-start-planned-treatment]')?.dataset.startPlannedTreatment;
    const treatment=state.treatments.find((t)=>t.id===id);if(!treatment?.objective)return;
    const p=document.createElement('p');p.className='treatment-objective';p.dataset.treatmentObjective='true';p.innerHTML=`<span>Objetivo</span>${esc(treatment.objective)}`;
    const status=card.querySelector('.status-pill')?.closest('.section-head');status?.after(p) || card.prepend(p);
  });
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('#treatment-form,#planned-treatment-form').forEach(enhanceForm);enhanceCards();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

// Window capture records the optional objective before feature-specific submit listeners run on document.
window.addEventListener('submit',(event)=>{
  const form=event.target;if(!form.matches?.('#treatment-form,#planned-treatment-form'))return;
  const objective=String(new FormData(form).get('therapeuticObjective')||'').trim();if(!objective)return;
  pending={objective,before:new Set((store.getState().treatments||[]).map((t)=>t.id))};
  queueMicrotask(()=>{
    if(!pending)return;const current=pending;pending=null;
    const created=(store.getState().treatments||[]).filter((t)=>!current.before.has(t.id)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];if(!created)return;
    store.setState((state)=>{const draft=structuredClone(state);const target=draft.treatments.find((t)=>t.id===created.id);if(target){target.objective=current.objective;target.updatedAt=store.nowIso();const events=draft.events.filter((e)=>e.entityId===target.id&&['TREATMENT_CREATED','TREATMENT_STARTED'].includes(e.eventType));events.forEach((e)=>{e.metadata={...(e.metadata||{}),objective:current.objective};});}return draft;});
  });
},true);
