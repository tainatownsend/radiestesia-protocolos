(function(){
'use strict';
let treatmentRecords={};
function planFor(tag){return (window.MARRIAGE_PLANS&&window.MARRIAGE_PLANS[tag])||(typeof PLANS!=='undefined'&&PLANS[tag])||{label:tag,command:''}}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function renderTreatmentItems(){
 const host=document.getElementById('treatmentItems'); if(!host||typeof state==='undefined')return; host.innerHTML=''; treatmentRecords={};
 const tags=(state.findings||[]).filter((t,i,a)=>a.indexOf(t)===i);
 if(!tags.length){host.innerHTML='<section class="card"><p class="muted">Nenhum item específico foi identificado.</p></section>';return}
 tags.forEach((tag,idx)=>{const p=planFor(tag); treatmentRecords[tag]=[{graph:'',time:''}]; const card=document.createElement('section');card.className='card treatmentCard';card.dataset.tag=tag;card.innerHTML=`<span class="pill">Item ${idx+1}</span><h3>${esc(p.label)}</h3><p><b>Comando sugerido</b></p><p class="command">${esc(p.command)}</p><div class="graphs" data-tag="${esc(tag)}"></div><button type="button" class="ghost addGraph" data-tag="${esc(tag)}">+ Adicionar gráfico</button><div class="field"><label>Observações deste item</label><textarea class="itemNotes" data-tag="${esc(tag)}" placeholder="Resposta, validação, percepção..."></textarea></div>`;host.appendChild(card);addGraphRow(tag,card.querySelector('.graphs'),0)});
 host.querySelectorAll('.addGraph').forEach(b=>b.onclick=()=>{const tag=b.dataset.tag;const box=b.closest('.treatmentCard').querySelector('.graphs');treatmentRecords[tag].push({graph:'',time:''});addGraphRow(tag,box,treatmentRecords[tag].length-1)});
}
function addGraphRow(tag,box,i){const row=document.createElement('div');row.className='graphRow';row.innerHTML=`<div class="field"><label>Gráfico ${i+1}</label><input class="graphName" data-tag="${esc(tag)}" data-i="${i}" placeholder="Nome do gráfico"></div><div class="field"><label>Tempo</label><input class="graphTime" data-tag="${esc(tag)}" data-i="${i}" placeholder="Ex.: 10 min"></div>`;box.appendChild(row)}
function collect(){document.querySelectorAll('.graphName').forEach(x=>{if(treatmentRecords[x.dataset.tag]?.[+x.dataset.i])treatmentRecords[x.dataset.tag][+x.dataset.i].graph=x.value});document.querySelectorAll('.graphTime').forEach(x=>{if(treatmentRecords[x.dataset.tag]?.[+x.dataset.i])treatmentRecords[x.dataset.tag][+x.dataset.i].time=x.value});const notes={};document.querySelectorAll('.itemNotes').forEach(x=>notes[x.dataset.tag]=x.value);return notes}
function appendTreatmentToReport(){if(typeof state==='undefined')return;const notes=collect(),body=document.getElementById('reportBody');if(!body)return;const tags=(state.findings||[]).filter((t,i,a)=>a.indexOf(t)===i);const sec=document.createElement('section');sec.className='card reportSection';sec.innerHTML='<h3>Tratamento realizado por item</h3>';tags.forEach(tag=>{const p=planFor(tag),d=document.createElement('div');d.className='reportTreatment';let gs=(treatmentRecords[tag]||[]).filter(g=>g.graph||g.time);d.innerHTML=`<h4>${esc(p.label)}</h4><p><b>Comando:</b> ${esc(p.command)}</p>`+(gs.length?'<ul>'+gs.map(g=>`<li><b>Gráfico:</b> ${esc(g.graph||'—')} &nbsp; <b>Tempo:</b> ${esc(g.time||'—')}</li>`).join('')+'</ul>':'<p class="muted">Nenhum gráfico registrado.</p>')+(notes[tag]?`<p><b>Observações:</b> ${esc(notes[tag])}</p>`:'');sec.appendChild(d)});body.appendChild(sec)}
function install(){
 const btn=document.getElementById('toTreatmentBtn');if(btn)btn.addEventListener('click',()=>setTimeout(renderTreatmentItems,0));
 const report=document.getElementById('makeReportBtn');if(report)report.addEventListener('click',()=>setTimeout(appendTreatmentToReport,0));
 const print=document.getElementById('printBtn');if(print)print.onclick=()=>window.print();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();