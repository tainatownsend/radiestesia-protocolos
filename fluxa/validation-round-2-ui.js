import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store=createStore();
let enhancing=false;

function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function timeValue(value){const n=new Date(value||'').getTime();return Number.isFinite(n)?n:null;}
function fmtDate(value){const n=timeValue(value);return n==null?'—':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(n));}
function baseMain(){return document.querySelector('#app > main:not([data-workspace-view])');}
function mainEyebrow(main){return main?.querySelector(':scope > .eyebrow')?.textContent?.trim()||'';}
function isSessionHome(main){return mainEyebrow(main)==='Sessão em andamento';}
function prepared(state,session){return latestPreparation(state,session?.id)?.status==='COMPLETED';}
function mantras(state=store.getState()){
  const items=state?.settings?.mantrasPermissions;
  return Array.isArray(items)?items.filter((item)=>item&&item.id&&item.name&&item.text):[];
}
function activeTreatments(state,assistedId){
  return (state.treatments||[]).filter((item)=>item.assistedEntityId===assistedId&&['PLANNED','IN_PROGRESS','INTERRUPTED'].includes(item.status)).sort((a,b)=>(timeValue(b.updatedAt||b.createdAt)||0)-(timeValue(a.updatedAt||a.createdAt)||0));
}
function componentsFor(state,treatmentId){return (state.treatmentComponents||[]).filter((item)=>item.treatmentId===treatmentId);}
function nextComponent(components){return components.filter((item)=>item.status==='IN_PROGRESS'&&item.expectedEndAt).sort((a,b)=>String(a.expectedEndAt).localeCompare(String(b.expectedEndAt)))[0]||null;}
function ensureAssistedPrompt(state,session){
  document.querySelectorAll('[data-session-assisted-prompt]').forEach((node)=>{if(!node.closest('main')||!isSessionHome(node.closest('main')))node.remove();});
  const main=baseMain();
  if(!main||!isSessionHome(main)||!prepared(state,session)||session.currentAssistedEntityId){main?.querySelector('[data-session-assisted-prompt]')?.remove();return;}
  let prompt=main.querySelector('[data-session-assisted-prompt]');
  if(prompt)return;
  prompt=document.createElement('section');prompt.className='section card session-assisted-prompt';prompt.dataset.sessionAssistedPrompt='true';
  prompt.innerHTML='<p class="eyebrow">Próximo passo</p><h2>Quem será atendido agora?</h2><p class="muted">Selecione um Assistido já cadastrado ou cadastre um novo sem sair da sessão.</p><button type="button" class="btn primary wide" data-action="choose-assisted">Selecionar ou cadastrar Assistido</button>';
  const cockpit=main.querySelector('[data-home-cockpit]');
  if(cockpit)cockpit.before(prompt);else{const timeline=[...main.querySelectorAll('.section')].find((node)=>node.querySelector('h2')?.textContent?.trim()==='Timeline da sessão');(timeline||main.firstElementChild)?.before?.(prompt)||main.prepend(prompt);}
}
function ensureTreatmentContinuity(state,session){
  const main=baseMain();if(!main||!isSessionHome(main)||!prepared(state,session)||!session.currentAssistedEntityId)return;
  const cockpit=main.querySelector('[data-home-cockpit]');if(!cockpit)return;
  const items=activeTreatments(state,session.currentAssistedEntityId);
  let section=main.querySelector('[data-home-treatment-continuity]');
  if(!items.length){section?.remove();return;}
  const signature=JSON.stringify(items.map((item)=>[item.id,item.status,item.updatedAt,componentsFor(state,item.id).map((c)=>[c.id,c.status,c.expectedEndAt])]));
  if(!section){section=document.createElement('section');section.className='section home-treatment-continuity';section.dataset.homeTreatmentContinuity='true';cockpit.after(section);}
  if(section.dataset.signature===signature)return;section.dataset.signature=signature;
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Continuidade</p><h2>Tratamentos deste Assistido</h2></div><button type="button" class="btn ghost small" data-open-treatments-view>Ver todos</button></div><div class="home-treatment-list">${items.slice(0,3).map((item)=>{const comps=componentsFor(state,item.id),active=comps.filter((c)=>c.status==='IN_PROGRESS').length,next=nextComponent(comps);return `<article class="home-treatment-row"><div><strong>${esc(item.title||'Tratamento')}</strong><p class="muted">${active} ${active===1?'item ativo':'itens ativos'}${next?.expectedEndAt?` · revisão ${esc(fmtDate(next.expectedEndAt))}`:''}</p></div><button type="button" class="btn secondary small" data-home-open-treatment="${esc(item.id)}">${item.status==='INTERRUPTED'?'Retomar':'Abrir'}</button></article>`;}).join('')}</div><p class="muted home-treatment-next-copy">Próximos passos: revisar itens com prazo atingido, continuar investigações abertas ou compor um novo tratamento quando necessário.</p>`;
}
function addMantraCard(){
  const main=document.querySelector('[data-workspace-view="acervo"]');const grid=main?.querySelector('[data-acervo-category-grid]');if(!grid||grid.querySelector('[data-mantra-acervo]'))return;
  const count=mantras().length;const card=document.createElement('button');card.type='button';card.className='acervo-card';card.dataset.mantraAcervo='true';card.dataset.acervoSearchText='mantras permissões oração texto preparação sessão';
  card.innerHTML=`<div><strong>Mantras / permissões</strong><span>Textos salvos para usar rapidamente na preparação da sessão.</span></div><b>${count} ${count===1?'cadastrado':'cadastrados'}</b>`;grid.appendChild(card);
}
function renderMantraAcervo(){
  const main=document.querySelector('[data-workspace-view="acervo"]');if(!main)return;
  const items=mantras();main.dataset.mantraView='true';main.innerHTML=`<div class="acervo-toolbar"><button type="button" class="btn ghost small" data-mantra-acervo-back>← Acervo</button></div><p class="eyebrow">Acervo</p><h1>Mantras / permissões</h1><p class="lead">Cadastre o nome e o texto completo. Na preparação da sessão, o terapeuta escolhe pelo nome e o Fluxa mostra o texto integral imediatamente abaixo.</p><section class="section"><button type="button" class="btn primary wide" data-new-mantra>Adicionar mantra / permissão</button></section><section class="section acervo-list">${items.length?items.map((item)=>`<article class="resource-row"><div class="resource-row-copy"><strong>${esc(item.name)}</strong><small>${esc(item.text.length>120?`${item.text.slice(0,120)}…`:item.text)}</small></div><button type="button" class="btn ghost small" data-edit-mantra="${esc(item.id)}">Editar</button></article>`).join(''):'<div class="empty">Nenhum mantra ou permissão cadastrado ainda.</div>'}</section>`;
}
function openMantraEditor(id=null){
  document.querySelector('#mantra-editor-overlay')?.remove();const existing=mantras().find((item)=>item.id===id)||null;const wrap=document.createElement('div');wrap.id='mantra-editor-overlay';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Acervo</p><h2>${existing?'Editar':'Novo'} mantra / permissão</h2></div><button type="button" class="close-btn" data-close-mantra-editor>×</button></div><form id="mantra-editor-form" class="form-grid" data-mantra-id="${esc(existing?.id||'')}"><div class="field"><label>Nome</label><input name="name" required value="${esc(existing?.name||'')}" placeholder="Ex.: Mantra padrão"></div><div class="field"><label>Texto completo</label><textarea name="text" required rows="8" placeholder="Digite o texto exatamente como deve aparecer durante a preparação">${esc(existing?.text||'')}</textarea></div><button type="submit" class="btn primary wide">Salvar no Acervo</button></form></section>`;document.body.appendChild(wrap);
}
function saveMantra(id,name,text){
  store.setState((state)=>{const draft=structuredClone(state);draft.settings=draft.settings||{};draft.settings.mantrasPermissions=Array.isArray(draft.settings.mantrasPermissions)?draft.settings.mantrasPermissions:[];const now=store.nowIso();if(id){const item=draft.settings.mantrasPermissions.find((entry)=>entry.id===id);if(item){item.name=name;item.text=text;item.updatedAt=now;}}else draft.settings.mantrasPermissions.push({id:store.makeId('mantra'),name,text,createdAt:now,updatedAt:now});return draft;});
}
function enhance(){if(enhancing)return;enhancing=true;try{const state=store.getState(),session=getOpenSession(state);if(session){ensureAssistedPrompt(state,session);ensureTreatmentContinuity(state,session);}addMantraCard();}finally{enhancing=false;}}
new MutationObserver(()=>queueMicrotask(enhance)).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);store.subscribe(()=>queueMicrotask(enhance));

