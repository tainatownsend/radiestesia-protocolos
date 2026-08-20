const PREFIX='fluxa.formDraft.';
const EXCLUDED=new Set(['quick-note-form','general-assessment-form']);
let enhancing=false;

function eligible(form){
  if(!(form instanceof HTMLFormElement)||!form.id||EXCLUDED.has(form.id))return false;
  if(form.dataset.noDraft!==undefined)return false;
  return Boolean(form.querySelector('input:not([type="hidden"]), textarea, select'));
}
function key(form){
  const context=[form.id,form.dataset.treatment,form.dataset.assisted,form.dataset.toolId,form.dataset.protocolId].filter(Boolean).join(':');
  return PREFIX+context;
}
function serialize(form){
  const values={};
  form.querySelectorAll('input[name],textarea[name],select[name]').forEach((field)=>{
    if(field.type==='file'||field.type==='password'||field.disabled)return;
    if(field.type==='checkbox'||field.type==='radio'){
      if(!values[field.name])values[field.name]=[];
      if(field.checked)values[field.name].push(field.value||'on');
      return;
    }
    values[field.name]=field.value;
  });
  return {savedAt:new Date().toISOString(),values};
}
function save(form){
  if(!eligible(form))return;
  try{sessionStorage.setItem(key(form),JSON.stringify(serialize(form)));}catch(_){}
}
function restore(form){
  if(!eligible(form)||form.dataset.draftRestored)return;
  form.dataset.draftRestored='true';
  let draft=null;try{draft=JSON.parse(sessionStorage.getItem(key(form))||'null');}catch(_){}
  if(!draft?.values)return;
  let restored=false;
  form.querySelectorAll('input[name],textarea[name],select[name]').forEach((field)=>{
    if(field.type==='file'||field.type==='password'||field.disabled)return;
    const saved=draft.values[field.name];if(saved===undefined)return;
    if(field.type==='checkbox'||field.type==='radio')field.checked=Array.isArray(saved)&&saved.includes(field.value||'on');
    else field.value=String(saved);
    field.dispatchEvent(new Event('change',{bubbles:true}));restored=true;
  });
  if(restored){
    const note=document.createElement('div');note.className='notice draft-restored-notice';note.dataset.draftRestoredNotice='true';note.textContent='Rascunho restaurado neste dispositivo.';
    form.prepend(note);
  }
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('form').forEach(restore);}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

let timer=null;
function schedule(field){const form=field.closest?.('form');if(!eligible(form))return;clearTimeout(timer);timer=setTimeout(()=>save(form),180);}
document.addEventListener('input',(event)=>schedule(event.target),true);
document.addEventListener('change',(event)=>schedule(event.target),true);

document.addEventListener('submit',(event)=>{
  const form=event.target;if(!eligible(form))return;
  const draftKey=key(form);
  // Feature-specific submit handlers run after this listener. Clear only if the form
  // actually leaves the DOM, which indicates the workflow accepted the submission.
  setTimeout(()=>{if(!form.isConnected){try{sessionStorage.removeItem(draftKey);}catch(_){}}else save(form);},0);
},true);
