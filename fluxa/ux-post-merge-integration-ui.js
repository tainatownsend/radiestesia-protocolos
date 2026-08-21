import { createStore } from './store.js';

const store=createStore();
const root=document.querySelector('#app');
let handoffFindingIds=[];
let maskedDismissButton=null;
let enhancing=false;

function selectedFindingContext(form){
  const investigationId=form?.dataset?.investigation;
  if(!investigationId)return null;
  return { investigationId, before:new Set((store.getState().findings||[]).map((f)=>f.id)) };
}
function rememberCreatedFindings(context){
  if(!context)return;
  const created=(store.getState().findings||[]).filter((f)=>f.investigationId===context.investigationId&&!context.before.has(f.id));
  if(created.length)handoffFindingIds=[...new Set(created.map((f)=>f.id))];
}
function clearHandoff(){handoffFindingIds=[];}

/*
 * The guided quick-investigation handoff dismisses the base sheet by clicking its
 * native dismiss button. Mask the action only while document-capture enhancers run,
 * then restore it before the app's root handler sees the click. This prevents the
 * UX handoff layer from mistaking its own internal dismissal for user cancellation.
 */
window.addEventListener('click',(event)=>{
  const button=event.target.closest?.('button');
  if(!button)return;
  if(button.dataset.action==='dismiss-sheet'&&document.querySelector('#findings-form')){
    maskedDismissButton=button;
    button.dataset.action='ux-internal-dismiss-sheet';
  }
},true);
root?.addEventListener('click',(event)=>{
  const button=event.target.closest?.('button');
  if(button&&button===maskedDismissButton&&button.dataset.action==='ux-internal-dismiss-sheet'){
    button.dataset.action='dismiss-sheet';
    maskedDismissButton=null;
  }
},true);

/* Keep an independent copy of newly confirmed findings so a failed treatment submit
 * never loses Finding → Treatment traceability on the next attempt. */
window.addEventListener('submit',(event)=>{
  const form=event.target;
  if(['findings-form','branch-findings-form'].includes(form?.id)){
    const context=selectedFindingContext(form);
    queueMicrotask(()=>rememberCreatedFindings(context));
    return;
  }
  if(form?.id==='treatment-form'&&handoffFindingIds.length){
    const before=new Set((store.getState().treatments||[]).map((t)=>t.id));
    const ids=[...handoffFindingIds];
    queueMicrotask(()=>{
      const created=(store.getState().treatments||[])
        .filter((t)=>!before.has(t.id))
        .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
      if(!created)return; // validation/persistence failed: preserve handoff for retry
      store.setState((state)=>{
        const draft=structuredClone(state);
        const target=draft.treatments.find((t)=>t.id===created.id);
        if(target)target.findingIds=[...new Set([...(target.findingIds||[]),...ids])];
        return draft;
      });
      handoffFindingIds=handoffFindingIds.filter((id)=>!ids.includes(id));
    });
  }
},true);

/* The session investigation stack carries the exact investigation ID. Route it
 * through the existing continuity-resume boundary rather than "latest" lookup. */
window.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-ux-resume-specific]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const id=button.dataset.uxResumeSpecific;if(!id)return;
  const proxy=document.createElement('button');
  proxy.hidden=true;proxy.dataset.continuityInvestigation=id;
  document.body.appendChild(proxy);proxy.click();proxy.remove();
},true);

/* When there is no pending work, do not imply that investigation is the required
 * next therapeutic step. Keep the therapist in control and reveal the existing options. */
function neutralizeDefaultNextAction(){
  const section=document.querySelector('[data-ux-next-action]');if(!section)return;
  const heading=section.querySelector('h2');
  const button=section.querySelector('[data-ux-open-investigation]');
  if(!button||heading?.textContent?.trim()!=='Escolha o próximo passo')return;
  delete button.dataset.uxOpenInvestigation;
  button.dataset.uxShowOptions='true';
  button.textContent='Ver opções';
  const detail=section.querySelector('p:not(.eyebrow)');
  if(detail)detail.textContent='Nenhuma pendência exige sua atenção agora. Escolha a atividade adequada para este momento.';
}
function enhance(){if(enhancing)return;enhancing=true;try{neutralizeDefaultNextAction();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

window.addEventListener('click',(event)=>{
  const button=event.target.closest?.('button');if(!button)return;
  if(button.dataset.uxShowOptions!==undefined){
    event.preventDefault();event.stopImmediatePropagation();
    const title=[...document.querySelectorAll('main h2')].find((node)=>node.textContent?.trim()==='Novo trabalho');
    title?.closest('.section')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  if(button.dataset.uxFindingsBack!==undefined||button.dataset.uxFindingsInvestigate!==undefined){clearHandoff();return;}
  if(button.dataset.route&&handoffFindingIds.length){clearHandoff();return;}
  if(button.dataset.action==='dismiss-sheet'&&handoffFindingIds.length&&!document.querySelector('#findings-form'))clearHandoff();
},true);
