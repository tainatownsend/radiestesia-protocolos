import { createStore } from './store.js';

const store=createStore();
const FAVORITES_KEY='fluxa.toolFavorites';
let targetSelect=null;
let pickerCounter=0;
let enhancing=false;

function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function norm(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function activeTools(){return (store.getState().tools||[]).filter((t)=>!t.archivedAt);}
function favoriteIds(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'));}catch(_){return new Set();}}
function saveFavoriteIds(ids){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...ids]));}catch(_){} }
function usage(toolId,state=store.getState()){
  let n=(state.treatmentComponents||[]).filter((c)=>c.toolId===toolId).length;
  n+=(state.preparationRuns||[]).filter((p)=>(p.protection?.toolIds||[]).includes(toolId)).length;
  n+=(state.customProtocols||[]).filter((p)=>(p.toolIds||[]).includes(toolId)).length;
  return n;
}
function sortedTools(){
  const state=store.getState();const favorites=favoriteIds();
  return activeTools().map((t)=>({...t,_usage:usage(t.id,state),_favorite:favorites.has(t.id)})).sort((a,b)=>Number(b._favorite)-Number(a._favorite)||b._usage-a._usage||a.name.localeCompare(b.name,'pt-BR'));
}
function typeLabel(type){return ({GRAPH:'Gráfico',BIOMETER:'Biômetro',OTHER:'Outro'})[type]||'Recurso';}
function close(){document.querySelector('#tool-picker-overlay')?.remove();targetSelect=null;}
function pickerHtml(query=''){
  const tools=sortedTools();const q=norm(query).trim();const filtered=q?tools.filter((t)=>norm(`${t.name} ${t.purpose||''} ${t.notes||''}`).includes(q)):tools;
  return `<div class="tool-picker-list">${filtered.length?filtered.map((t)=>`<article class="tool-picker-row" data-tool-search-text="${esc(norm(`${t.name} ${t.purpose||''}`))}"><button class="tool-favorite ${t._favorite?'active':''}" data-toggle-tool-favorite="${t.id}" aria-label="${t._favorite?'Remover dos favoritos':'Adicionar aos favoritos'}">★</button><button class="tool-pick-main" data-pick-tool="${t.id}"><span><strong>${esc(t.name)}</strong><small>${esc(typeLabel(t.type))}${t.purpose?` · ${esc(t.purpose)}`:''}</small></span>${t._usage?`<b>${t._usage}×</b>`:''}</button></article>`).join(''):'<div class="empty">Nenhum recurso encontrado.</div>'}</div>`;
}
function openPicker(select){
  targetSelect=select;document.querySelector('#tool-picker-overlay')?.remove();
  const wrap=document.createElement('div');wrap.id='tool-picker-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Biblioteca</p><h2>Escolher recurso</h2></div><button class="close-btn" data-tool-picker-close>×</button></div><div class="field"><label for="tool-picker-search">Buscar gráfico ou recurso</label><input id="tool-picker-search" type="search" data-tool-picker-search autocomplete="off" placeholder="Digite parte do nome ou finalidade"></div><div class="button-row"><button class="btn ghost small" data-pick-tool="">Digitar manualmente</button></div><div data-tool-picker-results>${pickerHtml()}</div></section>`;
  document.body.appendChild(wrap);requestAnimationFrame(()=>wrap.querySelector('[data-tool-picker-search]')?.focus());
}
function enhanceSelect(select){
  if(select.dataset.searchableToolPicker)return;
  const wrapper=select.closest('[data-library-tool-picker]');if(!wrapper)return;
  select.dataset.searchableToolPicker=String(++pickerCounter);select.classList.add('native-tool-select-enhanced');
  const button=document.createElement('button');button.type='button';button.className='btn secondary wide searchable-tool-launch';button.dataset.openToolPicker=select.dataset.searchableToolPicker;
  const current=select.selectedOptions?.[0];button.textContent=select.value&&current?current.textContent:'Escolher na Biblioteca';
  select.before(button);
}
function enhanceLongChecklist(fieldset){
  if(fieldset.dataset.searchableChecklist)return;
  const rows=[...fieldset.querySelectorAll('.check-row')];if(rows.length<12)return;
  fieldset.dataset.searchableChecklist='true';
  const search=document.createElement('input');search.type='search';search.className='checklist-search';search.dataset.toolChecklistSearch='true';search.placeholder='Filtrar recursos desta lista';search.setAttribute('aria-label','Filtrar recursos desta lista');
  const legend=fieldset.querySelector('legend');legend?.after(search);
}
function enhance(){
  if(enhancing)return;enhancing=true;
  try{
    document.querySelectorAll('select[name="toolId"]').forEach(enhanceSelect);
    document.querySelectorAll('fieldset').forEach((f)=>{if(f.querySelectorAll('[data-prep-protection-tool],input[name="toolId"]').length)enhanceLongChecklist(f);});
  }finally{enhancing=false;}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('input',(event)=>{
  if(event.target.matches('[data-tool-picker-search]')){const results=document.querySelector('[data-tool-picker-results]');if(results)results.innerHTML=pickerHtml(event.target.value);return;}
  if(event.target.matches('[data-tool-checklist-search]')){const q=norm(event.target.value);const fieldset=event.target.closest('fieldset');fieldset?.querySelectorAll('.check-row').forEach((row)=>row.hidden=Boolean(q&&!norm(row.textContent).includes(q)));}
},true);

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.openToolPicker){const select=document.querySelector(`select[data-searchable-tool-picker="${CSS.escape(b.dataset.openToolPicker)}"]`);if(select)openPicker(select);return;}
  if(b.dataset.toolPickerClose!==undefined){close();return;}
  if(b.dataset.toggleToolFavorite){
    const favorites=favoriteIds();const id=b.dataset.toggleToolFavorite;favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavoriteIds(favorites);
    const input=document.querySelector('[data-tool-picker-search]');const results=document.querySelector('[data-tool-picker-results]');if(results)results.innerHTML=pickerHtml(input?.value||'');return;
  }
  if(b.dataset.pickTool!==undefined&&targetSelect){const id=b.dataset.pickTool;targetSelect.value=id;targetSelect.dispatchEvent(new Event('change',{bubbles:true}));const launch=targetSelect.previousElementSibling;if(launch?.matches('[data-open-tool-picker]')){const option=targetSelect.selectedOptions?.[0];launch.textContent=id&&option?option.textContent:'Digitar manualmente';}close();}
},true);
