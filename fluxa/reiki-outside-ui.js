import { createStore } from './store.js';
import { ReikiMode, ReikiModeLabel, startFlexibleReiki, pauseFlexibleReiki, resumeFlexibleReiki, completeFlexibleReiki, reikiElapsedSecondsFlexible } from './reiki-flex.js';

const store = createStore();
let timerHandle = null;

function esc(value = '') { return String(value).replace(/[&<>'\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c])); }
function formatClock(seconds) { const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60; return h ? [h,m,s].map(v=>String(v).padStart(2,'0')).join(':') : [m,s].map(v=>String(v).padStart(2,'0')).join(':'); }
function options() { return Object.entries(ReikiModeLabel).map(([key,label]) => `<option value="${key}">${label}</option>`).join(''); }
function close() { if (timerHandle) clearInterval(timerHandle); timerHandle=null; document.querySelector('#reiki-outside-overlay')?.remove(); }
function dialog(html) { close(); const wrap=document.createElement('div'); wrap.id='reiki-outside-overlay'; wrap.className='modal-backdrop'; wrap.innerHTML=html; document.body.appendChild(wrap); }
function active() { return store.getState().reikiApplications.find((item) => !item.sessionId && ['RUNNING','PAUSED'].includes(item.status)) || null; }
function reikiConfigured(state=store.getState()) { return Array.isArray(state?.settings?.therapeuticModalities?.enabled) && state.settings.therapeuticModalities.enabled.includes('REIKI'); }
function syncLegacyRetrospectiveAction() {
  const button=document.querySelector('[data-action="reiki-retro"]');
  const section=button?.closest('.section');
  if(section) section.toggleAttribute('hidden',!reikiConfigured());
}

function ensureAction() {
  syncLegacyRetrospectiveAction();
  const main=document.querySelector('main');
  if (!main || main.querySelector('.eyebrow')?.textContent?.trim() !== 'Hoje') return;
  if (store.getState().sessions.some((item) => item.status === 'OPEN')) { main.querySelector('[data-reiki-outside]')?.remove(); return; }
  const current=active();
  if (!current && !reikiConfigured()) { main.querySelector('[data-reiki-outside]')?.remove(); return; }
  if (main.querySelector('[data-reiki-outside]')) return;
  const section=document.createElement('section'); section.className='section card soft'; section.dataset.reikiOutside='true';
  section.innerHTML=`<p class="eyebrow">Reiki</p><h2>${current ? 'Aplicação em andamento' : 'Aplicação sem sessão'}</h2><p class="muted">Este fluxo não registra medição radiestésica.</p><button class="btn ${current?'secondary':'primary'} wide" data-reiki-outside-open>${current?'Abrir aplicação':'Iniciar Reiki'}</button>`;
  const first=main.querySelector('.section'); if(first) first.after(section); else main.appendChild(section);
}

function startDialog() {
  if(!reikiConfigured()) return;
  const items=store.getState().assistedEntities.filter(i=>!i.archivedAt).sort((a,b)=>a.displayName.localeCompare(b.displayName,'pt-BR'));
  dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Reiki</p><h2>Nova aplicação</h2></div><button class="close-btn" data-reiki-outside-close>×</button></div><form id="reiki-outside-start" class="form-grid"><div class="field"><label>Assistido</label><select name="assistedEntityId" required><option value="">Selecione</option>${items.map(i=>`<option value="${i.id}">${esc(i.displayName)}</option>`).join('')}</select></div><div class="field"><label>Modo</label><select name="mode">${options()}</select></div><button class="btn primary wide" type="submit">Iniciar aplicação</button></form></section>`);
}

function timerDialog(id) {
  const state=store.getState(),app=state.reikiApplications.find(i=>i.id===id); if(!app)return;
  const assisted=state.assistedEntities.find(i=>i.id===app.assistedEntityId);
  dialog(`<section class="sheet timer-sheet"><div class="sheet-head"><div><p class="eyebrow">Reiki · ${esc(ReikiModeLabel[app.mode]||'Aplicação')}</p><h2>${esc(assisted?.displayName||'')}</h2></div><button class="close-btn" data-reiki-outside-close>×</button></div><div class="timer-value timer-large" data-reiki-outside-timer>${formatClock(reikiElapsedSecondsFlexible(app))}</div><p class="muted">${app.status==='PAUSED'?'Pausado':'Em andamento'} · fora de sessão.</p><div class="button-row">${app.status==='RUNNING'?`<button class="btn secondary" data-reiki-outside-pause="${id}">Pausar</button>`:`<button class="btn secondary" data-reiki-outside-resume="${id}">Retomar</button>`}<button class="btn primary" data-reiki-outside-finish="${id}">Concluir</button></div></section>`);
  timerHandle=setInterval(()=>{ const current=store.getState().reikiApplications.find(i=>i.id===id),target=document.querySelector('[data-reiki-outside-timer]'); if(current&&target) target.textContent=formatClock(reikiElapsedSecondsFlexible(current)); },1000);
}

function finishDialog(id) { dialog(`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Concluir Reiki</p><h2>Finalizar aplicação</h2></div><button class="close-btn" data-reiki-outside-close>×</button></div><form id="reiki-outside-finish" data-reiki="${id}" class="form-grid"><div class="field"><label>Observações</label><textarea name="notes"></textarea></div><button class="btn primary wide" type="submit">Concluir aplicação</button></form></section>`); }

new MutationObserver(ensureAction).observe(document.body,{childList:true,subtree:true}); queueMicrotask(ensureAction); store.subscribe(()=>queueMicrotask(ensureAction));
document.addEventListener('click',(event)=>{ const b=event.target.closest('button'); if(!b)return; if(b.dataset.action==='reiki-retro'&&!reikiConfigured()){event.preventDefault();event.stopImmediatePropagation();return;} if(b.dataset.reikiOutsideOpen!==undefined){ const current=active(); if(!current&&!reikiConfigured()){event.preventDefault();event.stopImmediatePropagation();return;} current?timerDialog(current.id):startDialog(); } else if(b.dataset.reikiOutsideClose!==undefined) close(); else if(b.dataset.reikiOutsidePause){ pauseFlexibleReiki(store,b.dataset.reikiOutsidePause); timerDialog(b.dataset.reikiOutsidePause); } else if(b.dataset.reikiOutsideResume){ try{resumeFlexibleReiki(store,b.dataset.reikiOutsideResume);timerDialog(b.dataset.reikiOutsideResume);}catch(e){alert(e.message);} } else if(b.dataset.reikiOutsideFinish) finishDialog(b.dataset.reikiOutsideFinish); },true);
document.addEventListener('submit',(event)=>{ const form=event.target; if(form.id==='reiki-retro-form'&&!reikiConfigured()){event.preventDefault();event.stopImmediatePropagation();document.querySelector('[data-action="dismiss-sheet"]')?.click();return;} if(form.id==='reiki-outside-start'){event.preventDefault();if(!reikiConfigured())return;const d=new FormData(form);try{const app=startFlexibleReiki(store,{assistedEntityId:d.get('assistedEntityId'),mode:d.get('mode')||ReikiMode.OTHER});timerDialog(app.id);}catch(e){alert(e.message);}} else if(form.id==='reiki-outside-finish'){event.preventDefault();const d=new FormData(form);try{completeFlexibleReiki(store,form.dataset.reiki,d.get('notes'));close();}catch(e){alert(e.message);}} },true);
