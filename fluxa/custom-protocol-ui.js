import { createStore } from './store.js';
import { getOpenSession, latestPreparation, selectAssistedForSession } from './domain.js';

const store=createStore();
let activeInvestigationId=null;
let editingProtocolKey=null;

function esc(value=''){return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function now(){return store.nowIso();}
function protocols(state=store.getState()){return Array.isArray(state.customProtocols)?state.customProtocols:[];}
function latestProtocols(state=store.getState()){
  const map=new Map();
  for(const item of protocols(state)){
    const current=map.get(item.protocolKey);
    if(!current||Number(item.version)>Number(current.version))map.set(item.protocolKey,item);
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function preparedSession(){
  const state=store.getState();const session=getOpenSession(state);
  if(!session)return null;
  if(latestPreparation(state,session.id)?.status!=='COMPLETED')return null;
  return session;
}
function addEvent(draft,input){draft.events.push({id:store.makeId('evt'),eventType:input.eventType,entityType:input.entityType||'Investigation',entityId:input.entityId,sessionId:input.sessionId||null,assistedEntityId:input.assistedEntityId||null,occurredAt:now(),createdAt:now(),metadata:input.metadata||{}});}
function close(id){document.querySelector(id)?.remove();}
function overlay(id,html){close(`#${id}`);const w=document.createElement('div');w.id=id;w.className='modal-backdrop';w.innerHTML=html;document.body.appendChild(w);}

function ensureLibrary(){
  const main=document.querySelector('main');
  if(!main||main.querySelector('[data-custom-protocol-library]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Biblioteca')return;
  const items=latestProtocols();
  const section=document.createElement('section');section.className='section';section.dataset.customProtocolLibrary='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Meus protocolos</p><h2>Protocolos próprios</h2></div><button class="btn primary small" data-new-custom-protocol>Novo protocolo</button></div><p class="muted">Crie protocolos locais com perguntas Sim/Não e caminhos próprios. Cada alteração gera uma nova versão; execuções antigas preservam o snapshot utilizado.</p><div class="stack">${items.length?items.map((p)=>`<article class="card"><div class="section-head"><div><p class="eyebrow">Versão ${p.version}</p><h3>${esc(p.name)}</h3></div><button class="btn secondary small" data-edit-custom-protocol="${p.protocolKey}">Nova versão</button></div>${p.description?`<p class="muted">${esc(p.description)}</p>`:''}<p class="muted">${p.questions.length} pergunta(s)</p><button class="btn secondary wide" data-start-custom-protocol="${p.protocolKey}">Iniciar protocolo</button></article>`).join(''):'<div class="empty">Nenhum protocolo próprio cadastrado.</div>'}</div>`;
  main.appendChild(section);
}
function ensureChooser(){
  const chooser=document.querySelector('#investigation-chooser-overlay .stack');
  if(!chooser||chooser.querySelector('[data-custom-protocol-chooser]'))return;
  const items=latestProtocols();if(!items.length)return;
  const holder=document.createElement('div');holder.dataset.customProtocolChooser='true';holder.className='stack';
  holder.innerHTML=`<div><p class="eyebrow">Meus protocolos</p></div>${items.map((p)=>`<article class="card"><p class="eyebrow">Próprio · v${p.version}</p><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'Protocolo personalizado')}</p><button class="btn secondary wide" data-start-custom-protocol="${p.protocolKey}">Iniciar protocolo</button></article>`).join('')}`;
  chooser.appendChild(holder);
}

function questionRow(index,q={}){
  return `<article class="card" data-custom-question><div class="section-head"><h3>Pergunta ${index}</h3>${index>1?'<button type="button" class="btn ghost small" data-remove-custom-question>Remover</button>':''}</div><div class="form-grid"><div class="field"><label>Pergunta</label><textarea name="questionText" required>${esc(q.text||'')}</textarea></div><div class="field"><label>Se Sim, ir para</label><input name="yesTarget" value="${esc(q.yesTargetDisplay||'')}" placeholder="Próxima, Fim ou nº da pergunta"></div><div class="field"><label>Se Não, ir para</label><input name="noTarget" value="${esc(q.noTargetDisplay||'')}" placeholder="Próxima, Fim ou nº da pergunta"></div></div></article>`;
}
function versionSource(key){return latestProtocols().find((p)=>p.protocolKey===key)||null;}
function editor(key=null){
  editingProtocolKey=key;
  const source=key?versionSource(key):null;
  overlay('custom-protocol-editor-overlay',`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Meus protocolos</p><h2>${source?'Criar nova versão':'Novo protocolo'}</h2></div><button class="close-btn" data-custom-protocol-close>×</button></div><p class="muted">Use “Próxima”, “Fim” ou o número de uma pergunta como destino. Se deixar vazio, o Fluxa segue para a próxima pergunta.</p><form id="custom-protocol-form" class="form-grid"><div class="field"><label>Nome</label><input name="name" value="${esc(source?.name||'')}" required></div><div class="field"><label>Descrição</label><textarea name="description">${esc(source?.description||'')}</textarea></div><div data-custom-questions>${(source?.questions||[{text:''}]).map((q,i)=>questionRow(i+1,q)).join('')}</div><button type="button" class="btn secondary wide" data-add-custom-question>Adicionar pergunta</button><button class="btn primary wide">${source?'Salvar nova versão':'Criar protocolo'}</button></form></section>`);
}
function renumber(form){form.querySelectorAll('[data-custom-question]').forEach((row,i)=>{row.querySelector('h3').textContent=`Pergunta ${i+1}`;});}
function resolveTarget(raw,index,count){
  const value=String(raw||'').trim().toLowerCase();
  if(!value||value==='próxima'||value==='proxima')return index<count-1?`q${index+2}`:'END';
  if(value==='fim'||value==='end')return 'END';
  const n=Number(value);if(Number.isInteger(n)&&n>=1&&n<=count)return `q${n}`;
  throw new Error(`Destino inválido na pergunta ${index+1}. Use Próxima, Fim ou um número entre 1 e ${count}.`);
}
function saveProtocol(form){
  const d=new FormData(form);const texts=d.getAll('questionText');const yes=d.getAll('yesTarget');const no=d.getAll('noTarget');
  if(!texts.length)throw new Error('Adicione pelo menos uma pergunta.');
  const source=editingProtocolKey?versionSource(editingProtocolKey):null;
  const protocolKey=source?.protocolKey||`custom_${store.makeId('protocol')}`;
  const version=(source?.version||0)+1;
  const questions=texts.map((text,index)=>({id:`q${index+1}`,text:String(text).trim(),yesNext:resolveTarget(yes[index],index,texts.length),noNext:resolveTarget(no[index],index,texts.length),yesTargetDisplay:String(yes[index]||''),noTargetDisplay:String(no[index]||'')}));
  if(questions.some((q)=>!q.text))throw new Error('Todas as perguntas precisam ter texto.');
  const protocol={id:store.makeId('cpv'),protocolKey,version,versionId:`${protocolKey}_v${version}`,name:String(d.get('name')||'').trim(),description:String(d.get('description')||'').trim(),questions,createdAt:now()};
  if(!protocol.name)throw new Error('Informe o nome do protocolo.');
  store.setState((state)=>{const draft=structuredClone(state);draft.customProtocols=Array.isArray(draft.customProtocols)?draft.customProtocols:[];draft.customProtocols.push(protocol);return draft;});
  editingProtocolKey=null;close('#custom-protocol-editor-overlay');
}

function activeCustomForAssisted(assistedId){return (store.getState().investigations||[]).filter((i)=>i.kind==='CUSTOM_BRANCHING'&&i.assistedEntityId===assistedId&&i.status==='IN_PROGRESS').sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0]||null;}
function startProtocol(key){
  const state=store.getState();const session=preparedSession();
  if(!session){alert('Abra e conclua a preparação de uma sessão antes de iniciar este protocolo.');document.querySelector('[data-route="today"]')?.click();return;}
  if(!session.currentAssistedEntityId){return;}// global assisted guard handles this before this listener
  const protocol=versionSource(key);if(!protocol)return;
  const existing=(state.investigations||[]).find((i)=>i.kind==='CUSTOM_BRANCHING'&&i.assistedEntityId===session.currentAssistedEntityId&&i.protocolId===key&&i.status==='IN_PROGRESS');
  if(existing){resumeCustom(existing.id,session.id);activeInvestigationId=existing.id;renderExecution();return;}
  const inv={id:store.makeId('inv'),kind:'CUSTOM_BRANCHING',protocolId:key,protocolVersionId:protocol.versionId,protocolSnapshot:structuredClone(protocol),assistedEntityId:session.currentAssistedEntityId,originSessionId:session.id,currentSessionId:session.id,status:'IN_PROGRESS',currentNodeId:'q1',answers:[],createdAt:now(),updatedAt:now(),completedAt:null};
  store.setState((current)=>{const draft=structuredClone(current);draft.investigations.push(inv);addEvent(draft,{eventType:'INVESTIGATION_STARTED',entityId:inv.id,sessionId:session.id,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:protocol.name,protocolVersionId:protocol.versionId,custom:true}});return draft;});
  activeInvestigationId=inv.id;renderExecution();
}
function resumeCustom(id,sessionId){
  store.setState((state)=>{const draft=structuredClone(state);const inv=draft.investigations.find((i)=>i.id===id&&i.kind==='CUSTOM_BRANCHING'&&i.status==='IN_PROGRESS');if(!inv)return draft;const session=draft.sessions.find((s)=>s.id===sessionId&&s.status==='OPEN');if(!session)return draft;inv.currentSessionId=sessionId;inv.updatedAt=now();session.currentAssistedEntityId=inv.assistedEntityId;addEvent(draft,{eventType:'INVESTIGATION_RESUMED',entityId:inv.id,sessionId,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:inv.protocolSnapshot.name,custom:true}});return draft;});
}
function currentQuestion(inv){return inv.protocolSnapshot.questions.find((q)=>q.id===inv.currentNodeId)||null;}
function answerCustom(answer){
  const state=store.getState();const inv=state.investigations.find((i)=>i.id===activeInvestigationId);if(!inv)return;const q=currentQuestion(inv);if(!q)return;
  const session=preparedSession();if(!session)throw new Error('Conclua a preparação da sessão antes de continuar.');
  const next=answer==='YES'?q.yesNext:q.noNext;
  store.setState((current)=>{const draft=structuredClone(current);const target=draft.investigations.find((i)=>i.id===inv.id);target.answers.push({nodeId:q.id,questionTextSnapshot:q.text,answer,answeredAt:now(),sessionId:session.id});target.currentNodeId=next;target.updatedAt=now();if(next==='END'){target.status='COMPLETED';target.completedAt=now();addEvent(draft,{eventType:'INVESTIGATION_COMPLETED',entityId:target.id,sessionId:session.id,assistedEntityId:target.assistedEntityId,metadata:{protocolName:target.protocolSnapshot.name,custom:true}});}return draft;});
  renderExecution();
}
function renderExecution(){
  close('#custom-protocol-run-overlay');const state=store.getState();const inv=state.investigations.find((i)=>i.id===activeInvestigationId);if(!inv)return;
  const assisted=state.assistedEntities.find((a)=>a.id===inv.assistedEntityId);
  if(inv.status==='COMPLETED'){
    const positives=inv.answers.filter((a)=>a.answer==='YES');
    overlay('custom-protocol-run-overlay',`<section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(inv.protocolSnapshot.name)} concluído</p><h2>${esc(assisted?.displayName||'')}</h2></div><button class="close-btn" data-custom-run-close>×</button></div><p class="muted">Confirme e classifique individualmente apenas os itens que realmente devem virar achados.</p><form id="custom-findings-form" data-investigation="${inv.id}" class="form-grid">${positives.length?positives.map((a)=>`<article class="card"><label class="check-row"><input type="checkbox" name="finding" value="${a.nodeId}"><span>${esc(a.questionTextSnapshot)}</span></label><div class="field"><label>Classificação</label><select name="classification_${a.nodeId}"><option value="FACTOR_RELEVANT">Fator relevante</option><option value="CAUSE">Causa</option><option value="MAINTAINER">Mantenedor</option><option value="CONSEQUENCE">Consequência</option><option value="ASSOCIATION">Associação</option><option value="DEEPEN">Item a aprofundar</option></select></div></article>`).join(''):'<div class="empty">Nenhuma resposta “Sim” para consolidar.</div>'}<button class="btn primary wide">Registrar conclusão</button></form></section>`);return;
  }
  const q=currentQuestion(inv);const index=inv.protocolSnapshot.questions.findIndex((x)=>x.id===q?.id);
  overlay('custom-protocol-run-overlay',`<section class="sheet focus-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(inv.protocolSnapshot.name)} · ${index+1}/${inv.protocolSnapshot.questions.length}</p><h2>${esc(assisted?.displayName||'')}</h2></div><button class="close-btn" data-custom-run-close>×</button></div><div class="question-panel"><p class="muted">Consulte o pêndulo</p><h1>${esc(q?.text||'')}</h1></div><div class="binary-actions"><button class="binary-btn" data-custom-answer="YES">Sim</button><button class="binary-btn" data-custom-answer="NO">Não</button></div><div class="save-state">Autosave ativo · versão ${inv.protocolSnapshot.version}</div></section>`);
}
function confirmFindings(form){
  const state=store.getState();const inv=state.investigations.find((i)=>i.id===form.dataset.investigation);if(!inv)return;
  const d=new FormData(form);const selected=new Set(d.getAll('finding'));
  store.setState((current)=>{const draft=structuredClone(current);for(const answer of inv.answers.filter((a)=>selected.has(a.nodeId))){const exists=draft.findings.some((f)=>f.investigationId===inv.id&&f.sourceQuestionId===answer.nodeId&&f.status!=='DISMISSED');if(exists)continue;const classification=d.get(`classification_${answer.nodeId}`)||'FACTOR_RELEVANT';const finding={id:store.makeId('find'),investigationId:inv.id,assistedEntityId:inv.assistedEntityId,sourceQuestionId:answer.nodeId,questionTextSnapshot:answer.questionTextSnapshot,title:answer.questionTextSnapshot,classification,status:'CONFIRMED',createdAt:now(),updatedAt:now()};draft.findings.push(finding);addEvent(draft,{eventType:'FINDING_IDENTIFIED',entityType:'Finding',entityId:finding.id,sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId,metadata:{title:finding.title,classification,protocolName:inv.protocolSnapshot.name,custom:true}});}return draft;});
  close('#custom-protocol-run-overlay');activeInvestigationId=null;
}