document.addEventListener('click',(event)=>{const b=event.target.closest('button');if(!b)return;
  if(b.dataset.mantraAcervo!==undefined){event.preventDefault();renderMantraAcervo();return;}
  if(b.dataset.mantraAcervoBack!==undefined){document.querySelector('[data-workspace-route="acervo"]')?.click();return;}
  if(b.dataset.newMantra!==undefined){openMantraEditor();return;}
  if(b.dataset.editMantra){openMantraEditor(b.dataset.editMantra);return;}
  if(b.dataset.closeMantraEditor!==undefined){document.querySelector('#mantra-editor-overlay')?.remove();return;}
  if(b.dataset.openTreatmentsView!==undefined){document.querySelector('.bottom-nav [data-route="treatments"]')?.click();return;}
  if(b.dataset.homeOpenTreatment){document.querySelector('.bottom-nav [data-route="treatments"]')?.click();requestAnimationFrame(()=>document.querySelector(`[data-backlog-manage-components="${CSS.escape(b.dataset.homeOpenTreatment)}"],[data-review-treatment="${CSS.escape(b.dataset.homeOpenTreatment)}"]`)?.click());}
},true);

document.addEventListener('submit',(event)=>{const form=event.target;if(form.id!=='mantra-editor-form')return;event.preventDefault();const data=new FormData(form),name=String(data.get('name')||'').trim(),text=String(data.get('text')||'').trim();if(!name||!text)return;saveMantra(form.dataset.mantraId||null,name,text);document.querySelector('#mantra-editor-overlay')?.remove();renderMantraAcervo();},true);
