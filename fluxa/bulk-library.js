import { ToolType, normalizeToolTags } from './activity-library.js';

const TYPE_ALIASES=new Map([['GRAPH',ToolType.GRAPH],['GRAFICO',ToolType.GRAPH],['GRÁFICO',ToolType.GRAPH],['BIOMETER',ToolType.BIOMETER],['BIOMETRO',ToolType.BIOMETER],['BIÔMETRO',ToolType.BIOMETER],['OTHER',ToolType.OTHER],['OUTRO',ToolType.OTHER],['RECURSO',ToolType.OTHER],['OUTRO RECURSO',ToolType.OTHER]]);
const TYPE_LABELS=Object.freeze({GRAPH:'Gráfico',BIOMETER:'Biômetro',OTHER:'Outro recurso'});
function clean(value=''){return String(value??'').trim();}
function normalizeKey(value=''){return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function normalizeType(value=''){return TYPE_ALIASES.get(clean(value).toUpperCase())||ToolType.GRAPH;}
function csvCell(value=''){const text=String(value??'');return /[",\n\r;]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function detectDelimiter(firstLine=''){const candidates=[',',';','\t'];return candidates.sort((a,b)=>(firstLine.split(b).length-firstLine.split(a).length))[0];}
function headerMap(cells){const aliases={name:['nome','name','grafico','gráfico','recurso'],type:['tipo','type','categoria'],purpose:['finalidade','purpose','uso','objetivo'],tags:['tags','tag','etiquetas','etiqueta','palavras-chave','palavras chave'],notes:['observacoes','observações','notes','nota','notas']},result={};cells.forEach((cell,index)=>{const key=normalizeKey(cell);for(const[field,names]of Object.entries(aliases))if(names.map(normalizeKey).includes(key))result[field]=index;});return result;}
function parseDelimitedRecords(text,delimiter){
  const records=[],errors=[];let cells=[],current='',quoted=false,line=1,startLine=1;
  const finishCell=()=>{cells.push(clean(current));current='';};
  const finishRecord=()=>{finishCell();if(cells.some((cell)=>cell.trim()))records.push({cells,startLine});cells=[];startLine=line;};
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){current+='"';i++;continue;}
      quoted=!quoted;continue;
    }
    if(char===delimiter&&!quoted){finishCell();continue;}
    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i++;
      line++;finishRecord();startLine=line;continue;
    }
    if(char==='\r'&&quoted&&text[i+1]==='\n'){current+='\n';i++;line++;continue;}
    if(char==='\n'){current+='\n';line++;continue;}
    current+=char;
  }
  if(quoted)errors.push(`Linha ${startLine}: aspas não fechadas.`);
  if(current.length||cells.length)finishRecord();
  return{records,errors};
}

export function parseLibraryBulkText(text){
  const raw=String(text||'').replace(/^\uFEFF/,'').trim();if(!raw)return{items:[],errors:['O arquivo está vazio.'],delimiter:','};
  const firstPhysicalLine=raw.split(/\r?\n/,1)[0],delimiter=detectDelimiter(firstPhysicalLine),parsed=parseDelimitedRecords(raw,delimiter),records=parsed.records;
  if(!records.length)return{items:[],errors:parsed.errors.length?parsed.errors:['O arquivo está vazio.'],delimiter};
  const first=records[0].cells,map=headerMap(first),hasHeader=Number.isInteger(map.name),start=hasHeader?1:0,items=[],errors=[...parsed.errors];
  for(let i=start;i<records.length;i++){
    const record=records[i],cells=record.cells,name=clean(hasHeader?cells[map.name]:cells[0]);if(!name){errors.push(`Linha ${record.startLine}: nome vazio.`);continue;}
    const type=normalizeType(hasHeader&&Number.isInteger(map.type)?cells[map.type]:cells[1]),purpose=clean(hasHeader&&Number.isInteger(map.purpose)?cells[map.purpose]:cells[2])||null;
    const tags=normalizeToolTags(hasHeader&&Number.isInteger(map.tags)?cells[map.tags]:'');
    const notes=clean(hasHeader&&Number.isInteger(map.notes)?cells[map.notes]:cells[hasHeader?4:3])||null;
    items.push({name,type,purpose,tags,notes,sourceLine:record.startLine});
  }
  return{items,errors,delimiter};
}
export function prepareLibraryBulkImport(state,parsedItems){const existingNames=new Set((state.tools||[]).filter((item)=>!item.archivedAt).map((item)=>normalizeKey(item.name))),seen=new Set(),ready=[],duplicates=[];for(const item of parsedItems||[]){const key=normalizeKey(item.name);if(!key)continue;if(existingNames.has(key)||seen.has(key)){duplicates.push(item);continue;}seen.add(key);ready.push(item);}return{ready,duplicates};}
export function importLibraryItems(store,items){
  if(!items?.length)throw new Error('Nenhum recurso novo para importar.');const now=store.nowIso();
  const created=items.map((item)=>({id:store.makeId('tool'),type:normalizeType(item.type),name:clean(item.name),purpose:clean(item.purpose)||null,tags:normalizeToolTags(item.tags),notes:clean(item.notes)||null,createdAt:now,updatedAt:now,archivedAt:null}));
  store.setState((state)=>{const draft=structuredClone(state);draft.tools=Array.isArray(draft.tools)?draft.tools:[];draft.events=Array.isArray(draft.events)?draft.events:[];draft.tools.push(...created);for(const tool of created)draft.events.push({id:store.makeId('evt'),eventType:'TOOL_CREATED',entityType:'Tool',entityId:tool.id,sessionId:null,assistedEntityId:null,occurredAt:now,createdAt:now,metadata:{name:tool.name,type:tool.type,tags:tool.tags,bulkImport:true}});return draft;});return created;
}
export function libraryItemsToCsv(tools){const active=(tools||[]).filter((tool)=>!tool.archivedAt).sort((a,b)=>clean(a.name).localeCompare(clean(b.name),'pt-BR')),rows=['Nome,Tipo,Finalidade,Tags,Observações'];for(const tool of active)rows.push([clean(tool.name),TYPE_LABELS[tool.type]||TYPE_LABELS.OTHER,clean(tool.purpose),normalizeToolTags(tool.tags).join(', '),clean(tool.notes)].map(csvCell).join(','));return `\uFEFF${rows.join('\n')}\n`;}
