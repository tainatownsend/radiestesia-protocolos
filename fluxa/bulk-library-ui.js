import { createStore } from './store.js';
import { parseLibraryBulkText, prepareLibraryBulkImport, importLibraryItems, libraryItemsToCsv } from './bulk-library.js';

const store=createStore();
let preview=null;
let enhancing=false;

const typeLabel={GRAPH:'Gráfico',BIOMETER:'Biômetro',OTHER:'Outro recurso'};
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function close(){document.querySelector('#bulk-library-overlay')?.remove();preview=null;}
function overlay(html){close();const wrap=document.createElement('div');wrap.id='bulk-library-overlay';wrap.className='modal-backdrop';wrap.innerHTML=html;document.body.appendChild(wrap);}
function downloadBlob(text,type,name){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}

function ensureAction(){
  const main=document.querySelector('main');if(!main||main.querySelector('[data-bulk-library-import]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Biblioteca')return;
  const resourceHeading=[...main.querySelectorAll('h2')].find((node)=>node.textContent?.trim()==='Gráficos e ferramentas');
  const head=resourceHeading?.closest('.section-head');if(!head)return;
  const actions=head.querySelector('.button-row')||document.createElement('div');
  if(!actions.isConnected){actions.className='button-row';const existing=head.querySelector('button');if(existing){existing.remove();actions.appendChild(existing);}head.appendChild(actions);}
  const importButton=document.createElement('button');importButton.className='btn secondary small';importButton.dataset.bulkLibraryImport='true';importButton.textContent='Importar em lote';
  const exportButton=document.createElement('button');exportButton.className='btn ghost small';exportButton.dataset.bulkLibraryExport='true';exportButton.textContent='Exportar CSV';
  actions.prepend(exportButton);actions.prepend(importButton);
}

function templateDialog(){
  overlay(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Biblioteca</p><h2>Importar recursos em lote</h2></div><button class="close-btn" data-bulk-close>×</button></div>
    <p class="lead">Selecione um arquivo ou cole direto de Excel, Numbers ou Google Sheets. O Fluxa mostra uma prévia e ignora nomes duplicados antes de salvar.</p>
    <section class="card soft section"><div class="section-head"><div><h3>Formato recomendado</h3><p class="muted">Colunas: <strong>Nome</strong>, <strong>Tipo</strong>, <strong>Finalidade</strong> e <strong>Observações</strong>. Tipo: Gráfico, Biômetro ou Outro.</p></div><button class="btn ghost small" data-bulk-download-template>Baixar modelo CSV</button></div><div class="notice">Também funciona com uma lista simples: um nome de gráfico por linha. Nesse caso, o tipo padrão será Gráfico.</div></section>
    <div class="bulk-source-grid section"><label class="btn primary wide" style="display:flex;align-items:center;justify-content:center"><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" data-bulk-file hidden>Selecionar arquivo</label><span class="bulk-or">ou</span><div class="field"><label for="bulk-paste-input">Colar lista / planilha</label><textarea id="bulk-paste-input" data-bulk-paste-input rows="7" placeholder="Nome\tTipo\tFinalidade\tObservações\nDesimpregnador\tGráfico\tLimpeza energética\t..."></textarea></div><button class="btn secondary wide" data-bulk-analyze-paste>Analisar texto colado</button></div>
    <p class="muted" style="text-align:center">Nenhum dado é enviado para a internet. A importação acontece localmente neste dispositivo.</p></section>`);
}

function analyzeText(label,text){
  try{const parsed=parseLibraryBulkText(text);const prepared=prepareLibraryBulkImport(store.getState(),parsed.items);previewDialog(label,parsed,prepared);}catch(error){alert(`Não foi possível analisar estes dados: ${error.message}`);}
}

function downloadTemplate(){
  const csv='\uFEFFNome,Tipo,Finalidade,Observações\nDesimpregnador,Gráfico,Limpeza energética,Usar conforme protocolo\nEscala exemplo,Biômetro,Medição,\n';
  downloadBlob(csv,'text/csv;charset=utf-8','fluxa-modelo-biblioteca.csv');
}

function exportLibrary(){
  const tools=(store.getState().tools||[]).filter((tool)=>!tool.archivedAt);
  if(!tools.length){alert('A Biblioteca ainda não possui recursos ativos para exportar.');return;}
  const date=new Date().toISOString().slice(0,10);
  downloadBlob(libraryItemsToCsv(tools),'text/csv;charset=utf-8',`fluxa-biblioteca-${date}.csv`);
}

function previewDialog(fileName, parsed, prepared){
  preview={fileName,parsed,prepared};
  const rows=prepared.ready.slice(0,12);
  overlay(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Prévia da importação</p><h2>${esc(fileName)}</h2></div><button class="close-btn" data-bulk-close>×</button></div>
    <div class="bulk-import-summary"><span>${parsed.items.length} lidos</span><span>${prepared.ready.length} novos</span><span>${prepared.duplicates.length} duplicados ignorados</span>${parsed.errors.length?`<span>${parsed.errors.length} aviso(s)</span>`:''}</div>
    ${prepared.ready.length?`<div style="overflow:auto"><table class="bulk-preview-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Finalidade</th></tr></thead><tbody>${rows.map((item)=>`<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(typeLabel[item.type]||'Outro')}</td><td>${esc(item.purpose||'—')}</td></tr>`).join('')}</tbody></table></div>${prepared.ready.length>rows.length?`<p class="muted">Prévia dos primeiros ${rows.length}. Os ${prepared.ready.length} novos recursos serão importados.</p>`:''}`:'<div class="empty">Nenhum recurso novo encontrado nestes dados.</div>'}
    ${parsed.errors.length?`<details class="section"><summary>Ver avisos</summary><div class="notice" style="margin-top:10px">${parsed.errors.slice(0,20).map(esc).join('<br>')}</div></details>`:''}
    <div class="button-row section"><button class="btn secondary" data-bulk-back>Voltar</button><button class="btn primary" data-bulk-confirm ${prepared.ready.length?'':'disabled'}>Importar ${prepared.ready.length} recurso(s)</button></div></section>`);
  preview={fileName,parsed,prepared};
}

function doneDialog(count){
  overlay(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Biblioteca atualizada</p><h2>${count} recurso(s) importado(s)</h2></div><button class="close-btn" data-bulk-close>×</button></div><p class="lead">Os novos recursos já podem ser usados em tratamentos, preparação e protocolos.</p><button class="btn primary wide section" data-bulk-close>Concluir</button></section>`);
}

function enhance(){if(enhancing)return;enhancing=true;try{ensureAction();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const button=event.target.closest('button,[data-bulk-library-import]');if(!button)return;
  if(button.dataset.bulkLibraryImport!==undefined){templateDialog();return;}
  if(button.dataset.bulkLibraryExport!==undefined){exportLibrary();return;}
  if(button.dataset.bulkClose!==undefined){close();return;}
  if(button.dataset.bulkBack!==undefined){templateDialog();return;}
  if(button.dataset.bulkDownloadTemplate!==undefined){downloadTemplate();return;}
  if(button.dataset.bulkAnalyzePaste!==undefined){const text=document.querySelector('[data-bulk-paste-input]')?.value||'';if(!text.trim()){alert('Cole uma lista ou planilha antes de analisar.');return;}analyzeText('Texto colado',text);return;}
  if(button.dataset.bulkConfirm!==undefined&&preview){
    try{const created=importLibraryItems(store,preview.prepared.ready);doneDialog(created.length);}catch(error){alert(error.message);}return;
  }
},true);

document.addEventListener('change',(event)=>{
  const input=event.target.closest('[data-bulk-file]');if(!input?.files?.[0])return;
  const file=input.files[0];
  const reader=new FileReader();
  reader.onload=()=>analyzeText(file.name,reader.result);
  reader.onerror=()=>alert('Não foi possível ler o arquivo selecionado.');
  reader.readAsText(file);
},true);
