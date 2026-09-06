import { createStore } from './store.js';
import { STARTER_GRAPHS } from './graph-starter-catalog.js';

export { STARTER_GRAPHS } from './graph-starter-catalog.js';

function slug(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function key(value){return value.trim().toLocaleLowerCase('pt-BR');}

export function ensureStarterGraphs(store=createStore()){
  let added=0;
  store.setState(state=>{
    const draft=structuredClone(state),existing=new Set((draft.tools||[]).map(tool=>key(tool.name||'')));
    draft.tools=draft.tools||[];
    for(const name of STARTER_GRAPHS){
      if(existing.has(key(name)))continue;
      const now=store.nowIso();
      draft.tools.push({id:`starter_graph_${slug(name)}`,name,type:'GRAPH',purpose:'',practitionerNotes:'',tags:[],source:'Biblioteca inicial Fluxa',status:'ACTIVE',createdAt:now,updatedAt:now,starterGraph:true});
      existing.add(key(name));added++;
    }
    return draft;
  });
  return added;
}

ensureStarterGraphs();
