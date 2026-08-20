import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

const store=createStore();
let enhancing=false;
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function recentTitles(assistedId){
  const seen=new Set();const list=[];
  (store.getState().treatments||[]).filter((t)=>t.assistedEntityId===assistedId).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).forEach((t)=>{
    const title=String(t.title||'').trim();const key=title.toLocaleLowerCase('pt-BR');if(title&&!seen.has(key)){seen.add(key);list.push(title);}
  });
  return list.slice(0,5);
}
function enhanceTreatmentTitle(){
  const form=document.querySelector('#treatment-form');if(!form||form.querySelector('[data-recent-treatment-titles]'))return;
  const input=form.querySelector('input[name="title"]');if(!input)return;
  const session=getOpenSession(store.getState());const id=session?.currentAssistedEntityId;if(!id)return;
  const titles=recentTitles(id);if(!titles.length)return;
  const wrap=document.createElement('div');wrap.dataset.recentTreatmentTitles='true';wrap.className='recent-choice-wrap';
  wrap.innerHTML=`<span class="muted">Usados antes com este assistido</span><div class="recent-choice-chips">${titles.map((title)=>`<button type="button" class="recent-choice-chip" data-recent-treatment-title="${esc(title)}">${esc(title)}</button>`).join('')}</div>`;
  input.closest('.field')?.after(wrap);
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceTreatmentTitle();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{const b=event.target.closest('[data-recent-treatment-title]');if(!b)return;const form=b.closest('#treatment-form');const input=form?.querySelector('input[name="title"]');if(input){input.value=b.dataset.recentTreatmentTitle;input.dispatchEvent(new Event('input',{bubbles:true}));}},true);
