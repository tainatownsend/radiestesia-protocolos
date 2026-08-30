const STYLE_ID='fluxa-app-audit-fix';
function ensureStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const link=document.createElement('link');
  link.id=STYLE_ID;link.rel='stylesheet';link.href='app-audit-fix.css';
  document.head.appendChild(link);
}
ensureStyle();

const memory=new Map();
let activeKey=null;
function hawkinsKey(input){
  const form=input.closest('[data-hawkins-baseline-form]');
  if(form) return `baseline:${form.dataset.session||''}:${form.dataset.assisted||''}`;
  if(input.matches('[data-prep-frequency]')) return 'therapist-preparation';
  if(input.name==='frequency') return `final:${input.closest('form')?.dataset?.treatment||''}`;
  return null;
}
function remember(input){
  const key=hawkinsKey(input);if(!key)return;
  memory.set(key,input.value);activeKey=key;
}
function restore(){
  const inputs=document.querySelectorAll('.hawkins-input input,[data-prep-frequency],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]');
  for(const input of inputs){
    const key=hawkinsKey(input);if(!key)continue;
    if((input.value===''||input.value==null)&&memory.has(key)) input.value=memory.get(key);
    if(key===activeKey&&document.activeElement!==input){
      requestAnimationFrame(()=>{try{input.focus({preventScroll:true});const n=String(input.value||'').length;input.setSelectionRange?.(n,n);}catch(_){}});
    }
  }
}
document.addEventListener('input',(event)=>{const input=event.target;if(input.matches?.('.hawkins-input input,[data-prep-frequency],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]')) remember(input);},true);
document.addEventListener('focusin',(event)=>{const input=event.target;if(input.matches?.('.hawkins-input input,[data-prep-frequency],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]')) activeKey=hawkinsKey(input);},true);
document.addEventListener('focusout',(event)=>{const input=event.target;if(input.matches?.('.hawkins-input input,[data-prep-frequency],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]')) setTimeout(()=>{if(!document.activeElement?.matches?.('.hawkins-input input,[data-prep-frequency],#final-assessment-form [name="frequency"],#final-cycle-form [name="frequency"]')) activeKey=null;},0);},true);
new MutationObserver(()=>queueMicrotask(restore)).observe(document.body,{childList:true,subtree:true});
queueMicrotask(restore);
