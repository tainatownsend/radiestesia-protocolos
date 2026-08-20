import { createStore } from './store.js';
import { parseLibraryBulkText, prepareLibraryBulkImport, importLibraryItems } from './bulk-library.js';

const store=createStore();
let preview=null;
let enhancing=false;

const typeLabel={GRAPH:'Gráfico',BIOMETER:'Biômetro',OTHER:'Outro recurso'};
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function close(){document.querySelector('#bulk-library-overlay')?.remove();preview=null;}
function overlay(html){close();const wrap=document.createElement('div');wrap.id='bulk-library-overlay';wrap.className='modal-backdrop';wrap.innerHTML=html;document.body.appendChild(wrap);}

function ensureAction(){
  const main=document.querySelector('main');if(!main||main.querySelector('[data-bulk-library-import]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Biblioteca')return;
  const resourceHeading=[...main.querySelectorAll('h2')].find((node)=>node.textContent?.trim()==='Gráficos e ferramentas');
  const head=resourceHeading?.closest('.section-head');if(!head)return;
  const actions=head.querySelector('.button-row')||document.createElement('div');
  if(!actions.isConnected){actions.className='button-row';const existing=head.querySelector('button');if(existing){existing.remove();actions.appendChild(existing);}head.appendChild(actions);}
  const button=document.createElement('button');button.className='btn secondary small';button.dataset.bulkLibraryImport='true';button.textContent='Importar em lote';actions.prepend(button);
}

function templateDialog(){
  overlay(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Biblioteca</p><h2>Importar recursos em lote</h2></div><button class="close-btn" data-bulk-close>×</button></div>
    <p class="lead">Carregue CSV, TSV ou TXT. O Fluxa mostra uma prévia e ignora nomes duplicados antes de salvar.</p>
    <section class="card soft section"><h3>Formato recomendado</h3><p class="muted">Use as colunas <strong>Nome</strong>, <strong>Tipo</strong>, <strong>Finalidade</strong> e <strong>Observações</strong>. Tipo pode ser Gráfico, Biômetro ou Outro.</p><div class="notice">Exemplo: <strong>Nome,Tipo,Finalidade,Observações</strong><br>Desimpregnador,Gráfico,Limpeza energética,Usar conforme protocolo</div></section>
    <label class="btn primary wide section" style="display:flex;align-items:center;justify-content:center"><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" data-bulk-file hidden>Selecionar arquivo</label>
    <p class="muted" style="text-align:center">Nenhum dado é enviado para a internet. A importação acontece localmente neste dispositivo.</p></section>`);
}

function previewDialog(fileName, parsed, prepared){
  preview={fileName,parsed,prepared};
  const rows=prepared.ready.slice(0,12);
  overlay(`<section class="sheet detail-sheet"><div class="sheet-head"><div><p class="eyebrow">Prévia da importação</p><h2>${esc(fileName)}</h2></div><button class="close-btn" data-bulk-close>×</button></div>
    <div class="bulk-import-summary"><span>${parsed.items.length} lidos</span><span>${prepared.ready.length} novos</span><span>${prepared.duplicates.length} duplicados ignorados</span>${parsed.errors.length?`<span>${parsed.errors.length} aviso(s)</span>`:''}</div>
    ${prepared.ready.length?`<div style="overflow:auto"><table class="bulk-preview-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Finalidade</th></tr></thead><tbody>${rows.map((item)=>`<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(typeLabel[item.type]||'Outro')}</td><td>${esc(item.purpose||'—')}</td></tr>`).join('')}</tbody></table></div>${prepared.ready.length>rows.length?`<p class="muted">Prévia dos primeiros ${rows.length}. Os ${prepared.ready.length} novos recursos serão importados.</p>`:''}`:'<div class="empty">Nenhum recurso novo encontrado neste arquivo.</div>'}
    ${parsed.errors.length?`<details class="section"><summary>Ver avisos do arquivo</summary><div class="notice" style="margin-top:10px">${parsed.errors.slice(0,20).map(esc).join('<br>')}</div></details>`:''}
    <div class="button-row section"><button class="btn secondary" data-bulk-back>Escolher outro arquivo</button><button class="btn primary" data-bulk-confirm ${prepared.ready.length?'':'disabled'}>Importar ${prepared.ready.length} recurso(s)</button></div></section>`);
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
  if(button.dataset.bulkClose!==undefined){close();return;}
  if(button.dataset.bulkBack!==undefined){templateDialog();return;}
  if(button.dataset.bulkConfirm!==undefined&&preview){
    try{const created=importLibraryItems(store,preview.prepared.ready);doneDialog(created.length);}catch(error){alert(error.message);}return;
  }
},true);

document.addEventListener('change',(event)=>{
  const input=event.target.closest('[data-bulk-file]');if(!input?.files?.[0])return;
  const file=input.files[0];
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=parseLibraryBulkText(reader.result);
      const prepared=prepareLibraryBulkImport(store.getState(),parsed.items);
      previewDialog(file.name,parsed,prepared);
    }catch(error){alert(`Não foi possível ler este arquivo: ${error.message}`);}
  };
  reader.onerror=()=>alert('Não foi possível ler o arquivo selecionado.');
  reader.readAsText(file);
},true);
