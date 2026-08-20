import { createStore } from './store.js';

const store=createStore();
let pending=null;

const options=[
  ['FACTOR_RELEVANT','Fator relevante'],
  ['CAUSE','Causa'],
  ['MAINTAINER','Mantenedor'],
  ['CONSEQUENCE','Consequência'],
  ['ASSOCIATION','Associação'],
  ['DEEPEN','Item a aprofundar']
];

function selector(sourceId, disabled=false){
  return `<select data-finding-classification-for="${sourceId}" ${disabled?'disabled':''}>${options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select>`;
}

function enhanceForm(form){
  if(!form||form.dataset.perFindingClassification==='true')return;
  const rows=[...form.querySelectorAll('.check-row')].filter(row=>row.querySelector('input[name="finding"]'));
  if(!rows.length)return;
  form.dataset.perFindingClassification='true';

  form.querySelector('[data-finding-classification]')?.remove();
  const globalSelect=form.querySelector('select[name="classification"]');
  globalSelect?.closest('.field')?.remove();

  rows.forEach(row=>{
    const checkbox=row.querySelector('input[name="finding"]');
    if(!checkbox||row.querySelector('[data-finding-classification-for]'))return;
    const wrap=document.createElement('span');
    wrap.className='field finding-classification-inline';
    wrap.innerHTML=`<span class="muted">Classificação</span>${selector(checkbox.value,checkbox.disabled)}`;
    row.appendChild(wrap);
  });

  const submit=form.querySelector('button[type="submit"]');
  if(submit&&!form.querySelector('[data-classification-help]')){
    const help=document.createElement('small');
    help.className='muted';
    help.dataset.classificationHelp='true';
    help.textContent='Classifique cada achado confirmado individualmente.';
    submit.before(help);
  }
}

function enhance(){
  enhanceForm(document.querySelector('#findings-form'));
  enhanceForm(document.querySelector('#branch-findings-form'));
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(!['findings-form','branch-findings-form'].includes(form.id))return;
  const classifications={};
  form.querySelectorAll('input[name="finding"]:checked:not(:disabled)').forEach(input=>{
    const select=form.querySelector(`[data-finding-classification-for="${CSS.escape(input.value)}"]`);
    classifications[input.value]=select?.value||'FACTOR_RELEVANT';
  });
  pending={
    investigationId:form.dataset.investigation,
    classifications,
    before:new Set(store.getState().findings.map(i=>i.id))
  };
  queueMicrotask(()=>{
    if(!pending)return;
    const p=pending;pending=null;
    store.setState((state)=>{
      const draft=structuredClone(state);
      const created=draft.findings.filter(i=>i.investigationId===p.investigationId&&!p.before.has(i.id));
      if(!created.length)return draft;
      for(const finding of created){
        const classification=p.classifications[finding.sourceQuestionId]||'FACTOR_RELEVANT';
        finding.classification=classification;
        for(const event of draft.events.filter(e=>e.entityId===finding.id&&e.eventType==='FINDING_IDENTIFIED')){
          event.metadata={...(event.metadata||{}),classification};
        }
      }
      return draft;
    });
  });
},true);
