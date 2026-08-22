import { createStore } from './store.js';

const store=createStore();
const DEFAULTS=[
  ['REIKI','Reiki'],['BACH','Florais de Bach'],['RADIONIC_TABLE','Mesa radiônica'],['CRYSTALS','Cristais']
];
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function configured(state){return state.settings?.complementaryTherapies||DEFAULTS.map(([id,name])=>({id,name,enabled:id==='REIKI'}));}
function enabledTherapies(state){return configured(state).filter(item=>item.enabled);}
function save(items){store.setState(state=>({...state,settings:{...state.settings,complementaryTherapies:items}}));}
function openSettings(){
 const items=configured(store.getState());const wrap=document.createElement('div');wrap.id='therapy-settings-overlay';wrap.className='modal-backdrop';
 wrap.innerHTML=`<section class="sheet"><div class="sheet-head"><div><p class="eyebrow">Meu espaço terapêutico</p><h2>Terapias complementares</h2></div><button class="close-btn" data-therapy-close>×</button></div><p class="muted">Radiestesia é o fluxo principal do Fluxa. Escolha quais terapias adicionais você utiliza para que elas apareçam na composição dos tratamentos.</p><div class="checklist">${items.map((x,i)=>`<label class="check-row"><input type="checkbox" data-therapy-index="${i}" ${x.enabled?'checked':''}><span>${esc(x.name)}</span></label>`).join('')}</div><div class="section"><form data-add-therapy class="form-grid"><div class="field"><label>Outra terapia</label><input name="name" placeholder="Ex.: Aromaterapia" required></div><button class="btn secondary wide">Adicionar à lista</button></form></div><div class="button-row"><button class="btn primary wide" data-therapy-save>Salvar preferências</button></div></section>`;document.body.appendChild(wrap);
}
function compositionBlock(){
 const items=enabledTherapies(store.getState());
 return `<section class="card therapy-composition" data-treatment-composition><div class="section-head"><div><p class="eyebrow">Composição terapêutica</p><h3>Radiestesia + terapias complementares</h3></div></div><div class="therapy-base"><strong>Radiestesia</strong><span>Fluxo principal desta sessão</span></div>${items.length?`<p class="muted">Deseja incluir alguma terapia complementar neste tratamento?</p><div class="checklist">${items.map(item=>`<label class="check-row"><input type="checkbox" data-treatment-therapy="${esc(item.id)}" value="${esc(item.name)}"><span>${esc(item.name)}</span></label>`).join('')}</div>`:`<p class="muted">Nenhuma terapia complementar está habilitada. Você pode configurar suas modalidades na tela Tratamentos.</p>`}</section>`;
}
function enhanceTreatmentComposition(){
 const form=document.querySelector('#treatment-form');if(!form||form.querySelector('[data-treatment-composition]'))return;
 const first=form.querySelector('[data-treatment-component-draft]')||form.querySelector('.field');if(!first)return;
 first.insertAdjacentHTML('beforebegin',compositionBlock());
}
function materializeSelectedTherapies(form){
 form.querySelectorAll('[data-complementary-component]').forEach(node=>node.remove());
 const selected=[...form.querySelectorAll('[data-treatment-therapy]:checked')];
 for(const input of selected){
  const section=document.createElement('section');section.hidden=true;section.dataset.complementaryComponent='true';
  section.innerHTML=`<input name="componentName" value="${esc(`Terapia complementar · ${input.value}`)}"><textarea name="instructions">Aplicação complementar integrada ao plano radiestésico.</textarea><input name="durationValue" value=""><select name="durationUnit"><option value="MINUTE" selected>minuto(s)</option></select>`;
  form.appendChild(section);
 }
}
function enhance(){
 const main=document.querySelector('main');
 if(main){const eyebrow=main.querySelector(':scope > .eyebrow')?.textContent?.trim();if(eyebrow==='Tratamentos'&&!main.querySelector('[data-therapy-settings]')){const b=document.createElement('button');b.className='btn ghost small';b.dataset.therapySettings='';b.textContent='Configurar terapias';main.querySelector(':scope > .lead')?.after(b);}}
 enhanceTreatmentComposition();
 document.querySelectorAll('[data-action="reiki-retro"]').forEach(b=>b.closest('.section')?.setAttribute('hidden',''));
 document.querySelectorAll('[data-action="reiki"]').forEach(b=>{if(!b.closest('[data-treatment-composition]'))b.setAttribute('hidden','');});
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.therapySettings!==undefined)openSettings();if(b.dataset.therapyClose!==undefined)b.closest('.modal-backdrop')?.remove();if(b.dataset.therapySave!==undefined){const overlay=b.closest('.modal-backdrop'),items=configured(store.getState()).map((x,i)=>({...x,enabled:!!overlay.querySelector(`[data-therapy-index="${i}"]`)?.checked}));save(items);overlay.remove();queueMicrotask(enhance);}if(b.type==='submit'&&b.closest('#treatment-form'))materializeSelectedTherapies(b.closest('#treatment-form'));},true);
document.addEventListener('submit',e=>{if(!e.target.matches('[data-add-therapy]'))return;e.preventDefault();const name=e.target.elements.name.value.trim();if(!name)return;const items=configured(store.getState());items.push({id:`CUSTOM_${Date.now()}`,name,enabled:true});save(items);e.target.closest('.modal-backdrop')?.remove();openSettings();});
