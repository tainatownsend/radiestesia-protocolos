import { createStore } from './store.js';
import { ReikiMode, ReikiModeLabel } from './reiki-flex.js';

const store=createStore();
let pendingStartButton=null;
let bypassStart=false;
let pendingRetro=null;

function readMode(){try{return sessionStorage.getItem('fluxa.reiki.mode')||ReikiMode.DISTANCE;}catch(_){return ReikiMode.DISTANCE;}}
function saveMode(value){try{sessionStorage.setItem('fluxa.reiki.mode',value);}catch(_){}}
function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function options(selected){return Object.entries(ReikiModeLabel).map(([key,label])=>`<option value="${key}" ${key===selected?'selected':''}>${esc(label)}</option>`).join('');}
function activeTreatments(){
  const state=store.getState();const session=state.sessions.find((s)=>s.status==='OPEN');const assistedId=session?.currentAssistedEntityId;
  return (state.treatments||[]).filter((t)=>t.assistedEntityId===assistedId&&['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(t.status));
}
function closeStartDialog(){document.querySelector('#reiki-session-start-overlay')?.remove();pendingStartButton=null;}
function startDialog(button){
  closeStartDialog();pendingStartButton=button;
  const mode=readMode();const treatments=activeTreatments();
  const wrap=document.createElement('div');wrap.id='reiki-session-start-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Reiki</p><h2>Nova aplicação</h2></div><button class="close-btn" type="button" data-reiki-session-start-close>×</button></div><form id="reiki-session-start-form" class="form-grid"><div class="field"><label>Modo</label><select name="mode">${options(mode)}</select></div><div class="field"><label>Vincular a tratamento <span class="muted">(opcional)</span></label><select name="treatmentId"><option value="">Sem vínculo</option>${treatments.map((t)=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></div><button class="btn primary wide" type="submit">Iniciar aplicação</button></form></section>`;
  document.body.appendChild(wrap);
}
function setApplicationContext(applicationId,{mode,treatmentId=null}){
  if(!Object.values(ReikiMode).includes(mode))return;
  store.setState((state)=>{
    const draft=structuredClone(state);const app=draft.reikiApplications.find(i=>i.id===applicationId);if(!app)return draft;
    app.mode=mode;app.treatmentId=treatmentId||null;app.updatedAt=store.nowIso();
    [...draft.events].reverse().filter(e=>e.entityId===applicationId&&String(e.eventType).startsWith('REIKI_')).forEach(e=>{e.metadata={...(e.metadata||{}),mode,treatmentId:treatmentId||null};});
    return draft;
  });
}
function enhanceRetroMode(){
  const form=document.querySelector('#reiki-retro-form');if(!form||form.querySelector('[data-retro-reiki-mode]'))return;
  const field=document.createElement('div');field.className='field';field.dataset.retroReikiMode='true';
  field.innerHTML=`<label>Modo da aplicação</label><select name="reikiMode">${options(ReikiMode.DISTANCE)}</select>`;
  form.querySelector('.field')?.after(field);
}
function enhance(){enhanceRetroMode();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const close=event.target.closest('[data-reiki-session-start-close]');if(close){event.preventDefault();event.stopImmediatePropagation();closeStartDialog();return;}
  const reiki=event.target.closest('[data-action="reiki"]');if(!reiki)return;
  if(bypassStart){bypassStart=false;return;}
  event.preventDefault();event.stopImmediatePropagation();startDialog(reiki);
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(form.id==='reiki-session-start-form'){
    event.preventDefault();event.stopImmediatePropagation();
    const data=new FormData(form);const mode=data.get('mode')||ReikiMode.DISTANCE;const treatmentId=data.get('treatmentId')||null;
    saveMode(mode);const button=pendingStartButton;const before=new Set(store.getState().reikiApplications.map(i=>i.id));closeStartDialog();
    if(!button)return;bypassStart=true;button.click();
    queueMicrotask(()=>{const app=store.getState().reikiApplications.filter(i=>!before.has(i.id)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];if(app)setApplicationContext(app.id,{mode,treatmentId});});
    return;
  }
  if(form.id!=='reiki-retro-form')return;
  const data=new FormData(form);pendingRetro={mode:data.get('reikiMode')||ReikiMode.OTHER,before:new Set(store.getState().reikiApplications.map(i=>i.id))};
  queueMicrotask(()=>{if(!pendingRetro)return;const p=pendingRetro;pendingRetro=null;const app=store.getState().reikiApplications.filter(i=>!p.before.has(i.id)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];if(app)setApplicationContext(app.id,{mode:p.mode,treatmentId:app.treatmentId||null});});
},true);
