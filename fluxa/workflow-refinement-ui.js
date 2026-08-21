import { createStore } from './store.js';
import { treatmentNeedsReview } from './domain.js';

const store = createStore();
let enhancing = false;
function readTreatmentFilter(){try{return sessionStorage.getItem('fluxa.treatment.filter')||'ACTIVE';}catch(_){return 'ACTIVE';}}
function saveTreatmentFilter(value){try{sessionStorage.setItem('fluxa.treatment.filter',value);}catch(_){}}
let treatmentFilter = readTreatmentFilter();
let assistedSearch = '';
let assistedType = 'ALL';

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function ensureTreatmentFilters() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('[data-treatment-filters]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Tratamentos') return;
  const firstSection = main.querySelector('.section');
  const filter = document.createElement('section');
  filter.className = 'section';
  filter.dataset.treatmentFilters = 'true';
  filter.innerHTML = `<div class="button-row" role="group" aria-label="Filtrar tratamentos">
    <button class="btn ${treatmentFilter === 'ACTIVE' ? 'primary' : 'ghost'} small" data-treatment-filter="ACTIVE">Ativos</button>
    <button class="btn ${treatmentFilter === 'REVIEW' ? 'primary' : 'ghost'} small" data-treatment-filter="REVIEW">Para revisão</button>
    <button class="btn ${treatmentFilter === 'PLANNED' ? 'primary' : 'ghost'} small" data-treatment-filter="PLANNED">Planejados</button>
    <button class="btn ${treatmentFilter === 'COMPLETED' ? 'primary' : 'ghost'} small" data-treatment-filter="COMPLETED">Concluídos</button>
    <button class="btn ${treatmentFilter === 'ALL' ? 'primary' : 'ghost'} small" data-treatment-filter="ALL">Todos</button>
  </div>`;
  firstSection?.after(filter);
}

function applyTreatmentFilter() {
  const state = store.getState();
  const cards = [...document.querySelectorAll('.treatment-card[data-treatment-id]')];
  cards.forEach((card) => {
    const treatment = state.treatments.find((item) => item.id === card.dataset.treatmentId);
    if (!treatment) { card.hidden = true; return; }
    const show = treatmentFilter === 'ALL'
      || (treatmentFilter === 'ACTIVE' && ['IN_PROGRESS','INTERRUPTED'].includes(treatment.status))
      || (treatmentFilter === 'REVIEW' && treatmentNeedsReview(state, treatment))
      || (treatmentFilter === 'PLANNED' && treatment.status === 'PLANNED')
      || (treatmentFilter === 'COMPLETED' && treatment.status === 'COMPLETED');
    card.hidden = !show;
  });
  const stack = cards[0]?.parentElement;
  if (stack) {
    let empty = stack.querySelector('[data-filter-empty]');
    const visible = cards.some((card) => !card.hidden);
    if (!visible && cards.length) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty';
        empty.dataset.filterEmpty = 'true';
        stack.appendChild(empty);
      }
      const copy = { ACTIVE:'Nenhum tratamento ativo.', REVIEW:'Nenhum tratamento disponível para revisão.', PLANNED:'Nenhum tratamento planejado.', COMPLETED:'Nenhum tratamento concluído.', ALL:'Nenhum tratamento.' };
      empty.textContent = copy[treatmentFilter] || 'Nenhum tratamento.';
    } else empty?.remove();
  }
}

function ensureAssistedFilters() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('[data-assisted-filters]')) return;
  if (main.querySelector('.eyebrow')?.textContent?.trim() !== 'Assistidos') return;
  const list = main.querySelector('.assisted-list');
  if (!list) return;
  const section = document.createElement('section');
  section.className = 'section form-grid';
  section.dataset.assistedFilters = 'true';
  section.innerHTML = `<div class="field"><label for="assisted-search">Buscar assistido</label><input id="assisted-search" type="search" data-assisted-search placeholder="Nome ou identificação" value="${esc(assistedSearch)}"></div><div class="field"><label for="assisted-type">Tipo</label><select id="assisted-type" data-assisted-type><option value="ALL">Todos</option><option value="PERSON">Pessoa</option><option value="PET">PET</option><option value="ENVIRONMENT">Ambiente</option><option value="GROUP">Grupo</option><option value="SITUATION">Situação / Processo</option><option value="OTHER">Outro</option></select></div>`;
  list.before(section);
  section.querySelector('[data-assisted-type]').value = assistedType;
}

