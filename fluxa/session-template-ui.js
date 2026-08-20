import { createStore } from './store.js';
import { getOpenSession, latestPreparation } from './domain.js';

const store = createStore();
let enhancing = false;

const STEPS = [
  { id:'ASSESS', label:'Avaliar', hint:'Registrar uma medição ou resultado' },
  { id:'INVESTIGATE', label:'Investigar', hint:'Abrir o seletor de investigação' },
  { id:'TREAT', label:'Tratar', hint:'Criar ou continuar tratamento' },
  { id:'REIKI', label:'Reiki', hint:'Abrir aplicação / timer' },
  { id:'NOTE', label:'Anotar', hint:'Adicionar registro rápido' }
];

function esc(value='') { return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function templates(state=store.getState()) { return Array.isArray(state.settings?.sessionTemplates) ? state.settings.sessionTemplates : []; }
function stepById(id) { return STEPS.find((step)=>step.id===id); }
function close(id) { document.querySelector(id)?.remove(); }
function overlay(id,html) { close(`#${id}`);const wrap=document.createElement('div');wrap.id=id;wrap.className='modal-backdrop';wrap.innerHTML=html;document.body.appendChild(wrap); }

function ensureLibrarySection() {
  const main=document.querySelector('main');
  if(!main||main.querySelector('[data-session-template-library]'))return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Biblioteca')return;
  const items=templates();
  const section=document.createElement('section');section.className='section';section.dataset.sessionTemplateLibrary='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Roteiros de sessão</p><h2>Sequências rápidas</h2></div><button class="btn secondary small" data-new-session-template>Novo roteiro</button></div><p class="muted">Um roteiro só organiza atalhos. Ele nunca responde perguntas, conclui etapas ou toma decisões terapêuticas automaticamente.</p><div class="stack">${items.length?items.map((item)=>`<article class="card"><div class="section-head"><div><h3>${esc(item.name)}</h3><p class="muted">${item.steps.map((id)=>stepById(id)?.label).filter(Boolean).map(esc).join(' → ')}</p></div><div class="button-row"><button class="btn secondary small" data-edit-session-template="${item.id}">Editar</button><button class="btn ghost small" data-delete-session-template="${item.id}">Excluir</button></div></div></article>`).join(''):'<div class="empty">Nenhum roteiro criado. Use apenas se uma sequência recorrente realmente economizar toques.</div>'}</div>`;
  main.appendChild(section);
}

function ensureSessionAction() {
  const bar=document.querySelector('[data-fast-session-context]');
  if(!bar||bar.querySelector('[data-open-session-templates]'))return;
  const state=store.getState();const session=getOpenSession(state);
  if(!session||latestPreparation(state,session.id)?.status!=='COMPLETED'||!templates(state).length)return;
  const actions=bar.querySelector('.fast-context-actions');if(!actions)return;
  const button=document.createElement('button');button.className='btn secondary small';button.dataset.openSessionTemplates='true';button.textContent='Roteiro';actions.prepend(button);
}

function editor(existing=null) {
  const selected=new Set(existing?.steps||[]);
  overlay('session-template-editor-overlay',`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Roteiro de sessão</p><h2>${existing?'Editar roteiro':'Novo roteiro'}</h2></div><button class="close-btn" data-session-template-close>×</button></div><form id="session-template-form" data-template="${existing?.id||''}" class="form-grid"><div class="field"><label>Nome do roteiro</label><input name="name" value="${esc(existing?.name||'')}" required placeholder="Ex.: Atendimento de acompanhamento"></div><fieldset class="field"><legend>Atalhos, na ordem de uso</legend><div class="checklist">${STEPS.map((step)=>`<label class="check-row"><input type="checkbox" name="step" value="${step.id}" ${selected.has(step.id)?'checked':''}><span><strong>${esc(step.label)}</strong><small class="muted">${esc(step.hint)}</small></span></label>`).join('')}</div></fieldset><button class="btn primary wide" type="submit">Salvar roteiro</button></form></section>`);
}

function chooser() {
  const state=store.getState();const items=templates(state);const session=getOpenSession(state);
  if(!session||latestPreparation(state,session.id)?.status!=='COMPLETED')return;
  overlay('session-template-picker-overlay',`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Atalhos da sessão</p><h2>Escolha um roteiro</h2></div><button class="close-btn" data-session-template-close>×</button></div><p class="muted">Cada etapa continua sendo iniciada e confirmada por você.</p><div class="stack">${items.map((item)=>`<article class="card"><h3>${esc(item.name)}</h3><p class="muted">${item.steps.map((id)=>stepById(id)?.label).filter(Boolean).map(esc).join(' → ')}</p><button class="btn primary wide" data-use-session-template="${item.id}">Usar este roteiro</button></article>`).join('')}</div></section>`);
}

function runner(templateId) {
  const item=templates().find((entry)=>entry.id===templateId);if(!item)return;
  overlay('session-template-picker-overlay',`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">${esc(item.name)}</p><h2>Próximos atalhos</h2></div><button class="close-btn" data-session-template-close>×</button></div><div class="stack">${item.steps.map((id,index)=>{const step=stepById(id);return step?`<button class="action-card session-template-step" data-template-step="${step.id}"><strong>${index+1}. ${esc(step.label)}</strong><span>${esc(step.hint)}</span></button>`:'';}).join('')}</div><p class="muted section">O roteiro não marca etapas como concluídas. Ele serve apenas para reduzir navegação.</p></section>`);
}

function saveTemplate(form) {
  const data=new FormData(form);const name=String(data.get('name')||'').trim();const steps=data.getAll('step');
  if(!name)throw new Error('Informe o nome do roteiro.');
  if(!steps.length)throw new Error('Escolha pelo menos um atalho para o roteiro.');
  const id=form.dataset.template||store.makeId('session_template');const now=store.nowIso();
  store.setState((state)=>{const draft=structuredClone(state);draft.settings={...(draft.settings||{})};const list=Array.isArray(draft.settings.sessionTemplates)?draft.settings.sessionTemplates:[];const existing=list.find((item)=>item.id===id);if(existing){existing.name=name;existing.steps=steps;existing.updatedAt=now;}else list.push({id,name,steps,createdAt:now,updatedAt:now});draft.settings.sessionTemplates=list;return draft;});
  close('#session-template-editor-overlay');
}

function deleteTemplate(id) {
  store.setState((state)=>{const draft=structuredClone(state);draft.settings={...(draft.settings||{})};draft.settings.sessionTemplates=(draft.settings.sessionTemplates||[]).filter((item)=>item.id!==id);return draft;});
}

function launchStep(step) {
  close('#session-template-picker-overlay');
  const selectors={
    ASSESS:'[data-general-assessment]',
    INVESTIGATE:'[data-action="investigate"]',
    TREAT:'[data-action="treat-direct"]',
    REIKI:'[data-action="reiki"]',
    NOTE:'[data-action="add-note"]'
  };
  requestAnimationFrame(()=>document.querySelector(selectors[step])?.click());
}

function enhance(){if(enhancing)return;enhancing=true;try{ensureLibrarySection();ensureSessionAction();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.newSessionTemplate!==undefined){editor();return;}
  if(button.dataset.editSessionTemplate){editor(templates().find((item)=>item.id===button.dataset.editSessionTemplate));return;}
  if(button.dataset.deleteSessionTemplate){if(confirm('Excluir este roteiro de sessão?'))deleteTemplate(button.dataset.deleteSessionTemplate);return;}
  if(button.dataset.openSessionTemplates!==undefined){chooser();return;}
  if(button.dataset.useSessionTemplate){runner(button.dataset.useSessionTemplate);return;}
  if(button.dataset.templateStep){launchStep(button.dataset.templateStep);return;}
  if(button.dataset.sessionTemplateClose!==undefined){close('#session-template-editor-overlay');close('#session-template-picker-overlay');}
},true);

document.addEventListener('submit',(event)=>{if(event.target.id!=='session-template-form')return;event.preventDefault();try{saveTemplate(event.target);}catch(error){alert(error.message);}},true);
