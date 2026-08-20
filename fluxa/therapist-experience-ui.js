import { createStore } from './store.js';
import { getOpenSession, selectAssistedForSession } from './domain.js';

const store = createStore();
let closeBypass = false;
let enhancing = false;
let pendingReikiLink = null;

function esc(value='') {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function fmt(iso) {
  return iso ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)) : '—';
}
function activeAssisted(state) {
  return (state.assistedEntities || []).filter((item)=>!item.archivedAt);
}
function sessionInvestigations(state, sessionId) {
  return (state.investigations || []).filter((item)=>item.originSessionId===sessionId || item.currentSessionId===sessionId || item.sessionId===sessionId);
}
function sessionTreatments(state, sessionId) {
  const eventIds = new Set((state.events||[]).filter((e)=>e.sessionId===sessionId && e.entityType==='Treatment').map((e)=>e.entityId));
  return (state.treatments||[]).filter((item)=>item.originSessionId===sessionId || eventIds.has(item.id));
}
function sessionReiki(state, sessionId) {
  return (state.reikiApplications||[]).filter((item)=>item.sessionId===sessionId);
}
function sessionAssessments(state, sessionId) {
  return (state.assessments||[]).filter((item)=>item.sessionId===sessionId);
}
function assistedName(state,id) {
  return state.assistedEntities.find((a)=>a.id===id)?.displayName || 'Assistido';
}
function sessionAssistedIds(state, sessionId) {
  const ids = new Set();
  (state.events||[]).filter((e)=>e.sessionId===sessionId && e.assistedEntityId).forEach((e)=>ids.add(e.assistedEntityId));
  sessionInvestigations(state,sessionId).forEach((x)=>x.assistedEntityId&&ids.add(x.assistedEntityId));
  sessionTreatments(state,sessionId).forEach((x)=>x.assistedEntityId&&ids.add(x.assistedEntityId));
  sessionReiki(state,sessionId).forEach((x)=>x.assistedEntityId&&ids.add(x.assistedEntityId));
  sessionAssessments(state,sessionId).forEach((x)=>x.assistedEntityId&&ids.add(x.assistedEntityId));
  return [...ids];
}
function protocolName(inv) {
  return inv.protocolSnapshot?.name || inv.protocolName || inv.protocolId || 'Investigação';
}
function statusLabel(status) {
  return ({IN_PROGRESS:'Em andamento',COMPLETED:'Concluída',PLANNED:'Planejado',INTERRUPTED:'Interrompido',RUNNING:'Em andamento',PAUSED:'Pausado',CANCELED:'Cancelado'})[status] || status || '';
}

