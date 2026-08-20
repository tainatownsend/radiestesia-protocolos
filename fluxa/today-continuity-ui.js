import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

const store = createStore();
let enhancing = false;

function esc(value='') {
  return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function assistedName(state,id) {
  return state.assistedEntities.find((item)=>item.id===id)?.displayName || 'Assistido';
}
function protocolName(item) {
  return item.protocolSnapshot?.name || item.protocolName || item.protocolId || 'Investigação';
}
function pendingItems(state) {
  const items=[];
  for (const investigation of state.investigations || []) {
    if (investigation.status !== 'IN_PROGRESS') continue;
    items.push({
      kind:'investigation',
      assistedId:investigation.assistedEntityId,
      title:protocolName(investigation),
      updatedAt:investigation.updatedAt || investigation.createdAt || '',
      label:'Investigação aberta'
    });
  }
  for (const treatment of state.treatments || []) {
    if (!['PLANNED','INTERRUPTED'].includes(treatment.status)) continue;
    items.push({
      kind:'treatment',
      assistedId:treatment.assistedEntityId,
      title:treatment.title || 'Tratamento',
      treatmentId:treatment.id,
      updatedAt:treatment.updatedAt || treatment.createdAt || '',
      label:treatment.status === 'PLANNED' ? 'Tratamento planejado' : 'Tratamento interrompido'
    });
  }
  return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

function ensureContinuity() {
  const state=store.getState();
  if (getOpenSession(state)) return;
  const main=document.querySelector('main');
  if (!main || main.querySelector('[data-today-continuity]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Hoje') return;
  const items=pendingItems(state);
  if (!items.length) return;

  const section=document.createElement('section');
  section.className='section';
  section.dataset.todayContinuity='true';
  const visible=items.slice(0,5);
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Para continuar</p><h2>Trabalhos que ficaram em aberto</h2></div>${items.length>visible.length?`<button class="btn ghost small" data-route="treatments">Ver mais</button>`:''}</div><div class="stack">${visible.map((item)=>`<article class="card continuity-card"><div><p class="eyebrow">${esc(item.label)}</p><h3>${esc(item.title)}</h3><p class="muted">${esc(assistedName(state,item.assistedId))}</p></div>${item.kind==='treatment'?`<button class="btn secondary small" data-route="treatments" data-continuity-treatment="${item.treatmentId}">Abrir</button>`:`<button class="btn secondary small" data-action="start-session">Preparar sessão</button>`}</article>`).join('')}</div>`;

  const recent=[...main.querySelectorAll('.section')].find((node)=>node.querySelector('h2')?.textContent?.trim()==='Atividade recente');
  recent?.before(section) || main.appendChild(section);
}
function enhance(){
  if(enhancing)return;
  enhancing=true;
  try{ensureContinuity();}finally{enhancing=false;}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-continuity-treatment]');
  if(!button)return;
  const id=button.dataset.continuityTreatment;
  requestAnimationFrame(()=>{
    const card=document.querySelector(`.treatment-card[data-treatment-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({behavior:'smooth',block:'center'});
    card?.classList.add('search-highlight');
    setTimeout(()=>card?.classList.remove('search-highlight'),1700);
  });
},true);
