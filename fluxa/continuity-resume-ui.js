import { createStore } from './store.js';
import { getOpenSession, latestPreparation, resumeInvestigation, selectAssistedForSession } from './domain.js';
import { resumeBranchingInvestigation } from './protocol-engine.js';

const store=createStore();
const KEY='fluxa.pendingInvestigationResume';
let processing=false;

function readPending(){try{return sessionStorage.getItem(KEY);}catch(_){return null;}}
function savePending(id){try{sessionStorage.setItem(KEY,id);}catch(_){} }
function clearPending(){try{sessionStorage.removeItem(KEY);}catch(_){} }
function preparedSession(state=store.getState()){
  const session=getOpenSession(state);if(!session)return null;
  return latestPreparation(state,session.id)?.status==='COMPLETED'?session:null;
}
function clickAfterRender(selector,attempt=0){
  const node=document.querySelector(selector);if(node){node.click();return true;}
  if(attempt<5)requestAnimationFrame(()=>clickAfterRender(selector,attempt+1));
  return false;
}
function openExactInvestigation(inv,session){
  selectAssistedForSession(store,session.id,inv.assistedEntityId);
  if(inv.kind==='BRANCHING'){
    resumeBranchingInvestigation(store,inv.id,session.id);
    document.querySelector('[data-route="today"]')?.click();
    requestAnimationFrame(()=>{
      document.querySelector('[data-action="investigate"]')?.click();
      requestAnimationFrame(()=>clickAfterRender(`[data-start-branching="${CSS.escape(inv.protocolId)}"]`));
    });
    return;
  }
  if(inv.kind==='CUSTOM_BRANCHING'){
    document.querySelector('[data-route="library"]')?.click();
    requestAnimationFrame(()=>clickAfterRender(`[data-start-custom-protocol="${CSS.escape(inv.protocolId)}"]`));
    return;
  }
  resumeInvestigation(store,inv.id,session.id);
  document.querySelector('[data-route="today"]')?.click();
  requestAnimationFrame(()=>{
    document.querySelector('[data-action="resume-latest-investigation"]')?.click();
  });
}
function attemptResume(){
  if(processing)return;
  const id=readPending();if(!id)return;
  const state=store.getState();const inv=(state.investigations||[]).find((item)=>item.id===id);
  if(!inv||inv.status!=='IN_PROGRESS'){clearPending();return;}
  const session=preparedSession(state);if(!session)return;
  processing=true;clearPending();
  try{openExactInvestigation(inv,session);}catch(error){alert(error.message);}finally{setTimeout(()=>{processing=false;},0);}
}

store.subscribe(()=>queueMicrotask(attemptResume));
queueMicrotask(attemptResume);

document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-continuity-investigation]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const id=button.dataset.continuityInvestigation;const state=store.getState();
  const inv=(state.investigations||[]).find((item)=>item.id===id&&item.status==='IN_PROGRESS');
  if(!inv)return;
  savePending(id);
  const session=getOpenSession(state);
  if(!session){document.querySelector('[data-action="start-session"]')?.click();return;}
  if(latestPreparation(state,session.id)?.status!=='COMPLETED'){
    document.querySelector('[data-action="open-preparation"]')?.click();return;
  }
  attemptResume();
},true);
