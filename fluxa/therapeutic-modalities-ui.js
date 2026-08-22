import { createStore } from './store.js';

const store = createStore();
let enhancing = false;

const BASE_MODALITY = { id:'RADIESTHESIA', label:'Radiestesia' };
const OPTIONAL_MODALITIES = [
  { id:'REIKI', label:'Aplicação de Reiki' },
  { id:'BACH_FLOWERS', label:'Florais de Bach' },
  { id:'CRYSTALS', label:'Cristais' },
  { id:'RADIONIC_TABLE', label:'Mesa radiônica' }
];

function esc(value='') {
  return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

export function modalitySettings(state) {
  const raw = state?.settings?.therapeuticModalities || {};
  return {
    enabled: Array.isArray(raw.enabled) ? raw.enabled.filter(Boolean) : [],
    custom: Array.isArray(raw.custom) ? raw.custom.map((item)=>String(item).trim()).filter(Boolean) : []
  };
}

export function configuredModalities(state) {
  const settings = modalitySettings(state);
  const enabled = OPTIONAL_MODALITIES.filter((item)=>settings.enabled.includes(item.id));
  const custom = settings.custom.map((label, index)=>({ id:`CUSTOM_${index}`, label }));
  return [BASE_MODALITY, ...enabled, ...custom];
}

function openConfig() {
  document.querySelector('#therapeutic-modalities-overlay')?.remove();
  const settings = modalitySettings(store.getState());
  const wrap = document.createElement('div');
  wrap.id = 'therapeutic-modalities-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet therapeutic-modalities-sheet">
    <div class="sheet-head"><div><p class="eyebrow">Seu modo de trabalhar</p><h2>Terapias disponíveis</h2></div><button class="close-btn" type="button" data-close-modalities>×</button></div>
    <p class="muted">Radiestesia é a base do fluxo terapêutico. Ative apenas as terapias complementares que você utiliza para que elas apareçam na composição dos tratamentos.</p>
    <form id="therapeutic-modalities-form" class="form-grid">
      <div class="modality-base-card"><span class="eyebrow">Base do Fluxa</span><strong>${BASE_MODALITY.label}</strong><small>Sempre disponível em sessão aberta.</small></div>
      <fieldset class="field"><legend>Terapias complementares</legend><div class="checklist">
        ${OPTIONAL_MODALITIES.map((item)=>`<label class="check-row"><input type="checkbox" name="enabledModality" value="${item.id}" ${settings.enabled.includes(item.id)?'checked':''}><span><strong>${item.label}</strong><small>Mostrar como opção ao compor um tratamento.</small></span></label>`).join('')}
      </div></fieldset>
      <div class="field"><label for="custom-modalities">Outras terapias <span class="muted">(opcional)</span></label><textarea id="custom-modalities" name="customModalities" placeholder="Uma terapia por linha">${esc(settings.custom.join('\n'))}</textarea><small class="muted">Ex.: Aromaterapia, cromoterapia ou outra prática que faça parte do seu atendimento.</small></div>
      <button class="btn primary wide" type="submit">Salvar terapias</button>
    </form>
  </section>`;
  document.body.appendChild(wrap);
}

function enhanceTreatmentsPage() {
  const main = document.querySelector('main');
  if (!main || main.querySelector(':scope > .eyebrow')?.textContent?.trim() !== 'Tratamentos') return;
  if (main.querySelector('[data-modality-settings-card]')) return;
  const modalities = configuredModalities(store.getState());
  const card = document.createElement('section');
  card.className = 'section modality-settings-card';
  card.dataset.modalitySettingsCard = 'true';
  card.innerHTML = `<div><p class="eyebrow">Composição terapêutica</p><h2>Radiestesia + terapias complementares</h2><p>${modalities.length > 1 ? `Ativas: ${esc(modalities.slice(1).map((item)=>item.label).join(', '))}.` : 'Nenhuma terapia complementar ativa. Você pode trabalhar somente com Radiestesia.'}</p></div><button class="btn secondary small" type="button" data-configure-modalities>Configurar</button>`;
  const lead = main.querySelector(':scope > .lead');
  (lead || main.firstElementChild)?.after(card);
}

function enhanceTreatmentForm() {
  const form = document.querySelector('#treatment-form');
  if (!form || form.querySelector('[data-treatment-modality-picker]')) return;
  const firstComponent = form.querySelector('[data-treatment-component-draft]');
  if (!firstComponent) return;
  const optional = configuredModalities(store.getState()).slice(1);
  const section = document.createElement('section');
  section.className = 'card treatment-modality-picker';
  section.dataset.treatmentModalityPicker = 'true';
  section.innerHTML = `<div class="section-head"><div><p class="eyebrow">Composição do tratamento</p><h3>Quais terapias farão parte?</h3></div></div>
    <div class="modality-base-card compact"><span class="eyebrow">Base</span><strong>Radiestesia</strong><small>Investigação e tratamento radiestésico vinculados à sessão.</small></div>
    ${optional.length ? `<fieldset class="field"><legend>Deseja incluir alguma terapia complementar?</legend><div class="checklist">${optional.map((item)=>`<label class="check-row"><input type="checkbox" name="treatmentModality" value="${esc(item.id)}" data-modality-label="${esc(item.label)}"><span><strong>${esc(item.label)}</strong><small>Adicionar ao plano deste tratamento.</small></span></label>`).join('')}</div></fieldset>` : `<div class="notice">Nenhuma terapia complementar está ativa no seu perfil. Você pode configurar isso em Tratamentos.</div>`}`;
  firstComponent.before(section);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { enhanceTreatmentsPage(); enhanceTreatmentForm(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);
store.subscribe(()=>queueMicrotask(enhance));

document.addEventListener('click',(event)=>{
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.configureModalities !== undefined) { openConfig(); return; }
  if (button.dataset.closeModalities !== undefined) { document.querySelector('#therapeutic-modalities-overlay')?.remove(); }
});

document.addEventListener('submit',(event)=>{
  const form = event.target;
  if (form.id !== 'therapeutic-modalities-form') return;
  event.preventDefault();
  const data = new FormData(form);
  const enabled = data.getAll('enabledModality').map(String);
  const custom = String(data.get('customModalities') || '').split(/\r?\n/).map((item)=>item.trim()).filter(Boolean);
  store.setState((state)=>{
    const draft = structuredClone(state);
    draft.settings = draft.settings || {};
    draft.settings.therapeuticModalities = { enabled, custom };
    return draft;
  });
  document.querySelector('#therapeutic-modalities-overlay')?.remove();
  document.querySelector('[data-modality-settings-card]')?.remove();
  queueMicrotask(enhance);
});
