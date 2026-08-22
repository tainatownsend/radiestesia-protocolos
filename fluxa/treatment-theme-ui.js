import { ensureTreatmentThemeLibrary,treatmentThemeById } from './treatment-theme-library.js';

let enhancing=false;
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));}
function normalize(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function enhanceTreatmentForm(){
  const form=document.querySelector('#treatment-form');if(!form||form.dataset.themeLibraryEnhanced)return;
  const first=form.querySelector('[data-treatment-component-draft]');if(!first)return;
  form.dataset.themeLibraryEnhanced='true';
  const panel=document.createElement('section');panel.className='treatment-theme-entry';panel.innerHTML='<div><p class="eyebrow">Tratamento por tema</p><strong>Comece de uma sugestão terapêutica</strong><span>Use os comandos da biblioteca original como ponto de partida e ajuste antes de salvar.</span></div><button type="button" class="btn secondary" data-open-treatment-theme>Ver sugestões</button>';
  first.before(panel);
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceTreatmentForm();}finally{enhancing=false;}}
new MutationObserver(()=>queueMicrotask(enhance)).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

function renderPicker(items){
  const themes=[...new Set(items.map(item=>item.theme))];
  const wrap=document.createElement('div');wrap.id='treatment-theme-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet treatment-theme-sheet"><div class="sheet-head"><div><p class="eyebrow">Tratamentos por tema</p><h2>Escolha um ponto de partida</h2><p class="muted">Sugestões da biblioteca terapêutica original. Tudo continua editável.</p></div><button class="close-btn" data-close-treatment-theme>×</button></div><label class="field"><span>Buscar sugestão</span><input type="search" data-treatment-theme-search placeholder="Ex.: prosperidade, carreira, autoestima…"></label><div class="theme-chips"><button type="button" class="theme-chip active" data-treatment-theme-filter="">Todos</button>${themes.map(theme=>`<button type="button" class="theme-chip" data-treatment-theme-filter="${esc(theme)}">${esc(theme)}</button>`).join('')}</div><div class="treatment-theme-list">${items.map(item=>`<article class="treatment-theme-card" data-treatment-theme-card data-theme="${esc(item.theme)}" data-search="${esc(normalize(`${item.title} ${item.command} ${item.theme}`))}"><div><p class="eyebrow">${esc(item.theme)}</p><h3>${esc(item.title)}</h3><p>${esc(item.command)}</p></div><button type="button" class="btn secondary" data-apply-treatment-theme="${esc(item.id)}">Usar sugestão</button></article>`).join('')}</div><div class="empty" data-treatment-theme-empty hidden>Nenhuma sugestão encontrada.</div></section>`;
  document.body.appendChild(wrap);
}
function filterPicker(overlay){
  const query=normalize(overlay.querySelector('[data-treatment-theme-search]')?.value||'');
  const theme=overlay.querySelector('[data-treatment-theme-filter].active')?.dataset.treatmentThemeFilter||'';
  let visible=0;overlay.querySelectorAll('[data-treatment-theme-card]').forEach(card=>{const show=(!query||card.dataset.search.includes(query))&&(!theme||card.dataset.theme===theme);card.hidden=!show;if(show)visible++;});
  overlay.querySelector('[data-treatment-theme-empty]')?.toggleAttribute('hidden',visible>0);
}
function targetComponent(form){
  let sections=[...form.querySelectorAll('[data-treatment-component-draft]')];
  let section=sections.find(s=>!s.querySelector('[name="componentName"]')?.value&&!s.querySelector('[name="instructions"]')?.value);
  if(section)return section;
  form.querySelector('[data-add-treatment-component-draft]')?.click();sections=[...form.querySelectorAll('[data-treatment-component-draft]')];return sections.at(-1)||null;
}
function applySuggestion(item){
  const form=document.querySelector('#treatment-form');if(!form||!item)return;
  const title=form.querySelector('[name="title"]');if(title&&!title.value)title.value=item.title;
  const section=targetComponent(form);if(!section)return;
  const name=section.querySelector('[name="componentName"]'),instructions=section.querySelector('[name="instructions"]');if(name)name.value=item.title;if(instructions)instructions.value=item.command;
  form.dataset.treatmentTheme=item.theme;form.dataset.treatmentThemeSource=item.sourcePath;form.dataset.treatmentThemeSuggestion=item.id;
  let notice=form.querySelector('.treatment-theme-applied');if(!notice){notice=document.createElement('div');notice.className='notice treatment-theme-applied';form.prepend(notice);}notice.innerHTML=`<strong>Sugestão aplicada · ${esc(item.theme)}</strong><span>Revise o comando, escolha o gráfico/recurso e defina a duração apenas se fizer sentido.</span>`;
  section.scrollIntoView({behavior:'smooth',block:'center'});
}

document.addEventListener('input',event=>{if(event.target.matches('[data-treatment-theme-search]'))filterPicker(event.target.closest('#treatment-theme-overlay'));});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.openTreatmentTheme!==undefined){button.disabled=true;try{const items=await ensureTreatmentThemeLibrary();document.querySelector('#treatment-theme-overlay')?.remove();renderPicker(items);}catch(error){alert(error.message);}finally{button.disabled=false;}return;}
  if(button.dataset.closeTreatmentTheme!==undefined){document.querySelector('#treatment-theme-overlay')?.remove();return;}
  if(button.dataset.treatmentThemeFilter!==undefined){const overlay=button.closest('#treatment-theme-overlay');overlay?.querySelectorAll('[data-treatment-theme-filter]').forEach(x=>x.classList.toggle('active',x===button));filterPicker(overlay);return;}
  if(button.dataset.applyTreatmentTheme){const item=treatmentThemeById(button.dataset.applyTreatmentTheme);document.querySelector('#treatment-theme-overlay')?.remove();applySuggestion(item);return;}
},true);