function sessionDashboard() {
  const state = store.getState();
  const session = getOpenSession(state);
  const main = document.querySelector('main');
  if (!session || !main || main.querySelector('[data-session-dashboard]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Sessão em andamento') return;
  const ids = sessionAssistedIds(state,session.id);
  const investigations = sessionInvestigations(state,session.id);
  const treatments = sessionTreatments(state,session.id);
  const reiki = sessionReiki(state,session.id);
  const assessments = sessionAssessments(state,session.id);
  const section = document.createElement('section');
  section.className='section card soft';
  section.dataset.sessionDashboard='true';
  section.innerHTML = `<div class="section-head"><div><p class="eyebrow">Nesta sessão</p><h2>Visão do trabalho em andamento</h2></div><button class="btn secondary small" data-manage-session-investigations>Investigações</button></div>
    <div class="metric-grid"><div class="metric"><strong>${ids.length}</strong><span>assistidos</span></div><div class="metric"><strong>${investigations.length}</strong><span>investigações</span></div><div class="metric"><strong>${treatments.length}</strong><span>tratamentos</span></div><div class="metric"><strong>${reiki.length}</strong><span>Reiki</span></div></div>
    ${ids.length ? `<div class="stack">${ids.map((id)=>{
      const inv=investigations.filter((x)=>x.assistedEntityId===id);
      const tr=treatments.filter((x)=>x.assistedEntityId===id);
      const rk=reiki.filter((x)=>x.assistedEntityId===id);
      const av=assessments.filter((x)=>x.assistedEntityId===id);
      return `<article class="card"><div class="section-head"><h3>${esc(assistedName(state,id))}</h3><button class="btn ghost small" data-session-use-assisted="${id}">Usar agora</button></div><p class="muted">${inv.length} investigação(ões) · ${tr.length} tratamento(s) · ${rk.length} Reiki · ${av.length} avaliação(ões)</p></article>`;
    }).join('')}</div>` : '<p class="muted">As atividades aparecerão aqui conforme a sessão avançar.</p>'}`;
  const context = [...main.querySelectorAll('.card.soft.section')].find((node)=>node.querySelector('.eyebrow')?.textContent?.trim()==='Contexto atual');
  (context || main.querySelector('.hero-card'))?.after(section);
}

function investigationsDialog() {
  document.querySelector('#session-investigations-overlay')?.remove();
  const state=store.getState();
  const session=getOpenSession(state);
  if(!session)return;
  const items=(state.investigations||[])
    .filter((item)=>item.status==='IN_PROGRESS' || item.originSessionId===session.id || item.currentSessionId===session.id || item.sessionId===session.id)
    .sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
  const wrap=document.createElement('div');
  wrap.id='session-investigations-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Investigações</p><h2>Trabalhos deste atendimento</h2></div><button class="close-btn" data-session-investigations-close>×</button></div><p class="muted">Veja o que está concluído e retome o que ainda está aberto, inclusive quando começou em outra sessão.</p><div class="stack">${items.length?items.map((inv)=>`<article class="card"><p class="eyebrow">${esc(assistedName(state,inv.assistedEntityId))}</p><h3>${esc(protocolName(inv))}</h3><p class="muted">${esc(statusLabel(inv.status))}${inv.answers?.length!=null?` · ${inv.answers.length} resposta(s)`:''}</p>${inv.status==='IN_PROGRESS'?`<button class="btn primary wide" data-session-resume-investigation="${inv.id}" data-assisted="${inv.assistedEntityId}">Retomar investigação</button>`:''}</article>`).join(''):'<div class="empty">Nenhuma investigação registrada ainda.</div>'}</div></section>`;
  document.body.appendChild(wrap);
}

function reportData(state,sessionId,assistedId=null){
  const session=state.sessions.find((s)=>s.id===sessionId);
  const inv=sessionInvestigations(state,sessionId).filter((x)=>!assistedId||x.assistedEntityId===assistedId);
  const tr=sessionTreatments(state,sessionId).filter((x)=>!assistedId||x.assistedEntityId===assistedId);
  const rk=sessionReiki(state,sessionId).filter((x)=>!assistedId||x.assistedEntityId===assistedId);
  const av=sessionAssessments(state,sessionId).filter((x)=>!assistedId||x.assistedEntityId===assistedId);
  const invIds=new Set(inv.map((x)=>x.id));
  const findings=(state.findings||[]).filter((x)=>invIds.has(x.investigationId));
  return {session,investigations:inv,treatments:tr,reiki:rk,assessments:av,findings};
}
function reportHtml(state,sessionId,assistedId=null){
  const data=reportData(state,sessionId,assistedId);
  const assisted=assistedId?state.assistedEntities.find((a)=>a.id===assistedId):null;
  const title=assisted?`Relatório da sessão · ${assisted.displayName}`:'Resumo interno da sessão';
  const treatmentComponents=(id)=>(state.treatmentComponents||[]).filter((c)=>c.treatmentId===id);
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><style>body{font-family:Inter,system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#202729;line-height:1.5}h1,h2{color:#173F46}section{border-top:1px solid #CBD3D1;padding:18px 0}small,.muted{color:#606B6C}ul{padding-left:20px}@media print{button{display:none}body{margin:0}}</style></head><body><h1>Fluxa</h1><h2>${esc(title)}</h2><p class="muted">Sessão iniciada em ${fmt(data.session?.startedAt)}${data.session?.endedAt?` · encerrada em ${fmt(data.session.endedAt)}`:''}</p>
  ${assisted?`<section><h2>Assistido</h2><p>${esc(assisted.displayName)}</p></section>`:''}
  <section><h2>Avaliações</h2>${data.assessments.length?`<ul>${data.assessments.map((a)=>`<li><strong>${esc(a.subject||'Avaliação')}</strong>: ${esc(a.result??a.frequency??'')}${a.scale?` ${esc(a.scale)}`:''}${a.imbalancePercent!=null?` · desequilíbrio ${esc(a.imbalancePercent)}%`:''}</li>`).join('')}</ul>`:'<p>Nenhuma avaliação registrada.</p>'}</section>
  <section><h2>Investigações</h2>${data.investigations.length?`<ul>${data.investigations.map((i)=>`<li><strong>${esc(protocolName(i))}</strong> · ${esc(statusLabel(i.status))} · ${i.answers?.length||0} resposta(s)</li>`).join('')}</ul>`:'<p>Nenhuma investigação registrada.</p>'}${data.findings.length?`<h3>Achados confirmados</h3><ul>${data.findings.map((f)=>`<li>${esc(f.title||f.questionTextSnapshot||f.sourceQuestionText||'Achado')} · ${esc(f.classification||'')}</li>`).join('')}</ul>`:''}</section>
  <section><h2>Tratamentos</h2>${data.treatments.length?data.treatments.map((t)=>`<article><h3>${esc(t.title)}</h3><p>${esc(statusLabel(t.status))}</p><ul>${treatmentComponents(t.id).map((c)=>`<li>${esc(c.name)} · ${esc(statusLabel(c.status))}${c.expectedEndAt?` · revisão ${fmt(c.expectedEndAt)}`:''}</li>`).join('')}</ul></article>`).join(''):'<p>Nenhum tratamento registrado.</p>'}</section>
  <section><h2>Reiki</h2>${data.reiki.length?`<ul>${data.reiki.map((r)=>`<li>${esc(r.mode||'Aplicação')} · ${esc(statusLabel(r.status))}${r.durationSeconds!=null?` · ${Math.round(r.durationSeconds/60)} min`:''}${r.notes?` · ${esc(r.notes)}`:''}</li>`).join('')}</ul>`:'<p>Nenhuma aplicação registrada.</p>'}</section>
  <button onclick="window.print()">Imprimir / salvar em PDF</button></body></html>`;
  return html;
}
function openReport(sessionId,assistedId=null){
  const win=window.open('','_blank');
  if(!win){alert('Permita a abertura de uma nova janela para gerar o relatório.');return;}
  win.document.open();win.document.write(reportHtml(store.getState(),sessionId,assistedId));win.document.close();
}

function closeReviewDialog(){
  document.querySelector('#session-close-review-overlay')?.remove();
  const state=store.getState();const session=getOpenSession(state);if(!session)return;
  const ids=sessionAssistedIds(state,session.id);
  const inv=sessionInvestigations(state,session.id);
  const tr=sessionTreatments(state,session.id);
  const rk=sessionReiki(state,session.id);
  const unfinished=inv.filter((x)=>x.status==='IN_PROGRESS');
  const activeReiki=rk.filter((x)=>['RUNNING','PAUSED'].includes(x.status));
  const wrap=document.createElement('div');wrap.id='session-close-review-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Revisão da sessão</p><h2>Confira antes de encerrar</h2></div><button class="close-btn" data-session-close-review-close>×</button></div><div class="metric-grid"><div class="metric"><strong>${ids.length}</strong><span>assistidos</span></div><div class="metric"><strong>${inv.length}</strong><span>investigações</span></div><div class="metric"><strong>${tr.length}</strong><span>tratamentos</span></div><div class="metric"><strong>${rk.length}</strong><span>Reiki</span></div></div>${unfinished.length?`<div class="notice">${unfinished.length} investigação(ões) permanecerão abertas para continuidade futura.</div>`:''}${activeReiki.length?`<div class="notice">Há ${activeReiki.length} aplicação(ões) de Reiki ativa(s) ou pausada(s). Conclua ou cancele antes de encerrar.</div>`:''}<section class="section"><h3>Relatórios</h3><p class="muted">Gere um resumo interno da sessão ou um relatório separado por assistido, sem misturar informações entre pessoas.</p><div class="stack"><button class="btn secondary wide" data-session-report data-session="${session.id}">Resumo interno da sessão</button>${ids.map((id)=>`<button class="btn secondary wide" data-session-report data-session="${session.id}" data-assisted="${id}">Relatório · ${esc(assistedName(state,id))}</button>`).join('')}</div></section><button class="btn primary wide" data-session-close-proceed ${activeReiki.length?'disabled':''}>Prosseguir para encerramento seguro</button></section>`;
  document.body.appendChild(wrap);
}

function addTreatmentTrace(){
  const state=store.getState();
  document.querySelectorAll('.treatment-card').forEach((card)=>{
    if(card.querySelector('[data-treatment-trace]'))return;
    const id=card.dataset.treatmentId;
    const treatment=state.treatments.find((t)=>t.id===id);
    if(!treatment)return;
    const findings=(state.findings||[]).filter((f)=>(treatment.findingIds||[]).includes(f.id));
    if(!findings.length)return;
    const lines=findings.slice(0,3).map((f)=>{
      const inv=state.investigations.find((i)=>i.id===f.investigationId);
      return `${protocolName(inv||{})} → ${f.title||f.questionTextSnapshot||f.sourceQuestionText||'Achado'}${f.classification?` (${f.classification})`:''}`;
    });
    const p=document.createElement('p');p.className='muted';p.dataset.treatmentTrace='true';p.innerHTML=`<strong>Origem:</strong> ${lines.map(esc).join('<br>')}`;
    card.querySelector('.button-row')?.before(p) || card.appendChild(p);
  });
}

function addReturnSummary(){
  const detail=document.querySelector('.detail-sheet');
  if(!detail||detail.querySelector('[data-return-summary]'))return;
  const id=detail.querySelector('[data-assisted-edit]')?.dataset.assistedEdit || detail.querySelector('[data-assisted-archive]')?.dataset.assistedArchive;
  if(!id)return;
  const state=store.getState();
  const treatments=state.treatments.filter((t)=>t.assistedEntityId===id);
  const findings=state.findings.filter((f)=>f.assistedEntityId===id).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const assessments=state.assessments.filter((a)=>a.assistedEntityId===id).sort((a,b)=>(b.createdAt||b.occurredAt||'').localeCompare(a.createdAt||a.occurredAt||''));
  const events=state.events.filter((e)=>e.assistedEntityId===id&&e.sessionId).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
  const section=document.createElement('section');section.className='section card soft';section.dataset.returnSummary='true';
  const latest=assessments[0];
  section.innerHTML=`<p class="eyebrow">Resumo para retorno</p><h3>O essencial antes de continuar</h3><p><strong>Tratamentos atuais:</strong> ${treatments.filter((t)=>['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(t.status)).length}</p><p><strong>Última avaliação:</strong> ${latest?`${esc(latest.subject||'Avaliação')} · ${esc(latest.result??latest.frequency??'')}${latest.imbalancePercent!=null?` · ${esc(latest.imbalancePercent)}% desequilíbrio`:''}`:'Nenhuma registrada'}</p><p><strong>Achado recente:</strong> ${findings[0]?esc(findings[0].title||findings[0].questionTextSnapshot||'Achado registrado'):'Nenhum confirmado'}</p><p><strong>Última atividade em sessão:</strong> ${events[0]?fmt(events[0].occurredAt):'Nenhuma'}</p>`;
  detail.querySelector('.sheet-head')?.after(section);
}

function prepProgress(){
  const sheet=document.querySelector('.sheet [data-action="complete-preparation"]')?.closest('.sheet');
  if(!sheet||sheet.querySelector('[data-prep-guided-progress]'))return;
  const rows=[...sheet.querySelectorAll('[data-prep-step]')].map((input)=>input.closest('.check-row')).filter(Boolean);
  if(!rows.length)return;
  const settings=store.getState().settings?.preparationLabels||{};
  rows.forEach((row)=>{const input=row.querySelector('[data-prep-step]');const text=settings[input.dataset.prepStep];if(text)row.querySelector('span').textContent=text;});
  const firstIncomplete=rows.findIndex((row)=>!row.querySelector('input').checked);
  rows.forEach((row,index)=>{row.hidden=firstIncomplete>=0 ? index!==firstIncomplete : false;});
  const box=document.createElement('div');box.className='notice';box.dataset.prepGuidedProgress='true';
  box.textContent=firstIncomplete>=0?`Etapa ${firstIncomplete+1} de ${rows.length} · conclua esta etapa para avançar.`:`Etapas-base concluídas · complete os dados da preparação.`;
  rows[0].parentElement?.before(box);
}

function preparationSettings(){
  const main=document.querySelector('main');if(!main||main.querySelector('[data-preparation-settings]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Biblioteca')return;
  const section=document.createElement('section');section.className='section card';section.dataset.preparationSettings='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Preferências</p><h2>Preparação da sessão</h2></div><button class="btn secondary small" data-edit-preparation-copy>Personalizar</button></div><p class="muted">A sequência continua segura e estruturada; você pode adaptar o texto das etapas ao seu procedimento.</p>`;
  main.appendChild(section);
}
function preparationSettingsDialog(){
  document.querySelector('#preparation-settings-overlay')?.remove();
  const settings=store.getState().settings?.preparationLabels||{};
  const wrap=document.createElement('div');wrap.id='preparation-settings-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Preparação</p><h2>Personalizar textos</h2></div><button class="close-btn" data-preparation-settings-close>×</button></div><form id="preparation-settings-form" class="form-grid"><div class="field"><label>Respiração</label><input name="breathing" value="${esc(settings.breathing||'')}"></div><div class="field"><label>Medição de frequência</label><input name="frequency" value="${esc(settings.frequency||'')}"></div><div class="field"><label>Proteção</label><input name="protection" value="${esc(settings.protection||'')}"></div><div class="field"><label>Permissão / mantra</label><input name="permission" value="${esc(settings.permission||'')}"></div><button class="btn primary wide">Salvar preferências</button></form></section>`;
  document.body.appendChild(wrap);
}

function backupReminder(){
  const main=document.querySelector('main');if(!main||main.querySelector('[data-backup-reminder]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Hoje')return;
  const last=localStorage.getItem('fluxa.lastExportAt');
  const days=last?Math.floor((Date.now()-new Date(last).getTime())/86400000):null;
  if(days!==null&&days<7)return;
  const section=document.createElement('section');section.className='section notice-card';section.dataset.backupReminder='true';
  section.innerHTML=`<div><p class="eyebrow">Segurança dos dados</p><h2>${last?'Sua última cópia local já tem alguns dias.':'Você ainda não exportou uma cópia local.'}</h2><p>${last?`Última exportação: ${fmt(last)}.`:'O histórico está somente neste dispositivo. Exporte uma cópia periodicamente.'}</p></div><button class="btn secondary" data-trigger-backup-export>Exportar agora</button>`;
  main.appendChild(section);
}

function enhanceReikiTreatmentLink(){
  const state=store.getState();
  const session=getOpenSession(state);
  const assistedId=session?.currentAssistedEntityId;
  const treatments=state.treatments.filter((t)=>t.assistedEntityId===assistedId&&['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(t.status));
  const fieldHost=document.querySelector('[data-session-reiki-mode]');
  if(fieldHost&&!document.querySelector('[data-session-reiki-treatment]')){
    const field=document.createElement('div');field.className='field';field.dataset.sessionReikiTreatment='true';
    field.innerHTML=`<label>Vincular a tratamento <span class="muted">(opcional)</span></label><select data-session-reiki-treatment-select><option value="">Sem vínculo</option>${treatments.map((t)=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}</select>`;
    fieldHost.after(field);
  }
  document.querySelectorAll('#reiki-retro-form, #reiki-outside-start').forEach((form)=>{
    if(form.querySelector('[data-reiki-treatment-field]'))return;
    const selectAssisted=form.querySelector('[name="assistedEntityId"]');
    if(!selectAssisted)return;
    const field=document.createElement('div');field.className='field';field.dataset.reikiTreatmentField='true';
    field.innerHTML='<label>Vincular a tratamento <span class="muted">(opcional)</span></label><select name="treatmentId"><option value="">Sem vínculo</option></select>';
    selectAssisted.closest('.field')?.after(field);
    const refresh=()=>{const id=selectAssisted.value;const opts=state.treatments.filter((t)=>t.assistedEntityId===id&&['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(t.status));field.querySelector('select').innerHTML=`<option value="">Sem vínculo</option>${opts.map((t)=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}`;};
    selectAssisted.addEventListener('change',refresh);refresh();
  });
}
function linkNewestReiki(before,treatmentId){
  if(!treatmentId)return;
  const app=store.getState().reikiApplications.filter((r)=>!before.has(r.id)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];
  if(!app)return;
  store.setState((state)=>{const d=structuredClone(state);const target=d.reikiApplications.find((r)=>r.id===app.id);if(target){target.treatmentId=treatmentId;target.updatedAt=store.nowIso();}return d;});
}

function enhance(){
  if(enhancing)return;enhancing=true;
  try{sessionDashboard();addTreatmentTrace();addReturnSummary();prepProgress();preparationSettings();backupReminder();enhanceReikiTreatmentLink();}finally{enhancing=false;}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

// Review the whole session before the existing close workflow.
document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('[data-action="close-session"]')&&!closeBypass){event.preventDefault();event.stopImmediatePropagation();closeReviewDialog();return;}
  if(button.dataset.sessionCloseReviewClose!==undefined){document.querySelector('#session-close-review-overlay')?.remove();return;}
  if(button.dataset.sessionCloseProceed!==undefined){document.querySelector('#session-close-review-overlay')?.remove();closeBypass=true;queueMicrotask(()=>{const target=document.querySelector('[data-action="close-session"]');target?.click();closeBypass=false;});return;}
  if(button.dataset.sessionReport!==undefined){openReport(button.dataset.session,button.dataset.assisted||null);return;}
  if(button.dataset.manageSessionInvestigations!==undefined){investigationsDialog();return;}
  if(button.dataset.sessionInvestigationsClose!==undefined){document.querySelector('#session-investigations-overlay')?.remove();return;}
  if(button.dataset.sessionUseAssisted){const s=getOpenSession(store.getState());if(s)selectAssistedForSession(store,s.id,button.dataset.sessionUseAssisted);return;}
  if(button.dataset.sessionResumeInvestigation){const s=getOpenSession(store.getState());if(!s)return;selectAssistedForSession(store,s.id,button.dataset.assisted);document.querySelector('#session-investigations-overlay')?.remove();queueMicrotask(()=>document.querySelector('[data-action="resume-latest-investigation"]')?.click());return;}
  if(button.dataset.editPreparationCopy!==undefined){preparationSettingsDialog();return;}
  if(button.dataset.preparationSettingsClose!==undefined){document.querySelector('#preparation-settings-overlay')?.remove();return;}
  if(button.dataset.triggerBackupExport!==undefined){document.querySelector('[data-storage-export-quiet],[data-storage-export]')?.click();return;}
  if(button.dataset.action==='reiki'){
    const select=document.querySelector('[data-session-reiki-treatment-select]');
    pendingReikiLink={before:new Set(store.getState().reikiApplications.map((r)=>r.id)),treatmentId:select?.value||null};
    queueMicrotask(()=>{if(pendingReikiLink){linkNewestReiki(pendingReikiLink.before,pendingReikiLink.treatmentId);pendingReikiLink=null;}});
  }
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(form.id==='preparation-settings-form'){
    event.preventDefault();const d=new FormData(form);
    store.setState((state)=>{const draft=structuredClone(state);draft.settings={...(draft.settings||{}),preparationLabels:{breathing:String(d.get('breathing')||'').trim(),frequency:String(d.get('frequency')||'').trim(),protection:String(d.get('protection')||'').trim(),permission:String(d.get('permission')||'').trim()}};return draft;});
    document.querySelector('#preparation-settings-overlay')?.remove();return;
  }
  if(['reiki-retro-form','reiki-outside-start'].includes(form.id)){
    const d=new FormData(form);const treatmentId=d.get('treatmentId');if(!treatmentId)return;
    const before=new Set(store.getState().reikiApplications.map((r)=>r.id));
    queueMicrotask(()=>linkNewestReiki(before,treatmentId));
  }
},true);

// Mark successful local backup exports for visible reminders.
document.addEventListener('click',(event)=>{
  if(!event.target.closest('[data-storage-export-quiet],[data-storage-export]'))return;
  setTimeout(()=>localStorage.setItem('fluxa.lastExportAt',new Date().toISOString()),100);
},true);
