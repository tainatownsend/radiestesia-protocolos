import { createStore } from './store.js';
import { sessionAssistedIds, sessionComponents, sessionFindings, sessionInvestigations, sessionTreatments } from './session-report-data.js';

const store=createStore();
const statusLabels={PLANNED:'Planejado',IN_PROGRESS:'Em andamento',COMPLETED:'Concluído',INTERRUPTED:'Interrompido',STOPPED:'Interrompido',REPLACED:'Substituído',RUNNING:'Em andamento',PAUSED:'Pausado',CANCELED:'Cancelado'};
const findingLabels={CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',FACTOR_RELEVANT:'Fator relevante',DEEPEN:'Item a aprofundar'};
const reikiModeLabels={PRESENTIAL:'Presencial',DISTANCE:'À distância',SELF:'Autoaplicação',OTHER:'Outro',IN_PERSON:'Presencial',SELF_APPLICATION:'Autoaplicação'};

function esc(value=''){return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function fmt(iso){const time=new Date(iso||'').getTime();return Number.isFinite(time)?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(time)):'—';}
function minutesFromSeconds(value){const seconds=Number(value);return Number.isFinite(seconds)&&seconds>=0?Math.round(seconds/60):null;}
function labelStatus(value){return value?(statusLabels[value]||'Registrado'):'';}
function objectiveOf(treatment){return treatment?.objective||treatment?.therapeuticObjective||'';}
function protocolName(inv){return inv?.protocolSnapshot?.name||inv?.protocolName||'Investigação';}
function assistedName(state,id){return state.assistedEntities.find((a)=>a.id===id)?.displayName||'Assistido';}
function dataFor(state,sessionId,assistedId){
  const investigations=sessionInvestigations(state,sessionId).filter((i)=>!assistedId||i.assistedEntityId===assistedId);
  return {
    investigations,
    findings:sessionFindings(state,sessionId,investigations),
    treatments:sessionTreatments(state,sessionId).filter((t)=>!assistedId||t.assistedEntityId===assistedId),
    reiki:state.reikiApplications.filter((r)=>r.sessionId===sessionId&&(!assistedId||r.assistedEntityId===assistedId)),
    assessments:state.assessments.filter((a)=>a.sessionId===sessionId&&(!assistedId||a.assistedEntityId===assistedId)),
    notes:state.events.filter((e)=>e.sessionId===sessionId&&e.eventType==='NOTE_CREATED'&&(!assistedId||e.assistedEntityId===assistedId))
  };
}
function section(title,body){return `<section><h2>${esc(title)}</h2>${body}</section>`;}
function list(items,renderer,empty){return items.length?`<ul>${items.map(renderer).join('')}</ul>`:`<p class="muted">${esc(empty)}</p>`;}
function assistedReportBody(state,sessionId,assistedId){
  const d=dataFor(state,sessionId,assistedId);
  const components=(id)=>sessionComponents(state,sessionId,id);
  return [
    section('Avaliações',list(d.assessments,(a)=>`<li><strong>${esc(a.subject||'Avaliação')}</strong>: ${esc(a.result??a.frequency??'')}${a.scale?` ${esc(a.scale)}`:''}${a.imbalancePercent!=null?` · desequilíbrio ${esc(a.imbalancePercent)}%`:''}${a.notes?`<br><span class="muted">${esc(a.notes)}</span>`:''}</li>`,'Nenhuma avaliação registrada.')),
    section('Investigações',list(d.investigations,(i)=>`<li><strong>${esc(protocolName(i))}</strong> · ${esc(labelStatus(i.status))} · ${Array.isArray(i.answers)?i.answers.length:0} resposta(s)${i.protocolSnapshot?.version?` · versão ${esc(i.protocolSnapshot.version)}`:''}</li>`,'Nenhuma investigação registrada.') + (d.findings.length?`<h3>Achados confirmados</h3>${list(d.findings,(f)=>`<li>${esc(f.title||f.questionTextSnapshot||f.sourceQuestionText||'Achado')} · ${esc(findingLabels[f.classification]||'Fator relevante')}</li>`,'')}`:'')),
    section('Tratamentos',d.treatments.length?d.treatments.map((t)=>{const objective=objectiveOf(t);return `<article><h3>${esc(t.title)}</h3>${objective?`<p><strong>Objetivo terapêutico:</strong> ${esc(objective)}</p>`:''}<p>${esc(labelStatus(t.status))}</p>${list(components(t.id),(c)=>`<li><strong>${esc(c.name)}</strong> · ${esc(labelStatus(c.status))}${c.instructions?`<br><span class="muted">${esc(c.instructions)}</span>`:''}${c.expectedEndAt?`<br><span class="muted">Revisão prevista: ${fmt(c.expectedEndAt)}</span>`:''}</li>`,'Nenhum componente registrado nesta sessão.')}</article>`;}).join(''):'<p class="muted">Nenhum tratamento registrado nesta sessão.</p>'),
    section('Reiki',list(d.reiki,(r)=>{const treatment=state.treatments.find((t)=>t.id===r.treatmentId);const minutes=minutesFromSeconds(r.durationSeconds);return `<li><strong>${esc(reikiModeLabels[r.mode]||'Aplicação')}</strong> · ${esc(labelStatus(r.status))}${minutes!=null?` · ${minutes} min`:''}${treatment?` · vinculado a ${esc(treatment.title)}`:''}${r.notes?`<br><span class="muted">${esc(r.notes)}</span>`:''}</li>`;},'Nenhuma aplicação registrada.')),
    section('Anotações da sessão',list(d.notes,(e)=>`<li>${esc(e.metadata?.body||e.metadata?.notes||'Anotação')}</li>`,'Nenhuma anotação registrada para este assistido.'))
  ].join('');
}
function internalReportBody(state,sessionId){
  const ids=sessionAssistedIds(state,sessionId);
  if(!ids.length)return '<p class="muted">Nenhuma atividade vinculada a assistidos nesta sessão.</p>';
  return ids.map((id)=>`<section class="assisted-block"><h2>${esc(assistedName(state,id))}</h2>${assistedReportBody(state,sessionId,id)}</section>`).join('');
}
function documentHtml(state,sessionId,assistedId=null){
  const session=state.sessions.find((s)=>s.id===sessionId);if(!session)return null;
  const assisted=assistedId?state.assistedEntities.find((a)=>a.id===assistedId):null;
  const title=assisted?`Relatório da sessão · ${assisted.displayName}`:'Resumo interno da sessão';
  const body=assisted?assistedReportBody(state,sessionId,assistedId):internalReportBody(state,sessionId);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:Inter,system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#202729;line-height:1.5}h1,h2,h3{color:#173F46}h1{margin-bottom:4px}section{border-top:1px solid #CBD3D1;padding:18px 0}.assisted-block{border:2px solid #CBD3D1;border-radius:16px;padding:20px;margin:22px 0}.assisted-block>section{margin-left:8px}.muted{color:#606B6C}ul{padding-left:22px}.actions{display:flex;gap:10px;margin:24px 0;flex-wrap:wrap}button{min-height:44px;padding:10px 16px;border-radius:12px;border:1px solid #173F46;background:#fff;color:#173F46;font:inherit}button.primary{background:#173F46;color:#fff}@media print{.actions{display:none}body{margin:0;max-width:none}.assisted-block{break-inside:avoid}}</style></head><body><p class="muted">Fluxa</p><h1>${esc(title)}</h1><p class="muted">Sessão iniciada em ${fmt(session.startedAt)}${session.endedAt?` · encerrada em ${fmt(session.endedAt)}`:''}</p><div class="actions"><button class="primary" onclick="window.print()">Imprimir / salvar em PDF</button><button id="share-report" hidden>Compartilhar resumo</button></div>${body}<script>const share=document.querySelector('#share-report');if(navigator.share){share.hidden=false;share.addEventListener('click',async()=>{try{await navigator.share({title:document.title,text:document.body.innerText.replace('Imprimir / salvar em PDF','').replace('Compartilhar resumo','')});}catch(e){}});}</script></body></html>`;
}
function openReport(sessionId,assistedId=null){
  const html=documentHtml(store.getState(),sessionId,assistedId);if(!html)return;
  const win=window.open('','_blank');if(!win){alert('Permita a abertura de uma nova janela para gerar o relatório.');return;}
  win.document.open();win.document.write(html);win.document.close();
}

window.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-session-report]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  openReport(button.dataset.session,button.dataset.assisted||null);
},true);
