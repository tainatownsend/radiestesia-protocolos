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

function enhance(){
  const form=document.querySelector('#findings-form');
  if(!form||form.querySelector('[data-finding-classification]'))return;
  const submit=form.querySelector('button[type="submit"]');if(!submit)return;
  const field=document.createElement('div');field.className='field';field.dataset.findingClassification='true';
  field.innerHTML=`<label>Classificação dos novos achados</label><select name="classification">${options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><small class="muted">A classificação pode orientar o tratamento sem transformar automaticamente toda resposta positiva em causa.</small>`;
  submit.before(field);
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('submit',(event)=>{
  const form=event.target;if(form.id!=='findings-form')return;
  const data=new FormData(form);
  pending={investigationId:form.dataset.investigation,classification:data.get('classification')||'FACTOR_RELEVANT',before:new Set(store.getState().findings.map(i=>i.id))};
  queueMicrotask(()=>{
    if(!pending)return;const p=pending;pending=null;
    store.setState((state)=>{
      const draft=structuredClone(state);
      const created=draft.findings.filter(i=>i.investigationId===p.investigationId&&!p.before.has(i.id));
      if(!created.length)return draft;
      for(const finding of created){
        finding.classification=p.classification;
        for(const event of draft.events.filter(e=>e.entityId===finding.id&&e.eventType==='FINDING_IDENTIFIED')){
          event.metadata={...(event.metadata||{}),classification:p.classification};
        }
      }
      return draft;
    });
  });
},true);
