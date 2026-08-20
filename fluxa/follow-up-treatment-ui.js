import { createStore } from './store.js';
import { canPlanFollowUpTreatment, createFollowUpTreatment, latestTreatmentAssessment } from './follow-up-treatment.js';

const store = createStore();

function esc(value = '') { return String(value).replace(/[&<>'\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c])); }
function close() { document.querySelector('#follow-up-overlay')?.remove(); }
function dialog(html) { close(); const wrap=document.createElement('div'); wrap.id='follow-up-overlay'; wrap.className='modal-backdrop'; wrap.innerHTML=html; document.body.appendChild(wrap); }

function ensureActions() {
  const state=store.getState();
  document.querySelectorAll('.treatment-card[data-treatment-id]').forEach((card) => {
    const id=card.dataset.treatmentId;
    if (!canPlanFollowUpTreatment(state,id) || card.querySelector('[data-follow-up-plan]')) return;
    const row=card.querySelector('.button-row') || card.appendChild(Object.assign(document.createElement('div'),{className:'button-row'}));
    const button=document.createElement('button');
    button.className='btn primary small'; button.dataset.followUpPlan=id; button.textContent='Planejar próximo ciclo';
    row.appendChild(button);
  });
}

new MutationObserver(ensureActions).observe(document.body,{childList:true,subtree:true}); queueMicrotask(ensureActions);

function planDialog(treatmentId) {
  const state=store.getState();
  const treatment=state.treatments.find(i=>i.id===treatmentId);
  const assessment=latestTreatmentAssessment(state,treatmentId);
  if(!treatment||!assessment)return;
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Próximo ciclo</p><h2>${esc(treatment.title)}</h2></div><button class="close-btn" data-follow-up-close>×</button></div><p class="muted">O tratamento atual permanece concluído. Este registro cria um novo tratamento Planejado, ligado à avaliação que recomendou continuidade.</p><form id="follow-up-form" data-treatment="${treatment.id}" class="form-grid"><div class="field"><label>Nome do próximo ciclo</label><input name="title" value="${esc(treatment.title)} · próximo ciclo" required></div><div class="field"><label>Quando iniciar</label><input name="plannedFor" value="${esc(assessment.nextTreatmentWhen||'')}" placeholder="Ex.: em 7 dias"></div><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><button class="btn primary wide" type="submit">Criar tratamento Planejado</button></form></section>`);
}

document.addEventListener('click',(event)=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.followUpPlan)planDialog(b.dataset.followUpPlan);else if(b.dataset.followUpClose!==undefined)close();},true);
document.addEventListener('submit',(event)=>{const form=event.target;if(form.id!=='follow-up-form')return;event.preventDefault();const d=new FormData(form);try{createFollowUpTreatment(store,form.dataset.treatment,{title:d.get('title'),plannedFor:d.get('plannedFor'),notes:d.get('notes')});close();}catch(e){alert(e.message);}},true);
