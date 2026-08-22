import { DIVORCE_ENERGY_GENERAL,DIVORCE_ENERGY_CUT } from './divorce-energy-domain.js';
import { normalizeTreatmentThemeText,parseTreatmentPlans } from './treatment-theme-parser.js';

const SOURCES=Object.freeze([
  '../app.js','../marriage.js','../protocols-v11-core.js','../protocols-v11-expansion.js','../protocols-v11-quick.js','../deep-tree.js','../deep-tree-2.js'
]);

const BUILTIN_SUGGESTIONS=Object.freeze([
  Object.freeze({id:'fluxa:divorce-general',legacyId:'divorce_general',title:DIVORCE_ENERGY_GENERAL.label,command:`${DIVORCE_ENERGY_GENERAL.command} Gráfico sugerido no protocolo original: ${DIVORCE_ENERGY_GENERAL.graph}.`,theme:'Divórcio Energético',sourcePath:'fluxa/divorce-energy-domain.js'}),
  Object.freeze({id:'fluxa:divorce-cut',legacyId:'divorce_cut',title:DIVORCE_ENERGY_CUT.label,command:`${DIVORCE_ENERGY_CUT.command} Gráfico sugerido no protocolo original: ${DIVORCE_ENERGY_CUT.graph}.`,theme:'Divórcio Energético',sourcePath:'fluxa/divorce-energy-domain.js'})
]);

let catalog=[];
let loading=null;
let failedSources=[];

async function sourceText(path){const response=await fetch(new URL(path,import.meta.url),{cache:'no-cache'});if(!response.ok)throw new Error(`Falha ao carregar ${path}`);return response.text();}

export async function ensureTreatmentThemeLibrary(){
  if(loading)return loading;
  if(catalog.length&&failedSources.length===0)return catalog;
  loading=(async()=>{
    const all=BUILTIN_SUGGESTIONS.map(item=>({...item,search:normalizeTreatmentThemeText(`${item.title} ${item.command} ${item.theme}`)}));
    const failures=[];
    for(const path of SOURCES){
      try{all.push(...parseTreatmentPlans(await sourceText(path),path));}
      catch(error){failures.push(path);console.warn('Fluxa: sugestões terapêuticas indisponíveis',path,error);}
    }
    const unique=[],seen=new Set();
    for(const item of all){const key=normalizeTreatmentThemeText(`${item.title}|${item.command}`);if(seen.has(key))continue;seen.add(key);unique.push(item);}
    catalog=unique.sort((a,b)=>a.theme.localeCompare(b.theme,'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
    failedSources=failures;
    window.dispatchEvent(new CustomEvent('fluxa:treatment-theme-library-ready',{detail:{count:catalog.length,complete:catalog.length>0&&failedSources.length===0,failedSources:[...failedSources]}}));
    return catalog;
  })();
  try{return await loading;}finally{loading=null;}
}
export function treatmentThemeLibrary(){return catalog;}
export function treatmentThemeById(id){return catalog.find(item=>item.id===id)||null;}
export function treatmentThemeLibraryStatus(){return {count:catalog.length,complete:catalog.length>0&&failedSources.length===0,failedSources:[...failedSources]};}
export const TREATMENT_THEME_SOURCES=SOURCES;
export const TREATMENT_THEME_BUILTINS=BUILTIN_SUGGESTIONS;

queueMicrotask(()=>ensureTreatmentThemeLibrary());
