import { createStore } from './store.js';
import { ReikiMode, ReikiModeLabel } from './reiki-flex.js';

const store=createStore();
let sessionMode=sessionStorage.getItem('fluxa.reiki.mode') || ReikiMode.DISTANCE;
let pendingStart=null;
let pendingRetro=null;

function options(selected){return Object.entries(ReikiModeLabel).map(([key,label])=>`<option value="${key}" ${key===selected?'selected':''}>${label}</option>`).join('');}
function setMode(applicationId,mode){
  if(!Object.values(ReikiMode).includes(mode))return;
  store.setState((state)=>{
    const draft=structuredClone(state);
    const app=draft.reikiApplications.find(i=>i.id===applicationId); if(!app)return draft;
    app.mode=mode; app.updatedAt=store.nowIso();
    [...draft.events].reverse().filter(e=>e.entityId===applicationId&&String(e.eventType).startsWith('REIKI_')).forEach(e=>{e.metadata={...(e.metadata||{}),mode};});
    return draft;
  });
}

function enhanceSessionMode(){
  const grid=document.querySelector('.action-grid');
  if(!grid||grid.parentElement?.querySelector('[data-session-reiki-mode]'))return;
  const reiki=grid.querySelector('[data-action="reiki"]'); if(!reiki)return;
  const field=document.createElement('div'); field.className='field'; field.dataset.sessionReikiMode='true';
  field.innerHTML=`<label>Modo do Reiki</label><select data-session-reiki-mode-select>${options(sessionMode)}</select>`;
  grid.before(field);
}
function enhanceRetroMode(){
  const form=document.querySelector('#reiki-retro-form'); if(!form||form.querySelector('[data-retro-reiki-mode]'))return;
  const field=document.createElement('div'); field.className='field'; field.dataset.retroReikiMode='true';
  field.innerHTML=`<label>Modo da aplicação</label><select name="reikiMode">${options(ReikiMode.DISTANCE)}</select>`;
  form.querySelector('.field')?.after(field);
}
function enhance(){enhanceSessionMode();enhanceRetroMode();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('change',(event)=>{if(event.target.matches('[data-session-reiki-mode-select]')){sessionMode=event.target.value;sessionStorage.setItem('fluxa.reiki.mode',sessionMode);}},true);

document.addEventListener('click',(event)=>{
  if(!event.target.closest('[data-action="reiki"]'))return;
  pendingStart={mode:sessionMode,before:new Set(store.getState().reikiApplications.map(i=>i.id))};
  queueMicrotask(()=>{
    if(!pendingStart)return;const p=pendingStart;pendingStart=null;
    const app=store.getState().reikiApplications.filter(i=>!p.before.has(i.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if(app)setMode(app.id,p.mode);
  });
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;if(form.id!=='reiki-retro-form')return;
  const data=new FormData(form);pendingRetro={mode:data.get('reikiMode')||ReikiMode.OTHER,before:new Set(store.getState().reikiApplications.map(i=>i.id))};
  queueMicrotask(()=>{
    if(!pendingRetro)return;const p=pendingRetro;pendingRetro=null;
    const app=store.getState().reikiApplications.filter(i=>!p.before.has(i.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if(app)setMode(app.id,p.mode);
  });
},true);
