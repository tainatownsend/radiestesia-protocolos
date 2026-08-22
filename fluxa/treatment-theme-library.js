const SOURCES=Object.freeze([
  '../app.js','../marriage.js','../protocols-v11-core.js','../protocols-v11-expansion.js','../protocols-v11-quick.js','../deep-tree.js','../deep-tree-2.js'
]);

let catalog=[];
let loading=null;

function decode(value=''){return String(value).replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"').replace(/\\\\/g,'\\');}
function normalize(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function inferTheme(title='',command=''){
  const text=normalize(`${title} ${command}`);
  const rules=[
    ['Financeiro',['finance','dinheiro','prosper','escassez','material','receber','cobrar','dívida','divida']],
    ['Carreira',['carreira','profission','trabalho','liderança','lideranca','sucesso','reconhecimento']],
    ['Relacionamentos',['relacion','casamento','afetiv','amor','parceir','conflito','separação','separacao']],
    ['Família e ancestralidade',['famil','ancestr','transger','parent','linhagem','lealdade']],
    ['Autoestima e identidade',['autoestima','amor-próprio','amor proprio','merecimento','identidade','autovalor','corpo']],
    ['Casa e ambiente',['casa','ambiente','lar','espaço','espaco']],
    ['Propósito e criatividade',['propósito','proposito','missão','missao','criativ','projeto','caminho de vida']],
    ['Energia e padrões',['energ','vínculo','vinculo','cordão','cordao','padrão','padrao','kárm','karm','voto','pacto','crença','crenca']]
  ];
  return rules.find(([,terms])=>terms.some(term=>text.includes(normalize(term))))?.[0]||'Outros temas';
}
function parsePlans(source,path){
  const items=[];
  const add=(legacyId,title,command)=>{title=decode(title);command=decode(command);if(!title||!command)return;items.push({id:`${path}:${legacyId}`,legacyId,title,command,theme:inferTheme(title,command),sourcePath:path,search:normalize(`${title} ${command}`)});};
  const callRe=/([A-Za-z0-9_]+)\s*:\s*(?:C|P)\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*\)/g;
  for(const m of source.matchAll(callRe))add(m[1],m[2],m[3]);
  const objectRe=/([A-Za-z0-9_]+)\s*:\s*\{\s*label\s*:\s*'((?:\\.|[^'])*)'\s*,\s*command\s*:\s*'((?:\\.|[^'])*)'\s*\}/g;
  for(const m of source.matchAll(objectRe))add(m[1],m[2],m[3]);
  return items;
}
async function sourceText(path){const response=await fetch(new URL(path,import.meta.url),{cache:'no-cache'});if(!response.ok)throw new Error(`Falha ao carregar ${path}`);return response.text();}

export async function ensureTreatmentThemeLibrary(){
  if(loading)return loading;
  loading=(async()=>{
    const all=[];
    for(const path of SOURCES){try{all.push(...parsePlans(await sourceText(path),path));}catch(error){console.warn('Fluxa: sugestões terapêuticas indisponíveis',path,error);}}
    const unique=[],seen=new Set();
    for(const item of all){const key=normalize(`${item.title}|${item.command}`);if(seen.has(key))continue;seen.add(key);unique.push(item);}
    catalog=unique.sort((a,b)=>a.theme.localeCompare(b.theme,'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
    window.dispatchEvent(new CustomEvent('fluxa:treatment-theme-library-ready',{detail:{count:catalog.length}}));
    return catalog;
  })();
  return loading;
}
export function treatmentThemeLibrary(){return catalog;}
export function treatmentThemeById(id){return catalog.find(item=>item.id===id)||null;}
export const TREATMENT_THEME_SOURCES=SOURCES;

queueMicrotask(()=>ensureTreatmentThemeLibrary());
