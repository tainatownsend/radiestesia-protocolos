import { createStore } from './store.js';
import { getOpenSession } from './domain.js';
import { PROTOCOL_LIBRARY } from './protocol-engine.js';
import { ensureRootProtocolCatalog,rootProtocolCatalog,activeRootProtocol,startRootProtocol,resumeRootProtocol,answerRootProtocol,currentRootNode,confirmRootFindings } from './legacy-protocol-adapter.js';

const store=createStore();
let activeRootId=null;
let enhancing=false;
const THEME_FILTERS=[
  ['Todos',''],['Financeiro','finance prosperidade dinheiro escassez'],['Carreira','carreira profissional trabalho propósito'],['Relacionamentos','relacion casamento afetivo conflito ciclo divorcio'],['Autoestima','autoestima amor-próprio merecimento corpo'],['Família','famil parental ancestral'],['Casa','casa ambiente'],['Criatividade','criatividade projetos'],['Social','social pertencimento'],['Padrões','padrões repetitivos causa raiz'],['Rápidos','reequilíbrio decisão conflito ciclo']
];
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function normalize(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function currentAssisted(){const state=store.getState(),session=getOpenSession(state);return state.assistedEntities.find(a=>a.id===session?.currentAssistedEntityId)||null;}
function witnessCopy(){const assisted=currentAssisted();if(!assisted)return 'Se você utiliza testemunho na sua prática, prepare o formato habitual antes de iniciar.';const birth=assisted.birthDate||assisted.dateOfBirth||assisted.details?.birthDate;return birth?`Dados disponíveis para o testemunho: ${assisted.displayName} + data de nascimento cadastrada. Use foto ou outro formato apenas se fizer parte da sua prática.`:`Se você utiliza testemunho, os dados de ${assisted.displayName} podem ser usados no formato habitual da sua prática.`;}
function activeBuiltIn(id){const state=store.getState(),session=getOpenSession(state);return state.investigations.find(i=>i.kind==='BRANCHING'&&i.status==='IN_PROGRESS'&&i.assistedEntityId===session?.currentAssistedEntityId&&i.protocolId===id)||null;}
function protocolCard(protocol,kind='root'){
  const active=kind==='root'?activeRootProtocol(protocol.id,getOpenSession(store.getState())?.currentAssistedEntityId):activeBuiltIn(protocol.id);
  const search=normalize([protocol.name,protocol.category,protocol.description,protocol.tags||''].join(' '));
  const action=kind==='root'?`data-start-root-protocol="${esc(protocol.id)}"`:`data-start-branching="${esc(protocol.id)}"`;
  return `<article class="therapeutic-protocol-card" data-protocol-card data-protocol-search-text="${esc(search)}"><div><p class="eyebrow">${esc(protocol.category)}</p><h3>${esc(protocol.name)}</h3><p>${esc(protocol.description||'')}</p></div><button class="btn secondary" ${action}>${active?'Retomar':'Iniciar'}</button></article>`;
}
function renderCatalog(sheet,rootProtocols){
  const built=PROTOCOL_LIBRARY;
  const groups=new Map();
  for(const item of [...built.map(p=>({...p,_kind:'built'})),...rootProtocols.map(p=>({...p,_kind:'root'}))]){const key=item.category||'Protocolos';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  const order=['Protocolo Mestre','Temas essenciais','Investigações profundas','Protocolos rápidos','Investigação','Investigação ampliada','Aprofundamento específico','Investigação profunda'];
  const sections=[...groups.entries()].sort((a,b)=>{const ai=order.indexOf(a[0]),bi=order.indexOf(b[0]);return (ai<0?99:ai)-(bi<0?99:bi);});
  sheet.innerHTML=`<div class="sheet-head"><div><p class="eyebrow">Investigar</p><h2>O que você quer compreender agora?</h2></div><button class="close-btn" data-close-investigation-chooser>×</button></div>
    <div class="therapeutic-witness-note"><span class="witness-mark">◎</span><div><strong>Testemunho <span class="muted">opcional</span></strong><p>${esc(witnessCopy())}</p></div></div>
    <div class="protocol-discovery"><label class="field"><span>Encontrar protocolo</span><input type="search" data-therapeutic-search placeholder="Ex.: dinheiro, família, conflito, prosperidade…"></label><div class="theme-chips">${THEME_FILTERS.map(([label,terms],i)=>`<button type="button" class="theme-chip ${i===0?'active':''}" data-theme-terms="${esc(terms)}">${esc(label)}</button>`).join('')}</div></div>
    <section class="featured-protocol-grid"><article class="featured-protocol master"><p class="eyebrow">Quando o tema ainda não está claro</p><h3>Protocolo Mestre de Causa Raiz</h3><p>Investiga a natureza do padrão antes de escolher um protocolo específico.</p><button class="btn primary" data-start-root-by-title="Protocolo Mestre de Causa Raiz">Abrir Protocolo Mestre</button></article><article class="featured-protocol divorce"><p class="eyebrow">Fluxo guiado</p><h3>Divórcio Energético</h3><p>Temas, áreas, ancoragem, tratamento geral, corte, reavaliação e tratamentos específicos.</p><button class="btn secondary" data-open-divorce-energy>Iniciar Divórcio Energético</button></article></section>
    <div class="catalog-sections">${sections.map(([name,items])=>`<section class="catalog-group" data-catalog-group><div class="section-head"><h3>${esc(name)}</h3><span class="muted">${items.length}</span></div><div class="catalog-list">${items.map(p=>protocolCard(p,p._kind)).join('')}</div></section>`).join('')}</div>
    <article class="therapeutic-protocol-card quick-entry" data-protocol-card data-protocol-search-text="triagem rápida prioridade"><div><p class="eyebrow">Triagem</p><h3>Triagem rápida</h3><p>Perguntas essenciais para decidir se vale aprofundar.</p></div><button class="btn secondary" data-start-quick-investigation>Iniciar</button></article>
    <p class="empty catalog-empty" data-catalog-empty hidden>Nenhum protocolo corresponde a este filtro.</p>`;
}
function applyFilter(overlay){
  const query=normalize(overlay.querySelector('[data-therapeutic-search]')?.value||'');
  const theme=normalize(overlay.querySelector('.theme-chip.active')?.dataset.themeTerms||'');
  let visible=0;
  overlay.querySelectorAll('[data-protocol-card]').forEach(card=>{const text=normalize(card.dataset.protocolSearchText||card.textContent);const queryOk=!query||text.includes(query);const themeOk=!theme||theme.split(/\s+/).some(term=>text.includes(term));card.hidden=!(queryOk&&themeOk);if(!card.hidden)visible++;});
  overlay.querySelectorAll('[data-catalog-group]').forEach(group=>group.hidden=![...group.querySelectorAll('[data-protocol-card]')].some(c=>!c.hidden));
  const featured=overlay.querySelector('.featured-protocol-grid');if(featured)featured.hidden=!!query||!!theme;
  overlay.querySelector('[data-catalog-empty]')?.toggleAttribute('hidden',visible>0);
}
async function enhanceChooser(){
  if(enhancing)return;const overlay=document.querySelector('#investigation-chooser-overlay');const sheet=overlay?.querySelector('.sheet');if(!sheet||sheet.dataset.therapeuticCatalog)return;
  enhancing=true;sheet.dataset.therapeuticCatalog='loading';
  try{sheet.innerHTML='<div class="catalog-loading"><span></span><strong>Carregando biblioteca terapêutica…</strong></div>';const roots=await ensureRootProtocolCatalog();if(!sheet.isConnected)return;renderCatalog(sheet,roots);sheet.dataset.therapeuticCatalog='ready';}finally{enhancing=false;}
}
function closeRootDialog(){document.querySelector('#root-protocol-overlay')?.remove();activeRootId=null;}
function rootDialog(){
  document.querySelector('#root-protocol-overlay')?.remove();if(!activeRootId)return;const state=store.getState(),inv=state.investigations.find(i=>i.id===activeRootId);if(!inv){activeRootId=null;return;}const assisted=state.assistedEntities.find(a=>a.id===inv.assistedEntityId),node=currentRootNode(inv);const wrap=document.createElement('div');wrap.id='root-protocol-overlay';wrap.className='modal-backdrop';
  if(inv.status==='COMPLETED'){
    const yes=inv.answers.filter(a=>a.answer==='YES');wrap.innerHTML=`<section class="sheet focus-sheet premium-protocol-sheet"><div class="sheet-head"><div><p class="eyebrow">Investigação concluída</p><h2>${esc(inv.protocolSnapshot.name)}</h2><p class="muted">${esc(assisted?.displayName||'')}</p></div><button class="close-btn" data-close-root-protocol>×</button></div><form id="root-findings-form" data-investigation="${esc(inv.id)}" class="form-grid"><p class="muted">Confirme somente o que realmente deve orientar o tratamento. Os comandos abaixo vêm do protocolo original e podem ser ajustados.</p>${yes.length?`<div class="root-findings-list">${yes.map(a=>`<article class="root-finding-choice"><label><input type="checkbox" name="finding" value="${esc(a.nodeId)}"><span><strong>${esc(a.legacyPlanTitle||a.questionTextSnapshot)}</strong><small>${esc(a.sectionSnapshot||'Achado')}</small></span></label>${a.legacyPlanCommand?`<p>${esc(a.legacyPlanCommand)}</p>`:''}<select data-root-classification="${esc(a.nodeId)}" aria-label="Classificação do achado"><option value="FACTOR_RELEVANT">Fator relevante</option><option value="CAUSE">Causa</option><option value="MAINTAINER">Mantenedor</option><option value="CONSEQUENCE">Consequência</option><option value="ASSOCIATION">Associação</option><option value="DEEPEN">Item a aprofundar</option></select></article>`).join('')}</div>`:'<div class="empty">Nenhuma resposta positiva para consolidar.</div>'}<button class="btn primary wide" type="submit">Registrar achados</button></form></section>`;
  }else{
    const answered=inv.answers.length,total=Object.values(inv.protocolSnapshot.nodes).filter(n=>n.type==='QUESTION').length,pct=Math.max(4,Math.round(answered/Math.max(1,total)*100));wrap.innerHTML=`<section class="sheet focus-sheet premium-protocol-sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(inv.protocolSnapshot.category)}</p><h2>${esc(inv.protocolSnapshot.name)}</h2><p class="muted">${esc(assisted?.displayName||'')}</p></div><button class="close-btn" data-close-root-protocol>×</button></div><div class="protocol-progress"><span style="width:${pct}%"></span></div><div class="question-context">${node?.section?`<span>${esc(node.section)}</span>`:''}<strong>${answered+1} de até ${total}</strong></div><div class="question-panel"><h1>${esc(node?.text||'')}</h1></div><div class="binary-actions"><button class="binary-btn" data-root-answer="YES">Sim</button><button class="binary-btn" data-root-answer="NO">Não</button></div><div class="save-state">Autosave ativo · biblioteca original do Fluxa</div></section>`;
  }
  document.body.appendChild(wrap);
}
function findingsHandoff(created){
  document.querySelector('#root-findings-handoff')?.remove();const wrap=document.createElement('div');wrap.id='root-findings-handoff';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Achados registrados</p><h2>${created.length} ${created.length===1?'item confirmado':'itens confirmados'}</h2></div><button class="close-btn" data-root-handoff-close>×</button></div>${created.length?`<div class="stack">${created.map(f=>`<article class="card soft"><strong>${esc(f.title)}</strong>${f.suggestedTreatmentCommand?`<p class="muted">${esc(f.suggestedTreatmentCommand)}</p>`:''}</article>`).join('')}</div>`:''}<div class="handoff-actions"><button class="btn primary wide" data-root-handoff-treatment>Iniciar tratamento</button><button class="btn secondary wide" data-root-handoff-investigate>Continuar investigando</button><button class="btn ghost wide" data-root-handoff-close>Voltar à sessão</button></div></section>`;document.body.appendChild(wrap);
}

new MutationObserver(()=>queueMicrotask(enhanceChooser)).observe(document.body,{childList:true,subtree:true});window.addEventListener('fluxa:root-protocols-ready',()=>queueMicrotask(enhanceChooser));queueMicrotask(enhanceChooser);

document.addEventListener('input',e=>{if(e.target.matches('[data-therapeutic-search]'))applyFilter(e.target.closest('#investigation-chooser-overlay'));});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.matches('.theme-chip')){const overlay=b.closest('#investigation-chooser-overlay');overlay?.querySelectorAll('.theme-chip').forEach(x=>x.classList.toggle('active',x===b));applyFilter(overlay);return;}
  if(b.dataset.startRootByTitle){const p=rootProtocolCatalog().find(x=>x.name===b.dataset.startRootByTitle);if(p){b.dataset.startRootProtocol=p.id;b.click();}return;}
  if(b.dataset.startRootProtocol){try{document.querySelector('#investigation-chooser-overlay')?.remove();const session=getOpenSession(store.getState()),existing=activeRootProtocol(b.dataset.startRootProtocol,session?.currentAssistedEntityId);activeRootId=existing?(resumeRootProtocol(existing.id),existing.id):startRootProtocol(b.dataset.startRootProtocol).id;rootDialog();}catch(error){alert(error.message);}return;}
  if(b.dataset.closeRootProtocol!==undefined){closeRootDialog();return;}
  if(b.dataset.rootAnswer){try{answerRootProtocol(activeRootId,b.dataset.rootAnswer);rootDialog();}catch(error){alert(error.message);}return;}
  if(b.dataset.rootHandoffClose!==undefined){document.querySelector('#root-findings-handoff')?.remove();return;}
  if(b.dataset.rootHandoffTreatment!==undefined){document.querySelector('#root-findings-handoff')?.remove();document.querySelector('[data-action="treat-direct"]')?.click();return;}
  if(b.dataset.rootHandoffInvestigate!==undefined){document.querySelector('#root-findings-handoff')?.remove();document.querySelector('[data-action="investigate"]')?.click();return;}
});
document.addEventListener('submit',e=>{const form=e.target;if(form.id!=='root-findings-form')return;e.preventDefault();const data=new FormData(form),selections=data.getAll('finding').map(nodeId=>({nodeId,classification:form.querySelector(`[data-root-classification="${CSS.escape(nodeId)}"]`)?.value||'FACTOR_RELEVANT'}));try{const created=confirmRootFindings(form.dataset.investigation,selections);closeRootDialog();findingsHandoff(created);}catch(error){alert(error.message);}});