function enhance(){ensureLibrary();ensureChooser();}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.newCustomProtocol!==undefined){editor();return;}
  if(b.dataset.editCustomProtocol){editor(b.dataset.editCustomProtocol);return;}
  if(b.dataset.customProtocolClose!==undefined){close('#custom-protocol-editor-overlay');editingProtocolKey=null;return;}
  if(b.dataset.addCustomQuestion!==undefined){const form=b.closest('form');const host=form.querySelector('[data-custom-questions]');host.insertAdjacentHTML('beforeend',questionRow(host.querySelectorAll('[data-custom-question]').length+1));return;}
  if(b.dataset.removeCustomQuestion!==undefined){const form=b.closest('form');b.closest('[data-custom-question]')?.remove();renumber(form);return;}
  if(b.dataset.startCustomProtocol){event.preventDefault();event.stopImmediatePropagation();startProtocol(b.dataset.startCustomProtocol);return;}
  if(b.dataset.customAnswer){try{answerCustom(b.dataset.customAnswer);}catch(e){alert(e.message);}return;}
  if(b.dataset.customRunClose!==undefined){close('#custom-protocol-run-overlay');activeInvestigationId=null;return;}

  if(b.dataset.action==='resume-latest-investigation'){
    const session=preparedSession();if(!session?.currentAssistedEntityId)return;
    const custom=activeCustomForAssisted(session.currentAssistedEntityId);if(!custom)return;
    const others=(store.getState().investigations||[]).filter((i)=>i.assistedEntityId===session.currentAssistedEntityId&&i.status==='IN_PROGRESS'&&i.kind!=='CUSTOM_BRANCHING').sort((a,c)=>(c.updatedAt||'').localeCompare(a.updatedAt||''));
    if(others[0]&&(others[0].updatedAt||'')>(custom.updatedAt||''))return;
    event.preventDefault();event.stopImmediatePropagation();resumeCustom(custom.id,session.id);activeInvestigationId=custom.id;renderExecution();
  }
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(form.id==='custom-protocol-form'){event.preventDefault();try{saveProtocol(form);}catch(e){alert(e.message);}return;}
  if(form.id==='custom-findings-form'){event.preventDefault();try{confirmFindings(form);}catch(e){alert(e.message);}return;}
},true);
