import { createStore } from './store.js';
import { activeTools } from './activity-library.js';

const store=createStore();
let query='';
let type='ALL';

function ensureFilters(){
  const section=document.querySelector('[data-basic-tool-library]');
  if(!section||section.querySelector('[data-library-filters]'))return;
  const controls=document.createElement('div');controls.className='form-grid';controls.dataset.libraryFilters='true';
  controls.innerHTML=`<div class="field"><label for="library-search">Buscar recurso</label><input id="library-search" type="search" data-library-search placeholder="Nome ou finalidade"></div><div class="field"><label for="library-type">Tipo</label><select id="library-type" data-library-type><option value="ALL">Todos</option><option value="GRAPH">Gráfico</option><option value="BIOMETER">Biômetro</option><option value="OTHER">Outro recurso</option></select></div>`;
  const stack=section.querySelector('.stack');stack?.before(controls);
}

function mapCards(){
  const section=document.querySelector('[data-basic-tool-library]');if(!section)return;
  const tools=activeTools(store.getState());
  const cards=[...section.querySelectorAll('.stack > article.card')];
  cards.forEach((card,index)=>{
    const tool=tools[index];if(!tool)return;
    card.dataset.libraryToolId=tool.id;
    if(!card.querySelector('[data-tool-usage]')){
      const usage=store.getState().treatmentComponents.filter(c=>c.toolId===tool.id).length;
      const note=document.createElement('p');note.className='muted';note.dataset.toolUsage='true';note.textContent=usage?`Usado em ${usage} ${usage===1?'componente':'componentes'} de tratamento.`:'Ainda não utilizado em tratamentos.';
      card.appendChild(note);
    }
  });
}

function apply(){
  const state=store.getState();
  document.querySelectorAll('[data-library-tool-id]').forEach((card)=>{
    const tool=state.tools.find(i=>i.id===card.dataset.libraryToolId);if(!tool)return;
    const text=`${tool.name||''} ${tool.purpose||''} ${tool.notes||''}`.toLocaleLowerCase('pt-BR');
    const visible=(!query||text.includes(query.toLocaleLowerCase('pt-BR')))&&(type==='ALL'||tool.type===type);
    card.hidden=!visible;
  });
}
function enhance(){ensureFilters();mapCards();apply();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
document.addEventListener('input',(event)=>{if(!event.target.matches('[data-library-search]'))return;query=event.target.value;apply();},true);
document.addEventListener('change',(event)=>{if(!event.target.matches('[data-library-type]'))return;type=event.target.value;apply();},true);
