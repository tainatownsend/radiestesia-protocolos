import { createStore } from './store.js';
import { getOpenSession } from './domain.js';

const store=createStore();
const PREFIX='fluxa.formDraft.';
const MAX_AGE_MS=24*60*60*1000;
const EXCLUDED=new Set(['quick-note-form','general-assessment-form']);
let enhancing=false;
const timers=new WeakMap();

function eligible(form){
  if(!(form instanceof HTMLFormElement)||!form.id||EXCLUDED.has(form.id))return false;
  if(form.dataset.noDraft!==undefined)return false;
  return Boolean(form.querySelector('input:not([type="hidden"]), textarea, select'));
}
function assistedContext(form){
  const explicit=form.dataset.assisted||form.querySelector('[name="assistedEntityId"]')?.value||'';
  if(explicit)return explicit;
  return getOpenSession(store.getState())?.currentAssistedEntityId||'';
}
function key(form){
  const context=[
    form.id,
    assistedContext(form),
    form.dataset.treatment,
    form.dataset.toolId,
    form.dataset.protocolId,
    form.dataset.template,
    form.dataset.findings
  ].filter(Boolean).join(':');
  return PREFIX+context;
}
function fields(form){
  return [...form.querySelectorAll('input[name],textarea[name],select[name]')]
    .filter((field)=>field.type!=='file'&&field.type!=='password'&&!field.disabled);
}
function serialize(form){
  const counts=new Map();
  const entries=fields(form).map((field)=>{
    const index=counts.get(field.name)||0;counts.set(field.name,index+1);
    return {
      name:field.name,index,type:field.type||field.tagName.toLowerCase(),
      value:field.value,checked:Boolean(field.checked)
    };
  });
  return {version:2,savedAt:new Date().toISOString(),entries};
}
function removeKey(draftKey){try{sessionStorage.removeItem(draftKey);}catch(_){} }
function save(form){
  if(!eligible(form))return;
  const draftKey=key(form);form.dataset.activeDraftKey=draftKey;
  try{sessionStorage.setItem(draftKey,JSON.stringify(serialize(form)));}catch(_){}
}
function parseDraft(draftKey){
  let draft=null;try{draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');}catch(_){}
  if(!draft)return null;
  const savedAt=new Date(draft.savedAt||0).getTime();
  if(!Number.isFinite(savedAt)||Date.now()-savedAt>MAX_AGE_MS){removeKey(draftKey);return null;}
  return draft;
}
function restoreV2(form,draft){
  const grouped=new Map();
  fields(form).forEach((field)=>{const list=grouped.get(field.name)||[];list.push(field);grouped.set(field.name,list);});
  let restored=false;
  for(const entry of draft.entries||[]){
    const field=grouped.get(entry.name)?.[entry.index];if(!field)continue;
    if(field.type==='checkbox'||field.type==='radio')field.checked=Boolean(entry.checked);
    else field.value=String(entry.value??'');
    field.dispatchEvent(new Event('change',{bubbles:true}));restored=true;
  }
  return restored;
}
function restoreLegacy(form,draft){
  if(!draft?.values)return false;
  let restored=false;
  fields(form).forEach((field)=>{
    const saved=draft.values[field.name];if(saved===undefined)return;
    if(field.type==='checkbox'||field.type==='radio')field.checked=Array.isArray(saved)&&saved.includes(field.value||'on');
    else field.value=String(saved);
    field.dispatchEvent(new Event('change',{bubbles:true}));restored=true;
  });
  return restored;
}
function addNotice(form,draftKey){
  form.querySelector('[data-draft-restored-notice]')?.remove();
  const note=document.createElement('div');note.className='notice draft-restored-notice';note.dataset.draftRestoredNotice='true';
  note.innerHTML='<span>Rascunho restaurado neste dispositivo.</span><button type="button" class="btn ghost small" data-discard-form-draft>Descartar</button>';
  note.dataset.draftKey=draftKey;form.prepend(note);
}
function restore(form,{force=false}={}){
  if(!eligible(form))return;
  const draftKey=key(form);
  if(!force&&form.dataset.draftRestored===draftKey)return;
  form.dataset.draftRestored=draftKey;form.dataset.activeDraftKey=draftKey;
  const draft=parseDraft(draftKey);if(!draft)return;
  const restored=draft.version===2?restoreV2(form,draft):restoreLegacy(form,draft);
  if(restored)addNotice(form,draftKey);
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('form').forEach((form)=>restore(form));}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

function schedule(field){
  const form=field.closest?.('form');if(!eligible(form))return;
  const prior=timers.get(form);if(prior)clearTimeout(prior);
  timers.set(form,setTimeout(()=>{save(form);timers.delete(form);},180));
}
document.addEventListener('input',(event)=>schedule(event.target),true);
document.addEventListener('change',(event)=>{
  const form=event.target.closest?.('form');
  if(form&&event.target.matches?.('[name="assistedEntityId"]')){
    const previous=form.dataset.activeDraftKey;
    if(previous&&previous!==key(form))removeKey(previous);
    form.dataset.draftRestored='';
    queueMicrotask(()=>restore(form,{force:true}));
  }
  schedule(event.target);
},true);

document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-discard-form-draft]');if(!button)return;
  event.preventDefault();
  const notice=button.closest('[data-draft-restored-notice]');
  const form=button.closest('form');
  const draftKey=notice?.dataset.draftKey||form?.dataset.activeDraftKey;
  if(draftKey)removeKey(draftKey);
  notice?.remove();
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;if(!eligible(form))return;
  const draftKey=key(form);
  setTimeout(()=>{if(!form.isConnected)removeKey(draftKey);else save(form);},0);
},true);
