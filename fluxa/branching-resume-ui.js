import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

const store=createStore();

document.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-action="resume-latest-investigation"]');
  if(!button)return;
  const state=store.getState();
  const session=getOpenSession(state);
  if(!session?.currentAssistedEntityId)return;
  const active=state.investigations
    .filter((item)=>item.assistedEntityId===session.currentAssistedEntityId&&item.status==='IN_PROGRESS')
    .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0];
  if(!active||active.kind!=='BRANCHING')return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const investigate=document.querySelector('[data-action="investigate"]');
  if(!investigate)return;
  investigate.click();
  queueMicrotask(()=>{
    const protocolButton=document.querySelector(`[data-start-branching="${active.protocolId}"]`);
    if(protocolButton)protocolButton.click();
  });
},true);
