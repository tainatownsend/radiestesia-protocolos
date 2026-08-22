import { createStore } from './store.js';

const store=createStore();
let enhancing=false;
const BASE={id:'RADIESTHESIA',label:'Radiestesia'};
const OPTIONAL=[
  {id:'REIKI',label:'Aplicação de Reiki'},
  {id:'BACH_FLOWERS',label:'Florais de Bach'},
  {id:'CRYSTALS',label:'Cristais'},
  {id:'RADIONIC_TABLE',label:'Mesa radiônica'}
];
const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export function modalitySettings(state){
  const raw=state?.settings?.therapeuticModalities||{};
  return {
    enabled:Array.isArray(raw.enabled)?raw.enabled.filter(Boolean):[],
    custom:Array.isArray(raw.custom)?raw.custom.map(v=>String(v).trim()).filter(Boolean):[]
  };
}
export function configuredModalities(state){
  const settings=modalitySettings(state);
  return [BASE,...OPTIONAL.filter(item=>settings.enabled.includes(item.id)),...settings.custom.map((label,index)=>({id:`CUSTOM_${index}`,label}))];
}

function openConfig(){
  document.querySelector('#therapeutic-modalities-overlay')?.remove();
  const settings=modalitySettings(store.getState());
  const wrap=document.createElement('div');wrap.id='therapeutic-modalities-overlay';wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="sheet therapeutic-modalities-sheet"><div class="sheet-head"><div><p class="eyebrow">Seu modo de trabalhar</p><h2>Terapias disponíveis</h2></div><button class="close-btn" type="button" data-close-modalities>×</button></div><p class="muted">Radiestesia é a base do fluxo terapêutico. Ative somente as terapias complementares que você utiliza.</p><form id="therapeutic-modalities-form" class="form-grid"><div class="modality-base-card"><span class="eyebrow">Base do Fluxa</span><strong>Radiestesia</strong><small>Sempre disponível no tratamento.</small></div><fieldset class="field"><legend>Terapias complementares</legend><div class="checklist">${OPTIONAL.map(item=>`<label class="check-row"><input type="checkbox" name="enabledModality" value="${item.id}" ${settings.enabled.includes(item.id)?'checked':''}><span><strong>${item.label}</strong><small>Mostrar como opção ao compor tratamentos.</small></span></label>`).join('')}</div></fieldset><div class="field"><label for="custom-modalities">Outras terapias <span class="muted">(opcional)</span></label><textarea id="custom-modalities" name="customModalities" placeholder="Uma terapia por linha">${esc(settings.custom.join('\n'))}</textarea></div><button class="btn primary wide" type="submit">Salvar terapias</button></form></section>`;
  document.body.appendChild(wrap);
}
function enhanceTreatmentsPage(){
  const main=document.querySelector('main');if(!main||main.querySelector(':scope > .eyebrow')?.textContent?.trim()!=='Tratamentos'||main.querySelector('[data-modality-settings-card]'))return;
  const configured=configuredModalities(store.getState()).slice(1);
  const card=document.createElement('section');card.className='section modality-settings-card';card.dataset.modalitySettingsCard='true';
  card.innerHTML=`<div><p class="eyebrow">Composição terapêutica</p><h2>Radiestesia + terapias complementares</h2><p>${configured.length?`Ativas: ${esc(configured.map(item=>item.label).join(', '))}.`:'Nenhuma terapia complementar ativa. Você pode trabalhar somente com Radiestesia.'}</p></div><button class="btn secondary small" type="button" data-configure-modalities>Configurar</button>`;
  main.querySelector(':scope > .lead')?.after(card);
}
function enhanceTreatmentForm(){
  const form=document.querySelector('#treatment-form');if(!form||form.querySelector('[data-treatment-modality-picker]'))return;
  const items=form.querySelector('[data-treatment-items]');if(!items)return;
  const optional=configuredModalities(store.getState()).slice(1);
  const section=document.createElement('section');section.className='card treatment-modality-picker';section.dataset.treatmentModalityPicker='true';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">Composição do tratamento</p><h3>Quais terapias farão parte?</h3></div></div><div class="modality-base-card compact"><span class="eyebrow">Base</span><strong>Radiestesia</strong><small>Os itens, comandos e gráficos abaixo formam o tratamento radiestésico.</small></div>${optional.length?`<fieldset class="field"><legend>Deseja incluir alguma terapia complementar?</legend><div class="checklist">${optional.map(item=>`<label class="check-row"><input type="checkbox" name="treatmentModality" value="${esc(item.id)}" data-modality-label="${esc(item.label)}"><span><strong>${esc(item.label)}</strong><small>Adicionar à composição deste tratamento.</small></span></label>`).join('')}</div></fieldset>`:`<div class="notice">Nenhuma terapia complementar está ativa no seu perfil. Este tratamento será composto apenas por Radiestesia.</div>`}`;
  items.before(section);
}
function enhanceTreatmentCards(){
  const state=store.getState();
  document.querySelectorAll('.treatment-card[data-treatment-id]').forEach(card=>{
    const treatment=state.treatments.find(item=>item.id===card.dataset.treatmentId);if(!treatment)return;
    const snapshots=Array.isArray(treatment.modalitySnapshots)?treatment.modalitySnapshots:[];
    let summary=card.querySelector('[data-modality-summary]');
    if(!snapshots.length){summary?.remove();return;}
    if(!summary){summary=document.createElement('div');summary.className='modality-summary';summary.dataset.modalitySummary='true';const target=card.querySelector('.button-row');card.insertBefore(summary,target||null);}
    summary.innerHTML=snapshots.map(item=>`<span class="modality-chip">${esc(item.label||item.id)}</span>`).join('');
  });
}
function enhance(){if(enhancing)return;enhancing=true;try{enhanceTreatmentsPage();enhanceTreatmentForm();enhanceTreatmentCards();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);store.subscribe(()=>queueMicrotask(enhance));
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.configureModalities!==undefined){openConfig();return;}if(b.dataset.closeModalities!==undefined)document.querySelector('#therapeutic-modalities-overlay')?.remove();});
document.addEventListener('submit',event=>{const form=event.target;if(form.id!=='therapeutic-modalities-form')return;event.preventDefault();const data=new FormData(form),enabled=data.getAll('enabledModality').map(String),custom=String(data.get('customModalities')||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);store.setState(state=>{const draft=structuredClone(state);draft.settings=draft.settings||{};draft.settings.therapeuticModalities={enabled,custom};return draft;});document.querySelector('#therapeutic-modalities-overlay')?.remove();document.querySelector('[data-modality-settings-card]')?.remove();queueMicrotask(enhance);});
