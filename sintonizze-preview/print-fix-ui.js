(()=>{'use strict';
let previous = null;
const by = s => document.querySelector(s);
const sheetStyle = 'body{font:15px/1.5 Arial,sans-serif;color:#193c30;max-width:790px;margin:auto;padding:20px}.eyebrow{font-size:11px;letter-spacing:1.3px;text-transform:uppercase;color:#52715b;font-weight:bold}h1{font-size:27px}h2{font-size:19px;border-bottom:1px solid #dae5dc;padding-bottom:5px;margin-top:28px}.meta{font-size:12px;color:#526b5c}.resultitem{border-bottom:1px solid #e3ece4;padding:10px 0;break-inside:avoid}.resultitem p{white-space:pre-wrap;overflow-wrap:anywhere}.badge{display:inline-block;border-radius:12px;background:#edf6ef;padding:3px 9px;color:#1e6b51;font-size:12px;font-weight:bold}.print-item{border-bottom:1px solid #e3ece4;padding:10px 0;break-inside:avoid}p{overflow-wrap:anywhere}@page{size:A4;margin:14mm}@media print{body{padding:0;max-width:none}h2{break-after:avoid}}';
function printable(){
 const intro = by('.ns-report-intro');
 const results = by('.ns-result-card');
 if(!intro || !results) return null;
 const sheet = document.createElement('article'); sheet.className='print-sheet';
 const eyebrow = document.createElement('div'); eyebrow.className='eyebrow'; eyebrow.textContent='SINTONIZZE · RELATÓRIO DE INVESTIGAÇÃO'; sheet.append(eyebrow);
 const name = document.createElement('h1');name.textContent=intro.querySelector('h1')?.textContent||'Resultados';sheet.append(name);
 const meta=document.createElement('p');meta.className='meta';meta.textContent=intro.querySelector('.lead')?.textContent||'';sheet.append(meta);
 const title = document.createElement('h2');title.textContent='Resultados registrados';sheet.append(title);
 const items=results.querySelectorAll('.resultitem');
 if(items.length){for(const item of items){const copy=item.cloneNode(true);sheet.append(copy)}}
 else{const empty=document.createElement('p');empty.textContent=results.querySelector('.empty')?.textContent||'Nenhuma resposta atende ao filtro positivo.';sheet.append(empty)}
 const main = by('.main');
 const heading=Array.from(main?.children||[]).find(n=>n.classList?.contains('sectionhead')&&n.textContent.includes('Tratamentos vinculados'));
 if(heading){const treatmentTitle=document.createElement('h2');treatmentTitle.textContent='Tratamentos registrados';sheet.append(treatmentTitle);let node=heading.nextElementSibling;while(node && !node.classList.contains('ns-print')){if(node.classList.contains('card')){const copy=node.cloneNode(true);copy.classList.add('print-item');sheet.append(copy)}node=node.nextElementSibling}}
 const note=document.createElement('p');note.className='meta';note.style.marginTop='26px';note.style.borderTop='1px solid #dae5dc';note.style.paddingTop='12px';note.textContent='Respostas e práticas simbólicas registradas. Percentuais não são medidas clínicas ou evidências objetivas de causas ou eficácia de tratamentos.';sheet.append(note);
 return sheet;
}
function openPrintable(){const sheet=printable();if(!sheet)return;const root=by('#app');previous=root.innerHTML;
 root.innerHTML='<main class="print-layout"><div class="print-toolbar"><button type="button" class="btn" data-print-flow="back">← Voltar aos resultados</button><div class="print-toolbar-actions"><button type="button" class="btn primary" data-print-flow="dialog">Imprimir / Salvar PDF</button><button type="button" class="btn subtle" data-print-flow="save">Salvar cópia do relatório</button></div></div><div class="print-instructions"><strong>Versão pronta para impressão</strong><p>No iPhone, toque em <strong>Compartilhar</strong> na barra do navegador e escolha <strong>Imprimir</strong>. Para salvar em PDF, na prévia de impressão amplie a página com dois dedos e use Compartilhar → Salvar em Arquivos. Se seu navegador permitir, use o botão “Imprimir / Salvar PDF”.</p></div></main>';
 root.querySelector('main').append(sheet);window.scrollTo(0,0);
}
function saveReport(){const sheet=by('.print-sheet');if(!sheet)return;const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sintonizze · Relatório</title><style>'+sheetStyle+'</style></head><body>'+sheet.outerHTML+'</body></html>';const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Sintonizze-Relatorio.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-action="print"],[data-print-flow]');if(!trigger)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(trigger.dataset.action==='print')return openPrintable();
 const action=trigger.dataset.printFlow;
 if(action==='back'){if(previous!==null){by('#app').innerHTML=previous;previous=null;window.scrollTo(0,0)}return}
 if(action==='dialog'){if(typeof window.print==='function')window.print();return}
 if(action==='save')return saveReport();
},true);
})();
