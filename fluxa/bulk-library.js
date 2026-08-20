import { ToolType } from './activity-library.js';

const TYPE_ALIASES = new Map([
  ['GRAPH', ToolType.GRAPH], ['GRAFICO', ToolType.GRAPH], ['GRÁFICO', ToolType.GRAPH],
  ['BIOMETER', ToolType.BIOMETER], ['BIOMETRO', ToolType.BIOMETER], ['BIÔMETRO', ToolType.BIOMETER],
  ['OTHER', ToolType.OTHER], ['OUTRO', ToolType.OTHER], ['RECURSO', ToolType.OTHER]
]);

function clean(value='') { return String(value ?? '').trim(); }
function normalizeKey(value='') { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function normalizeType(value='') {
  const raw = clean(value).toUpperCase();
  return TYPE_ALIASES.get(raw) || ToolType.GRAPH;
}

function splitDelimitedLine(line, delimiter) {
  const cells=[]; let current=''; let quoted=false;
  for (let i=0;i<line.length;i++) {
    const char=line[i];
    if (char==='"') {
      if (quoted && line[i+1]==='"') { current+='"'; i++; }
      else quoted=!quoted;
      continue;
    }
    if (char===delimiter && !quoted) { cells.push(current); current=''; continue; }
    current+=char;
  }
  cells.push(current);
  return cells.map(clean);
}

function detectDelimiter(firstLine='') {
  const candidates=[',',';','\t'];
  return candidates.sort((a,b)=>(firstLine.split(b).length-firstLine.split(a).length))[0];
}

function headerMap(cells) {
  const aliases={
    name:['nome','name','grafico','gráfico','recurso'],
    type:['tipo','type','categoria'],
    purpose:['finalidade','purpose','uso','objetivo'],
    notes:['observacoes','observações','notes','nota','notas']
  };
  const result={};
  cells.forEach((cell,index)=>{
    const key=normalizeKey(cell);
    for (const [field,names] of Object.entries(aliases)) {
      if (names.map(normalizeKey).includes(key)) result[field]=index;
    }
  });
  return result;
}

export function parseLibraryBulkText(text) {
  const raw=String(text||'').replace(/^\uFEFF/,'').trim();
  if (!raw) return { items:[], errors:['O arquivo está vazio.'], delimiter:',' };
  const lines=raw.split(/\r?\n/).filter((line)=>line.trim());
  const delimiter=detectDelimiter(lines[0]);
  const first=splitDelimitedLine(lines[0],delimiter);
  const map=headerMap(first);
  const hasHeader=Number.isInteger(map.name);
  const start=hasHeader?1:0;
  const items=[]; const errors=[];
  for (let i=start;i<lines.length;i++) {
    const cells=splitDelimitedLine(lines[i],delimiter);
    const name=clean(hasHeader?cells[map.name]:cells[0]);
    if (!name) { errors.push(`Linha ${i+1}: nome vazio.`); continue; }
    const type=normalizeType(hasHeader && Number.isInteger(map.type)?cells[map.type]:cells[1]);
    const purpose=clean(hasHeader && Number.isInteger(map.purpose)?cells[map.purpose]:cells[2]) || null;
    const notes=clean(hasHeader && Number.isInteger(map.notes)?cells[map.notes]:cells[3]) || null;
    items.push({ name, type, purpose, notes, sourceLine:i+1 });
  }
  return { items, errors, delimiter };
}

export function prepareLibraryBulkImport(state, parsedItems) {
  const existingNames=new Set((state.tools||[]).filter((item)=>!item.archivedAt).map((item)=>normalizeKey(item.name)));
  const seen=new Set(); const ready=[]; const duplicates=[];
  for (const item of parsedItems||[]) {
    const key=normalizeKey(item.name);
    if (!key) continue;
    if (existingNames.has(key) || seen.has(key)) { duplicates.push(item); continue; }
    seen.add(key); ready.push(item);
  }
  return { ready, duplicates };
}

export function importLibraryItems(store, items) {
  if (!items?.length) throw new Error('Nenhum recurso novo para importar.');
  const now=store.nowIso();
  const created=items.map((item)=>({
    id:store.makeId('tool'), type:normalizeType(item.type), name:clean(item.name),
    purpose:clean(item.purpose)||null, notes:clean(item.notes)||null,
    createdAt:now, updatedAt:now, archivedAt:null
  }));
  store.setState((state)=>{
    const draft=structuredClone(state);
    draft.tools=Array.isArray(draft.tools)?draft.tools:[];
    draft.events=Array.isArray(draft.events)?draft.events:[];
    draft.tools.push(...created);
    for (const tool of created) {
      draft.events.push({
        id:store.makeId('evt'), eventType:'TOOL_CREATED', entityType:'Tool', entityId:tool.id,
        sessionId:null, assistedEntityId:null, occurredAt:now, createdAt:now,
        metadata:{name:tool.name,type:tool.type,bulkImport:true}
      });
    }
    return draft;
  });
  return created;
}
