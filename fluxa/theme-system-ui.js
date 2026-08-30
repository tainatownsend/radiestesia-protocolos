import { createStore } from './store.js';

const store=createStore();
const THEMES=new Set(['FRESH_ENERGY','MORNING_LIGHT','GENTLE_FLOW']);
const DEFAULT_THEME='FRESH_ENERGY';
let previewTheme=null;

function currentTheme(state=store.getState()){
  const value=state?.settings?.appearance?.theme;
  return THEMES.has(value)?value:DEFAULT_THEME;
}
function applyTheme(theme){
  const safe=THEMES.has(theme)?theme:DEFAULT_THEME;
  document.documentElement.dataset.fluxaTheme=safe;
}
function ensureStyles(){
  if(document.querySelector('link[href="theme-system.css"]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='theme-system.css';document.head.appendChild(link);
}
function option(value,label,description,swatches,isDefault=false){
  return `<label class="theme-option"><input type="radio" name="fluxaTheme" value="${value}" ${currentTheme()===value?'checked':''}><span class="theme-swatches">${swatches.map((color)=>`<i style="background:${color}"></i>`).join('')}</span><span><strong>${label}</strong>${isDefault?'<span class="theme-default-badge">Padrão</span>':''}<small>${description}</small></span></label>`;
}
function enhanceSettings(){
  const form=document.querySelector('#workspace-settings-form');
  if(!form||form.querySelector('[data-theme-settings]'))return;
  const group=document.createElement('section');group.className='workspace-settings-group';group.dataset.themeSettings='true';
  group.innerHTML=`<p class="eyebrow">Aparência</p><h3>Tema do Fluxa</h3><p class="muted">Escolha a energia visual da interface. O conteúdo e o fluxo terapêutico não mudam.</p><div class="theme-picker">${option('FRESH_ENERGY','Fresh Energy','Fresca, otimista e contemporânea.',['#24A79A','#C8F1E8','#FFF0B9','#F08D79'],true)}${option('MORNING_LIGHT','Morning Light','Serena, solar e acolhedora.',['#4E8C80','#D8EEE4','#FFFAF0','#EE9B7D'])}${option('GENTLE_FLOW','Gentle Flow','Fluida, delicada e contemplativa.',['#5B9DA0','#D7EFF0','#EEE4F3','#EFAA91'])}</div>`;
  const dataGroup=[...form.querySelectorAll('.workspace-settings-group')].find((node)=>/Dados e privacidade/i.test(node.textContent||''));
  dataGroup?.before(group) || form.prepend(group);
}
function enhance(){ensureStyles();applyTheme(previewTheme||currentTheme());enhanceSettings();}

ensureStyles();applyTheme(currentTheme());
new MutationObserver(()=>queueMicrotask(enhance)).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);
store.subscribe(()=>{if(!previewTheme)applyTheme(currentTheme());});

document.addEventListener('change',(event)=>{
  if(event.target.matches('input[name="fluxaTheme"]')){
    previewTheme=THEMES.has(event.target.value)?event.target.value:DEFAULT_THEME;
    applyTheme(previewTheme);
  }
},true);

document.addEventListener('click',(event)=>{
  if(event.target.closest('[data-close-workspace-settings]')){
    previewTheme=null;queueMicrotask(()=>applyTheme(currentTheme()));
  }
},true);

document.addEventListener('submit',(event)=>{
  const form=event.target;if(form.id!=='workspace-settings-form')return;
  const data=new FormData(form);const chosen=String(data.get('fluxaTheme')||DEFAULT_THEME);
  const theme=THEMES.has(chosen)?chosen:DEFAULT_THEME;
  store.setState((state)=>{const draft=structuredClone(state);draft.settings=draft.settings||{};draft.settings.appearance=draft.settings.appearance||{};draft.settings.appearance.theme=theme;return draft;});
  previewTheme=null;applyTheme(theme);
},true);