function applyAssistedFilters() {
  const state = store.getState();
  document.querySelectorAll('.assisted-row[data-assisted-detail]').forEach((row) => {
    const assisted = state.assistedEntities.find((item) => item.id === row.dataset.assistedDetail);
    if (!assisted) { row.hidden = true; return; }
    const haystack = `${assisted.displayName || ''} ${assisted.identifier || ''}`.toLocaleLowerCase('pt-BR');
    const matchesText = !assistedSearch || haystack.includes(assistedSearch.toLocaleLowerCase('pt-BR'));
    const matchesType = assistedType === 'ALL' || assisted.type === assistedType;
    row.hidden = !(matchesText && matchesType);
  });
}

function enhanceAssistedLongitudinalDetail() {
  const detail = document.querySelector('.detail-sheet');
  const id = detail?.querySelector('[data-assisted-edit]')?.dataset.assistedEdit || detail?.querySelector('[data-assisted-archive]')?.dataset.assistedArchive;
  if (!detail || !id || detail.querySelector('[data-longitudinal-summary]')) return;
  const state = store.getState();
  const treatments = state.treatments.filter((item) => item.assistedEntityId === id);
  const assessments = state.assessments.filter((item) => item.assistedEntityId === id).sort((a,b) => String(b.occurredAt || b.createdAt || '').localeCompare(String(a.occurredAt || a.createdAt || '')));
  const reiki = state.reikiApplications.filter((item) => item.assistedEntityId === id && item.status === 'COMPLETED').sort((a,b) => String(b.endedAt || b.createdAt || '').localeCompare(String(a.endedAt || a.createdAt || '')));
  const summary = document.createElement('section');
  summary.className = 'section card soft';
  summary.dataset.longitudinalSummary = 'true';
  const active = treatments.filter((item) => ['IN_PROGRESS','INTERRUPTED','PLANNED'].includes(item.status)).length;
  const completed = treatments.filter((item) => item.status === 'COMPLETED').length;
  const latestAssessment = assessments[0];
  summary.innerHTML = `<p class="eyebrow">Visão longitudinal</p><div class="metric-grid"><div class="metric"><strong>${active}</strong><span>processos atuais</span></div><div class="metric"><strong>${completed}</strong><span>tratamentos concluídos</span></div><div class="metric"><strong>${reiki.length}</strong><span>aplicações de Reiki</span></div><div class="metric"><strong>${assessments.length}</strong><span>avaliações</span></div></div>${latestAssessment ? `<p class="muted"><strong>Última avaliação:</strong> ${esc(latestAssessment.subject || 'Avaliação')} · ${esc(latestAssessment.result || '')}${latestAssessment.scale ? ` ${esc(latestAssessment.scale)}` : ''}</p>` : ''}`;
  const timelineSection = [...detail.querySelectorAll('.section')].find((section) => section.querySelector('h3')?.textContent === 'Histórico longitudinal');
  timelineSection?.before(summary);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureTreatmentFilters();
    applyTreatmentFilter();
    ensureAssistedFilters();
    applyAssistedFilters();
    enhanceAssistedLongitudinalDetail();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(enhance).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-treatment-filter]');
  if (!button) return;
  const requested=button.dataset.treatmentFilter;
  treatmentFilter=['ACTIVE','REVIEW','PLANNED','COMPLETED','ALL'].includes(requested)?requested:'ACTIVE';
  saveTreatmentFilter(treatmentFilter);
  document.querySelector('[data-treatment-filters]')?.remove();
  enhance();
}, true);

document.addEventListener('input', (event) => {
  if (!event.target.matches('[data-assisted-search]')) return;
  assistedSearch = event.target.value;
  applyAssistedFilters();
}, true);

document.addEventListener('change', (event) => {
  if (!event.target.matches('[data-assisted-type]')) return;
  assistedType = event.target.value;
  applyAssistedFilters();
}, true);
