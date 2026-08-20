import { createStore } from './store.js';
import { activeTools } from './activity-library.js';
import { canPlanFollowUpTreatment, createFollowUpTreatment, latestTreatmentAssessment } from './follow-up-treatment.js';

const store = createStore();

function esc(value = '') { return String(value).replace(/[&<>'\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c])); }
function close() { document.querySelector('#follow-up-overlay')?.remove(); }
function dialog(html) { close(); const wrap=document.createElement('div'); wrap.id='follow-up-overlay'; wrap.className='modal-backdrop'; wrap.innerHTML=html; document.body.appendChild(wrap); }
function toolOptions(){return activeTools(store.getState()).map((tool)=>`<option value="${tool.id}">${esc(tool.name)}</option>`).join('');}
function componentFields(index){return `<section class="card" data-follow-up-component><div class="section-head"><div><p class="eyebrow">Componente ${index}</p><h3>Próximo ciclo</h3></div>${index>1?'<button type="button" class="btn ghost small" data-follow-up-remove-component>Remover</button>':''}</div><div class="form-grid"><div class="field"><label>Recurso da Biblioteca <span class="muted">(opcional)</span></label><select name="toolId"><option value="">Digitar manualmente</option>${toolOptions()}</select></div><div class="field"><label>Nome do componente</label><input name="componentName" required></div><div class="field"><label>Comando / orientação</label><textarea name="instructions"></textarea></div><div class="duration-grid"><div class="field"><label>Duração <span class="muted">(opcional)</span></label><input name="durationValue" type="number" min="1" inputmode="numeric" placeholder="Sem prazo"></div><div class="field"><label>Unidade</label><select name="durationUnit"><option value="MINUTE">minuto(s)</option><option value="HOUR">hora(s)</option><option value="DAY">dia(s)</option><option value="WEEK">semana(s)</option><option value="MONTH">mês(es)</option></select></div></div></div></section>`;}

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
  dialog(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Próximo ciclo</p><h2>${esc(treatment.title)}</h2></div><button class="close-btn" data-follow-up-close>×</button></div><p class="muted">O tratamento atual permanece concluído. O próximo ciclo nasce Planejado, com componentes próprios e vínculo à avaliação que recomendou continuidade.</p><form id="follow-up-form" data-treatment="${treatment.id}" class="form-grid"><div class="field"><label>Nome do próximo ciclo</label><input name="title" value="${esc(treatment.title)} · próximo ciclo" required></div><div class="field"><label>Quando iniciar</label><input name="plannedFor" value="${esc(assessment.nextTreatmentWhen||'')}" placeholder="Ex.: em 7 dias"></div><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><div data-follow-up-components>${componentFields(1)}</div><button type="button" class="btn secondary wide" data-follow-up-add-component>Adicionar outro componente</button><button class="btn primary wide" type="submit">Criar tratamento Planejado</button></form></section>`);
}

function renumber(form){form.querySelectorAll('[data-follow-up-component]').forEach((section,index)=>{const label=section.querySelector('.eyebrow');if(label)label.textContent=`Componente ${index+1}`;});}

document.addEventListener('change',(event)=>{const select=event.target.closest('#follow-up-form select[name="toolId"]');if(!select?.value)return;const tool=store.getState().tools.find((item)=>item.id===select.value&&!item.archivedAt);const input=select.closest('[data-follow-up-component]')?.querySelector('[name="componentName"]');if(tool&&input)input.value=tool.name;},true);

document.addEventListener('click',(event)=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.followUpPlan)planDialog(b.dataset.followUpPlan);else if(b.dataset.followUpClose!==undefined)close();else if(b.dataset.followUpAddComponent!==undefined){const form=b.closest('#follow-up-form');const host=form.querySelector('[data-follow-up-components]');host.insertAdjacentHTML('beforeend',componentFields(host.querySelectorAll('[data-follow-up-component]').length+1));}else if(b.dataset.followUpRemoveComponent!==undefined){const form=b.closest('#follow-up-form');b.closest('[data-follow-up-component]')?.remove();renumber(form);}},true);

document.addEventListener('submit',(event)=>{const form=event.target;if(form.id!=='follow-up-form')return;event.preventDefault();const d=new FormData(form);try{const names=d.getAll('componentName'),toolIds=d.getAll('toolId'),instructions=d.getAll('instructions'),durations=d.getAll('durationValue'),units=d.getAll('durationUnit');const components=names.map((name,index)=>({name,toolId:toolIds[index]||null,instructions:instructions[index]||null,durationValue:durations[index]||null,durationUnit:durations[index]?units[index]:null}));createFollowUpTreatment(store,form.dataset.treatment,{title:d.get('title'),plannedFor:d.get('plannedFor'),notes:d.get('notes'),components});close();}catch(e){alert(e.message);}},true);
