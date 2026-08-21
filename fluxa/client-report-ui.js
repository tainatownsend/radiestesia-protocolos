import { createStore } from './store.js';

const store=createStore();
let enhancing=false;
const status={PLANNED:'Planejado',IN_PROGRESS:'Em andamento',COMPLETED:'Concluído',INTERRUPTED:'Interrompido',STOPPED:'Interrompido',REPLACED:'Substituído',RUNNING:'Em andamento',PAUSED:'Pausado',CANCELED:'Cancelado'};
const reikiMode={IN_PERSON:'Presencial',PRESENTIAL:'Presencial',DISTANCE:'À distância',SELF:'Autoaplicação',SELF_APPLICATION:'Autoaplicação',OTHER:'Outro'};
function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function fmt(iso){const time=new Date(iso||'').getTime();return Number.isFinite(time)?new Intl.DateTimeFormat('pt-BR',{dateStyle:'long'}).format(new Date(time)):'—';}
function label(value){return value?(status[value]||'Registrado'):'';}
function minutesFromSeconds(value){const seconds=Number(value);return Number.isFinite(seconds)&&seconds>=0?Math.round(seconds/60):null;}
function objectiveOf(treatment){return treatment?.objective||treatment?.therapeuticObjective||'';}
function sessionTreatments(state,sessionId,assistedId){
  const ids=new Set((state.events||[]).filter((e)=>e.sessionId===sessionId&&(e.entityType==='Treatment'||e.metadata?.treatmentId)).flatMap((e)=>[e.entityId,e.metadata?.treatmentId]).filter(Boolean));
  return (state.treatments||[]).filter((t)=>(t.originSessionId===sessionId||ids.has(t.id))&&t.assistedEntityId===assistedId);
}
function reportHtml(state,sessionId,assistedId){
  const session=state.sessions.find((s)=>s.id===sessionId);const assisted=state.assistedEntities.find((a)=>a.id===assistedId);if(!session||!assisted)return null;
  const assessments=(state.assessments||[]).filter((a)=>a.sessionId===sessionId&&a.assistedEntityId===assistedId);
  const treatments=sessionTreatments(state,sessionId,assistedId);
  const reiki=(state.reikiApplications||[]).filter((r)=>r.sessionId===sessionId&&r.assistedEntityId===assistedId);
  const components=(id)=>(state.treatmentComponents||[]).filter((c)=>c.treatmentId===id);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumo da sessão · ${esc(assisted.displayName)}</title><style>body{font-family:Inter,system-ui,-apple-system,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#202729;line-height:1.6}h1,h2,h3{color:#173F46}h1{font-size:28px}.brand{font-weight:800;color:#173F46}.muted{color:#606B6C}section{padding:18px 0;border-top:1px solid #CBD3D1}article{padding:14px 0}ul{padding-left:20px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}button{min-height:44px;padding:10px 16px;border-radius:12px;border:1px solid #173F46;background:#fff;color:#173F46;font:inherit}button.primary{background:#173F46;color:#fff}@media print{.actions{display:none}body{margin:0;max-width:none}}</style></head><body><p class="brand">Fluxa</p><h1>Resumo da sessão</h1><p><strong>${esc(assisted.displayName)}</strong></p><p class="muted">${fmt(session.startedAt)}</p><div class="actions"><button class="primary" onclick="window.print()">Imprimir / salvar em PDF</button><button id="share" hidden>Compartilhar</button></div>
  <section><h2>Como ficou registrado</h2>${assessments.length?`<ul>${assessments.map((a)=>`<li>${esc(a.subject||'Avaliação')}: <strong>${esc(a.result??a.frequency??'')}</strong>${a.scale?` ${esc(a.scale)}`:''}${a.imbalancePercent!=null?` · ${esc(a.imbalancePercent)}% de desequilíbrio`:''}</li>`).join('')}</ul>`:'<p class="muted">Não houve avaliação registrada nesta sessão.</p>'}</section>
  <section><h2>Tratamentos</h2>${treatments.length?treatments.map((t)=>{const objective=objectiveOf(t);return `<article><h3>${esc(t.title)}</h3>${objective?`<p><strong>Objetivo:</strong> ${esc(objective)}</p>`:''}<p class="muted">${esc(label(t.status))}</p>${components(t.id).length?`<ul>${components(t.id).map((c)=>`<li><strong>${esc(c.name)}</strong>${c.expectedEndAt?`<br><span class="muted">Revisão prevista: ${fmt(c.expectedEndAt)}</span>`:''}</li>`).join('')}</ul>`:''}</article>`;}).join(''):'<p class="muted">Nenhum tratamento foi iniciado ou alterado nesta sessão.</p>'}</section>
  <section><h2>Reiki</h2>${reiki.length?`<ul>${reiki.map((r)=>{const minutes=minutesFromSeconds(r.durationSeconds);return `<li>${esc(reikiMode[r.mode]||'Aplicação')} · ${esc(label(r.status))}${minutes!=null?` · ${minutes} min`:''}</li>`;}).join('')}</ul>`:'<p class="muted">Nenhuma aplicação registrada nesta sessão.</p>'}</section>
  <p class="muted">Este resumo reúne apenas informações selecionadas para compartilhamento. Comandos dos componentes, anotações internas, investigações e achados permanecem somente no histórico técnico do Fluxa.</p><script>const b=document.querySelector('#share');if(navigator.share){b.hidden=false;b.onclick=async()=>{try{await navigator.share({title:document.title,text:document.body.innerText.replace('Imprimir / salvar em PDF','').replace('Compartilhar','')});}catch(e){}}}</script></body></html>`;
}
function open(sessionId,assistedId){const html=reportHtml(store.getState(),sessionId,assistedId);if(!html)return;const win=window.open('','_blank');if(!win){alert('Permita a abertura de uma nova janela para gerar o resumo.');return;}win.document.open();win.document.write(html);win.document.close();}
function enhanceButtons(){
  document.querySelectorAll('[data-session-report][data-assisted]').forEach((full)=>{
    if(full.parentElement?.querySelector(`[data-client-report][data-assisted="${CSS.escape(full.dataset.assisted)}"]`))return;
    const b=document.createElement('button');b.className='btn ghost wide';b.dataset.clientReport='true';b.dataset.session=full.dataset.session;b.dataset.assisted=full.dataset.assisted;b.textContent='Resumo para compartilhar';full.after(b);
  });
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceButtons();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
document.addEventListener('click',(event)=>{const b=event.target.closest('[data-client-report]');if(b){event.preventDefault();event.stopImmediatePropagation();open(b.dataset.session,b.dataset.assisted);}},true);
