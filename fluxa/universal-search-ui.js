import { createStore } from './store.js';
import { PROTOCOL_LIBRARY } from './protocol-engine.js';

const store=createStore();
let enhancing=false;

function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function norm(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function close(){document.querySelector('#universal-search-overlay')?.remove();}
function ensureButton(){
  const top=document.querySelector('.topbar');if(!top||top.querySelector('[data-universal-search]'))return;
  const button=document.createElement('button');button.className='search-launch';button.dataset.universalSearch='true';button.setAttribute('aria-label','Buscar no Fluxa');button.innerHTML='<span aria-hidden="true">⌕</span><span>Buscar</span>';
  const indicator=top.querySelector('.session-indicator');if(indicator)top.insertBefore(button,indicator);else top.appendChild(button);
}
function allResults(query){
  const state=store.getState();const q=norm(query).trim();if(!q)return[];
  const results=[];const push=(kind,id,title,detail,scoreText='')=>{const hay=norm(`${title} ${detail} ${scoreText}`);if(hay.includes(q))results.push({kind,id,title,detail,starts:norm(title).startsWith(q)});};
  (state.assistedEntities||[]).filter((a)=>!a.archivedAt).forEach((a)=>push('assisted',a.id,a.displayName,'Assistido',a.details||''));
  (state.treatments||[]).forEach((t)=>push('treatment',t.id,t.title,'Tratamento',t.status));
  (state.tools||[]).filter((t)=>!t.archivedAt).forEach((t)=>push('tool',t.id,t.name,'Biblioteca',`${t.purpose||''} ${t.notes||''} ${(t.tags||[]).join(' ')}`));
  (state.customProtocols||[]).forEach((p)=>push('custom-protocol',p.protocolKey,p.name,`Meu protocolo · v${p.version}`,p.description||''));
  (PROTOCOL_LIBRARY||[]).forEach((p)=>push('protocol',p.id,p.name,'Protocolo',p.description||''));
  return results.sort((a,b)=>Number(b.starts)-Number(a.starts)||a.title.localeCompare(b.title,'pt-BR')).slice(0,30);
}
function renderResults(input,value){
  const list=input.closest('.sheet')?.querySelector('[data-search-results]');if(!list)return;const items=allResults(value);
  list.innerHTML=items.length?items.map((r)=>`<button class="search-result" data-search-kind="${r.kind}" data-search-id="${esc(r.id)}"><span><strong>${esc(r.title)}</strong><small>${esc(r.detail)}</small></span><b aria-hidden="true">›</b></button>`).join(''):`<div class="empty">${value.trim()?'Nada encontrado.':'Digite para buscar Assistidos, Tratamentos, recursos e protocolos.'}</div>`;
}
function open(){
  close();const wrap=document.createElement('div');wrap.id='universal-search-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet search-sheet"><div class="sheet-head"><div><p class="eyebrow">Busca rápida</p><h2>Encontrar no Fluxa</h2></div><button class="close-btn" data-search-close>×</button></div><div class="field"><label for="fluxa-search-input">Buscar</label><input id="fluxa-search-input" data-search-input autocomplete="off" placeholder="Nome, tratamento, gráfico, tag ou protocolo"></div><div class="search-results section" data-search-results><div class="empty">Digite para buscar Assistidos, Tratamentos, recursos e protocolos.</div></div></section>`;
  document.body.appendChild(wrap);requestAnimationFrame(()=>wrap.querySelector('[data-search-input]')?.focus());
}
function route(name){document.querySelector(`[data-route="${name}"]`)?.click();}
function revealResult(kind,id){
  close();
  if(kind==='assisted'){route('assisted');requestAnimationFrame(()=>document.querySelector(`[data-assisted-detail="${CSS.escape(id)}"]`)?.click());return;}
  if(kind==='treatment'){route('treatments');requestAnimationFrame(()=>{const node=document.querySelector(`[data-treatment-history="${CSS.escape(id)}"],[data-review-treatment="${CSS.escape(id)}"],[data-start-planned-treatment="${CSS.escape(id)}"]`);const card=node?.closest('.treatment-card,.card');card?.scrollIntoView({behavior:'smooth',block:'center'});card?.classList.add('search-highlight');setTimeout(()=>card?.classList.remove('search-highlight'),1800);});return;}
  if(kind==='tool'){route('library');requestAnimationFrame(()=>{const card=document.querySelector(`[data-library-tool-id="${CSS.escape(id)}"]`);card?.scrollIntoView({behavior:'smooth',block:'center'});card?.classList.add('search-highlight');setTimeout(()=>card?.classList.remove('search-highlight'),1800);});return;}
  route('library');requestAnimationFrame(()=>{const selector=kind==='custom-protocol'?`[data-start-custom-protocol="${CSS.escape(id)}"]`:`[data-start-branching="${CSS.escape(id)}"]`;const node=document.querySelector(selector);node?.closest('.card')?.scrollIntoView({behavior:'smooth',block:'center'});});
}
function enhance(){if(enhancing)return;enhancing=true;try{ensureButton();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('input',(event)=>{if(event.target.matches('[data-search-input]'))renderResults(event.target,event.target.value);},true);
document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.universalSearch!==undefined){open();return;}
  if(button.dataset.searchClose!==undefined){close();return;}
  if(button.dataset.searchKind){revealResult(button.dataset.searchKind,button.dataset.searchId);}
},true);
