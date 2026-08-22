import { createStore } from './store.js';

const store=createStore();
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function protocolName(state,finding){
  const inv=state.investigations.find((i)=>i.id===finding.investigationId);
  return inv?.protocolSnapshot?.name || inv?.protocolName || 'Investigação';
}
function enhanceAssistedDetail(){
  const detail=document.querySelector('.detail-sheet');
  if(!detail||detail.querySelector('[data-finding-treatment-trace]'))return;
  const assistedId=detail.querySelector('[data-assisted-edit]')?.dataset.assistedEdit || detail.querySelector('[data-assisted-archive]')?.dataset.assistedArchive;
  if(!assistedId)return;
  const state=store.getState();
  const findings=state.findings.filter((f)=>f.assistedEntityId===assistedId&&f.status!=='DISMISSED').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  if(!findings.length)return;
  const section=document.createElement('section');section.className='section';section.dataset.findingTreatmentTrace='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Rastreabilidade</p><h3>Achados e tratamentos</h3></div></div><div class="stack">${findings.map((finding)=>{
    const linked=state.treatments.filter((t)=>(t.findingIds||[]).includes(finding.id));
    return `<article class="card soft"><p class="eyebrow">${esc(protocolName(state,finding))}</p><strong>${esc(finding.title||finding.questionTextSnapshot||finding.sourceQuestionText||'Achado')}</strong><p class="muted">${esc(finding.classification||'Fator relevante')}</p><p><strong>Tratado por:</strong> ${linked.length?linked.map((t)=>esc(t.title)).join(', '):'Ainda sem tratamento vinculado'}</p></article>`;
  }).join('')}</div>`;
  const timeline=[...detail.querySelectorAll('.section')].find((s)=>s.querySelector('h3')?.textContent?.trim()==='Histórico longitudinal');
  timeline?.before(section) || detail.appendChild(section);
}
function enhanceTreatmentCards(){
  const state=store.getState();
  document.querySelectorAll('.treatment-card').forEach((card)=>{
    if(card.querySelector('[data-treatment-trace]'))return;
    const treatment=state.treatments.find((t)=>t.id===card.dataset.treatmentId);if(!treatment)return;
    const findings=state.findings.filter((f)=>(treatment.findingIds||[]).includes(f.id));if(!findings.length)return;
    const details=document.createElement('details');details.className='treatment-trace-disclosure';details.dataset.treatmentTrace='true';
    details.innerHTML=`<summary><span>Origem da investigação</span><small>${findings.length} ${findings.length===1?'achado':'achados'}</small></summary><div class="treatment-trace-detail">${findings.map((f)=>`<p>${esc(protocolName(state,f))} → ${esc(f.title||f.questionTextSnapshot||'Achado')}</p>`).join('')}</div>`;
    card.querySelector('.button-row')?.after(details) || card.appendChild(details);
  });
}
function enhance(){enhanceAssistedDetail();enhanceTreatmentCards();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
