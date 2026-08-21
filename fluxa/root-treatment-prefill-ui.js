import { createStore } from './store.js';

const store=createStore();
let pending=null;
let filling=false;

function normalize(value=''){return String(value||'').trim();}

function findingsFromVisibleHandoff(){
  const handoff=document.querySelector('#root-findings-handoff');
  if(!handoff)return [];
  const cards=[...handoff.querySelectorAll('.card.soft')].map(card=>({
    title:normalize(card.querySelector('strong')?.textContent),
    command:normalize(card.querySelector('p')?.textContent)
  })).filter(item=>item.title);
  if(!cards.length)return [];
  const state=store.getState();
  const candidates=(state.findings||[])
    .filter(f=>f.status!=='DISMISSED'&&f.suggestedTreatmentTitle)
    .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const used=new Set(),matched=[];
  for(const card of cards){
    const finding=candidates.find(f=>!used.has(f.id)&&normalize(f.title)===card.title&&(!card.command||normalize(f.suggestedTreatmentCommand)===card.command));
    if(finding){used.add(finding.id);matched.push(finding);}
  }
  return matched;
}

function protocolTitleFor(findings){
  const state=store.getState();
  const inv=state.investigations.find(i=>i.id===findings[0]?.investigationId);
  return inv?.protocolSnapshot?.name||findings[0]?.suggestedTreatmentTitle||'Tratamento terapêutico';
}

function capturePending(){
  const findings=findingsFromVisibleHandoff();
  if(!findings.length)return;
  pending={
    findingIds:findings.map(f=>f.id),
    title:protocolTitleFor(findings),
    components:findings.map(f=>({
      name:f.suggestedTreatmentTitle||f.title||'Componente terapêutico',
      instructions:f.suggestedTreatmentCommand||''
    }))
  };
}

function fillTreatmentForm(){
  if(!pending||filling)return;
  const form=document.querySelector('#treatment-form');
  const add=form?.querySelector('[data-add-treatment-component-draft]');
  if(!form||!add||!form.dataset.multiComponentEnhanced)return;
  filling=true;
  try{
    while(form.querySelectorAll('[data-treatment-component-draft]').length<pending.components.length)add.click();
    const title=form.querySelector('[name="title"]');
    if(title&&!title.value)title.value=pending.title;
    const names=[...form.querySelectorAll('[name="componentName"]')];
    const instructions=[...form.querySelectorAll('[name="instructions"]')];
    pending.components.forEach((component,index)=>{
      if(names[index]&&!names[index].value)names[index].value=component.name;
      if(instructions[index]&&!instructions[index].value)instructions[index].value=component.instructions;
    });
    form.dataset.findings=pending.findingIds.join(',');
    form.dataset.thematicPrefill='true';
    const marker=document.createElement('div');
    marker.className='notice thematic-prefill-notice';
    marker.innerHTML='<strong>Sugestões do protocolo aplicadas</strong><span>Revise nomes, comandos, gráficos e duração antes de salvar.</span>';
    if(!form.querySelector('.thematic-prefill-notice'))form.prepend(marker);
    pending=null;
  }finally{filling=false;}
}

window.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-root-handoff-treatment]');
  if(!button)return;
  capturePending();
  queueMicrotask(fillTreatmentForm);
  requestAnimationFrame(fillTreatmentForm);
},true);

new MutationObserver(()=>queueMicrotask(fillTreatmentForm)).observe(document.body,{childList:true,subtree:true});

window.addEventListener('submit',(event)=>{
  if(event.target?.id==='treatment-form'&&event.target.dataset.thematicPrefill==='true')pending=null;
},true);
