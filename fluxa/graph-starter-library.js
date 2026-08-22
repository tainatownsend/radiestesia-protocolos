import { createStore } from './store.js';

export const STARTER_GRAPHS=Object.freeze([
'Srim','Shin','Magnetron','Neutralize','Revitalizador dos Chakras','Cruz de São Mauro','Cruz Atlante','Antakarana','Devadatta','Arcanjo Miguel','Escudo Mágico','Pirâmide Tao','Psico Protetor','Labirinto de Chartres','Quadrata','Turbilhão','Cruz Cósmica','Turbilhão c/ Mercúrio','Turbilhão c/ Vênus','9 Círculos','Arcanjo Rafael','Estrela de Davi','Energizador','Desembaraçador Relacionamento/Material','Espiral Cósmica','4 Círculos','Programador Celular','Código 21','Flor da Vida','Iave','Saemju','Turbilhão com Lua','Labirinto D’Ariens','Alta Vitalidade','Luxor','Trígono Protetor','Prosperador','Desimpregnador','Scap','Triturador','Harmonia','Anti Magia','Diafragma 1','Relax Sono','Baguá','Equilíbrio','Emissor Reiki','SOS Saúde','Alfa-Omega','Anti-depress','Abundância Financeira','Tetagramaton','Turbilhão c/ Júpiter','Hiranya','Energia Divina','Cubo Metatron','Placa Keiti','Quadrado Mágico','Turbilhão com Sol','Krim','Yoshua'
]);

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
      draft.tools.push({id:`starter_graph_${slug(name)}`,name,type:'GRAFICO',purpose:'',practitionerNotes:'',tags:[],source:'Biblioteca inicial Fluxa',status:'ACTIVE',createdAt:now,updatedAt:now,starterGraph:true});
      existing.add(key(name));added++;
    }
    return draft;
  });
  return added;
}

ensureStarterGraphs();
