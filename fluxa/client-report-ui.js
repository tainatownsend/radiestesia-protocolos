import { createStore } from './store.js';
import { sessionHawkinsMeasurements, sessionTreatments } from './session-report-data.js';

const store=createStore();
let enhancing=false;
const status={PLANNED:'planejado',IN_PROGRESS:'em andamento',COMPLETED:'concluído',INTERRUPTED:'interrompido',STOPPED:'interrompido',REPLACED:'substituído',RUNNING:'em andamento',PAUSED:'pausado',CANCELED:'cancelado'};
const reikiMode={IN_PERSON:'presencial',PRESENTIAL:'presencial',DISTANCE:'à distância',SELF:'autoaplicação',SELF_APPLICATION:'autoaplicação',OTHER:'outro formato'};
function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function fmt(iso){const time=new Date(iso||'').getTime();return Number.isFinite(time)?new Intl.DateTimeFormat('pt-BR',{dateStyle:'long'}).format(new Date(time)):'—';}
function fmtShort(iso){const time=new Date(iso||'').getTime();return Number.isFinite(time)?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(time)):'—';}
function hawkinsValue(measurement){const value=measurement?.hertz??measurement?.frequency??measurement?.result;const n=Number(value);return Number.isFinite(n)?n:null;}
function treatmentTitle(treatment){return String(treatment?.title||'Tratamento').trim();}
function nextReview(state,treatmentId){const times=(state.treatmentComponents||[]).filter((c)=>c.treatmentId===treatmentId&&c.status==='IN_PROGRESS').map((c)=>new Date(c.expectedEndAt||'').getTime()).filter(Number.isFinite);return times.length?new Date(Math.min(...times)).toISOString():null;}
function shareText(state,sessionId,assistedId){
  const session=state.sessions.find((s)=>s.id===sessionId);const assisted=state.assistedEntities.find((a)=>a.id===assistedId);if(!session||!assisted)return null;
  const hawkins=sessionHawkinsMeasurements(state,sessionId,assistedId).slice().sort((a,b)=>new Date(a.occurredAt||a.createdAt||0)-new Date(b.occurredAt||b.createdAt||0));
  const baseline=hawkins.find((a)=>a.phase==='BASELINE')||hawkins[0]||null;
  const finals=hawkins.filter((a)=>a.phase==='FINAL');const final=finals[finals.length-1]||null;
  const initialHz=hawkinsValue(baseline),finalHz=hawkinsValue(final);
  const treatments=sessionTreatments(state,sessionId).filter((t)=>t.assistedEntityId===assistedId);
  const reiki=(state.reikiApplications||[]).filter((r)=>r.sessionId===sessionId&&r.assistedEntityId===assistedId);
  const lines=[`Fluxa · Resumo do atendimento`,`Assistido: ${assisted.displayName}`,`Data: ${fmt(session.startedAt)}`,''];
  if(initialHz!=null)lines.push(`Frequência inicial da investigação (Hawkins): ${initialHz} Hz`);
  if(finalHz!=null){const delta=initialHz==null?null:finalHz-initialHz;lines.push(`Frequência após tratamento (Hawkins): ${finalHz} Hz${delta==null?'':` (${delta>=0?'+':''}${delta} Hz em relação ao início)`}`);}
  if(initialHz!=null||finalHz!=null)lines.push('');
  if(treatments.length){lines.push('Tratamentos:');treatments.forEach((t)=>{const review=nextReview(state,t.id);lines.push(`• ${treatmentTitle(t)} · ${status[t.status]||'registrado'}${review?` · próxima revisão: ${fmtShort(review)}`:''}`);});lines.push('');}
  if(reiki.length){lines.push('Reiki:');reiki.forEach((r)=>{const mins=Number.isFinite(Number(r.durationSeconds))?Math.round(Number(r.durationSeconds)/60):null;lines.push(`• Aplicação ${reikiMode[r.mode]||''}${mins!=null?` · ${mins} min`:''}`.trim());});lines.push('');}
  lines.push('Este é um resumo objetivo do atendimento. O histórico técnico do Fluxa mantém o registro completo.');
  return lines.join('\n');
}
function openShare(sessionId,assistedId){
  const text=shareText(store.getState(),sessionId,assistedId);if(!text)return;
  document.querySelector('#client-share-overlay')?.remove();
  const wrap=document.createElement('div');wrap.id='client-share-overlay';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="sheet client-share-sheet"><div class="sheet-head"><div><p class="eyebrow">Para compartilhar</p><h2>Resumo em texto</h2></div><button class="close-btn" type="button" data-close-client-share>×</button></div><p class="muted">Formato curto para copiar no WhatsApp, email ou outra mensagem.</p><textarea class="client-share-text" readonly>${esc(text)}</textarea><div class="button-row"><button class="btn primary" type="button" data-copy-client-share>Copiar texto</button><button class="btn secondary" type="button" data-native-client-share ${navigator.share?'':'hidden'}>Compartilhar</button></div></section>`;document.body.appendChild(wrap);
}
function enhanceButtons(){
  document.querySelectorAll('[data-session-report][data-assisted]').forEach((full)=>{
    if(full.parentElement?.querySelector(`[data-client-report][data-assisted="${CSS.escape(full.dataset.assisted)}"]`))return;
    const b=document.createElement('button');b.className='btn secondary wide';b.dataset.clientReport='true';b.dataset.session=full.dataset.session;b.dataset.assisted=full.dataset.assisted;b.textContent='Resumo para compartilhar';full.after(b);
  });
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceButtons();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
document.addEventListener('click',async(event)=>{
  const close=event.target.closest('[data-close-client-share]');if(close){document.querySelector('#client-share-overlay')?.remove();return;}
  const copy=event.target.closest('[data-copy-client-share]');if(copy){const text=document.querySelector('.client-share-text')?.value||'';try{await navigator.clipboard.writeText(text);copy.textContent='Copiado';}catch(_){document.querySelector('.client-share-text')?.select();document.execCommand?.('copy');copy.textContent='Copiado';}return;}
  const share=event.target.closest('[data-native-client-share]');if(share&&navigator.share){const text=document.querySelector('.client-share-text')?.value||'';try{await navigator.share({title:'Resumo do atendimento · Fluxa',text});}catch(_){}return;}
  const b=event.target.closest('[data-client-report]');if(b){event.preventDefault();event.stopImmediatePropagation();openShare(b.dataset.session,b.dataset.assisted);}
},true);
