import { createStore } from './store.js';

const store=createStore();let query='';let type='ALL';let tag='ALL';
function norm(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function activeTags(state=store.getState()){
  const counts=new Map();
  (state.tools||[]).filter((tool)=>!tool.archivedAt).forEach((tool)=>(tool.tags||[]).forEach((value)=>{
    const label=String(value||'').trim();if(!label)return;const key=norm(label);const current=counts.get(key)||{label,count:0};current.count+=1;counts.set(key,current);
  }));
  return [...counts.entries()].sort((a,b)=>b[1].count-a[1].count||a[1].label.localeCompare(b[1].label,'pt-BR'));
}
function ensureFilters(){
  const section=document.querySelector('[data-basic-tool-library]');if(!section||section.querySelector('[data-library-filters]'))return;
  const tags=activeTags();const controls=document.createElement('div');controls.className='form-grid';controls.dataset.libraryFilters='true';
  controls.innerHTML=`<div class="field"><label for="library-search">Buscar recurso</label><input id="library-search" type="search" data-library-search placeholder="Nome, finalidade ou tag"></div><div class="field"><label for="library-type">Tipo</label><select id="library-type" data-library-type><option value="ALL">Todos</option><option value="GRAPH">Gráfico</option><option value="BIOMETER">Biômetro</option><option value="OTHER">Outro recurso</option></select></div>${tags.length?`<div class="field"><label for="library-tag">Tag</label><select id="library-tag" data-library-tag><option value="ALL">Todas</option>${tags.map(([key,item])=>`<option value="${key}">${item.label} (${item.count})</option>`).join('')}</select></div>`:''}`;
  section.querySelector('.stack')?.before(controls);
}
function syncTagOptions(){
  const select=document.querySelector('[data-library-tag]');if(!select)return;
  const options=activeTags();const signature=options.map(([key,item])=>`${key}:${item.count}`).join('|');if(select.dataset.signature===signature)return;
  const previous=tag;select.innerHTML=`<option value="ALL">Todas</option>${options.map(([key,item])=>`<option value="${key}">${item.label} (${item.count})</option>`).join('')}`;select.dataset.signature=signature;
  tag=options.some(([key])=>key===previous)?previous:'ALL';select.value=tag;
}
function decorateCards(){const state=store.getState();document.querySelectorAll('[data-basic-tool-library] [data-library-tool-id]').forEach((card)=>{const tool=state.tools.find((item)=>item.id===card.dataset.libraryToolId&&!item.archivedAt);if(!tool)return;if(!card.querySelector('[data-tool-usage]')){const usage=state.treatmentComponents.filter((component)=>component.toolId===tool.id).length;const note=document.createElement('p');note.className='muted';note.dataset.toolUsage='true';note.textContent=usage?`Usado em ${usage} ${usage===1?'componente':'componentes'} de tratamento.`:'Ainda não utilizado em tratamentos.';card.appendChild(note);}});}
function apply(){const state=store.getState(),q=norm(query);document.querySelectorAll('[data-library-tool-id]').forEach((card)=>{const tool=state.tools.find((item)=>item.id===card.dataset.libraryToolId&&!item.archivedAt);if(!tool){card.hidden=true;return;}const text=norm(`${tool.name||''} ${tool.purpose||''} ${tool.notes||''} ${(tool.tags||[]).join(' ')}`);const tagMatch=tag==='ALL'||(tool.tags||[]).some((value)=>norm(value)===tag);card.hidden=!((!q||text.includes(q))&&(type==='ALL'||tool.type===type)&&tagMatch);});}
function enhance(){ensureFilters();syncTagOptions();decorateCards();apply();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
document.addEventListener('input',(event)=>{if(!event.target.matches('[data-library-search]'))return;query=event.target.value;apply();},true);
document.addEventListener('change',(event)=>{if(event.target.matches('[data-library-type]')){type=event.target.value;apply();return;}if(event.target.matches('[data-library-tag]')){tag=event.target.value;apply();}},true);
