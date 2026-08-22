import { createStore } from './store.js';
import { PROTOCOL_LIBRARY } from './protocol-engine.js';
import { ensureRootProtocolCatalog, rootProtocolCatalog } from './legacy-protocol-adapter.js';
import { registerWorkspaceView, rerenderWorkspace, currentWorkspaceRoute, openWorkspaceSettings } from './workspace-shell-ui.js';

const store = createStore();
const FAVORITES_KEY = 'fluxa.toolFavorites';
let section = 'home';
let rootsReady = false;
let resourceFilter = 'ALL';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function norm(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function activeAssisteds(state) {
  return (state.assistedEntities || []).filter((item) => !item.archivedAt).sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'pt-BR'));
}
function activeTools(state) {
  return (state.tools || []).filter((item) => !item.archivedAt).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
}
function favoriteIds() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); } catch (_) { return new Set(); }
}
function saveFavorites(ids) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids])); } catch (_) {}
}
function typeLabel(type) {
  return ({ PERSON:'Pessoa', PET:'PET', ENVIRONMENT:'Ambiente', GROUP:'Grupo', SITUATION:'Situação / Processo', OTHER:'Outro' })[type] || 'Assistido';
}
function toolTypeLabel(type) {
  return ({ GRAPH:'Gráfico', BIOMETER:'Biômetro', OTHER:'Outro recurso' })[type] || 'Recurso';
}
function modalities(state) {
  const raw = state?.settings?.therapeuticModalities || {};
  const enabled = Array.isArray(raw.enabled) ? raw.enabled : [];
  const custom = Array.isArray(raw.custom) ? raw.custom.map((value) => String(value).trim()).filter(Boolean) : [];
  const labels = new Map([
    ['REIKI', 'Aplicação de Reiki'],
    ['BACH_FLOWERS', 'Florais de Bach'],
    ['CRYSTALS', 'Cristais'],
    ['RADIONIC_TABLE', 'Mesa radiônica']
  ]);
  return [
    { id:'RADIESTHESIA', label:'Radiestesia', base:true },
    ...enabled.map((id) => ({ id, label:labels.get(id) || id, base:false })),
    ...custom.map((label, index) => ({ id:`CUSTOM_${index}`, label, base:false }))
  ];
}
function allProtocols() {
  const roots = rootsReady ? rootProtocolCatalog() : [];
  return [
    ...PROTOCOL_LIBRARY.map((item) => ({ ...item, source:'Fluxa' })),
    ...roots.map((item) => ({ ...item, source:'Biblioteca terapêutica' }))
  ];
}
function header(title, lead) {
  return `<div class="acervo-toolbar"><button type="button" class="btn ghost small acervo-back" data-acervo-back>← Acervo</button></div><p class="eyebrow">Acervo</p><h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p>`;
}
function searchBox(placeholder, target) {
  return `<div class="acervo-search section"><input type="search" data-acervo-search="${esc(target)}" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
}
function homeView(state) {
  const assistedCount = activeAssisteds(state).length;
  const toolCount = activeTools(state).length;
  const protocolCount = allProtocols().length;
  const therapyCount = modalities(state).length;
  return `<p class="eyebrow">Acervo</p><h1>Seu material de trabalho, organizado.</h1><p class="lead">Encontre pessoas, métodos e recursos sem misturar conteúdo terapêutico com configurações do app.</p>
    <div class="acervo-hero">${searchBox('Buscar no acervo', 'categories')}<div class="acervo-grid" data-acervo-category-grid>
      <button type="button" class="acervo-card" data-acervo-section="assisteds" data-acervo-search-text="assistidos pessoas pets ambientes grupos situações histórico"><div><strong>Assistidos</strong><span>Cadastros, continuidade e histórico longitudinal.</span></div><b>${assistedCount} ${assistedCount === 1 ? 'cadastrado' : 'cadastrados'}</b></button>
      <button type="button" class="acervo-card" data-acervo-section="protocols" data-acervo-search-text="protocolos investigação método causa raiz rápido completo"><div><strong>Protocolos</strong><span>Investigações rápidas, iniciais, completas e específicas.</span></div><b>${protocolCount} ${protocolCount === 1 ? 'protocolo' : 'protocolos'}</b></button>
      <button type="button" class="acervo-card" data-acervo-section="resources" data-acervo-search-text="gráficos recursos biômetros ferramentas biblioteca"><div><strong>Gráficos & Recursos</strong><span>Biblioteca operacional para selecionar durante o tratamento.</span></div><b>${toolCount} ${toolCount === 1 ? 'recurso' : 'recursos'}</b></button>
      <button type="button" class="acervo-card" data-acervo-section="therapies" data-acervo-search-text="terapias radiestesia reiki florais cristais mesa radiônica"><div><strong>Terapias</strong><span>Modalidades que fazem parte da sua prática.</span></div><b>${therapyCount} ${therapyCount === 1 ? 'terapia' : 'terapias'}</b></button>
    </div></div>`;
}
function assistedsView(state) {
  const items = activeAssisteds(state);
  return `${header('Assistidos', 'Cadastros e continuidade ficam no Acervo; durante a sessão o Fluxa continua pedindo o Assistido no contexto certo.')}${searchBox('Buscar assistido', 'assisteds')}<section class="section"><button class="btn primary wide" data-action="new-assisted">Novo assistido</button></section><section class="section acervo-list" data-acervo-list>${items.length ? items.map((item) => `<button type="button" class="acervo-row" data-assisted-detail="${esc(item.id)}" data-acervo-search-text="${esc(norm(`${item.displayName || ''} ${typeLabel(item.type)} ${item.details || ''}`))}"><span class="acervo-row-copy"><strong>${esc(item.displayName)}</strong><small>${esc(typeLabel(item.type))}</small></span><span class="muted">Ver histórico ›</span></button>`).join('') : '<div class="empty">Nenhum assistido cadastrado.</div>'}</section>`;
}
function protocolsView() {
  const items = allProtocols().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  return `${header('Protocolos', 'Consulte o acervo por nome, finalidade ou categoria. A escolha do protocolo para uma sessão continua acontecendo pelo fluxo de investigação.')}${searchBox('Buscar protocolo ou tema', 'protocols')}<section class="section acervo-list" data-acervo-list>${items.length ? items.map((item) => `<article class="protocol-row" data-acervo-search-text="${esc(norm(`${item.name || ''} ${item.category || ''} ${item.description || ''} ${(item.tags || []).join?.(' ') || item.tags || ''}`))}"><div class="protocol-row-copy"><strong>${esc(item.name)}</strong><small>${esc(item.category || 'Protocolo')} · ${esc(item.description || item.source || '')}</small></div><span class="resource-kind">${esc(item.source || 'Fluxa')}</span></article>`).join('') : `<div class="empty">${rootsReady ? 'Nenhum protocolo disponível.' : 'Carregando biblioteca terapêutica…'}</div>`}</section>`;
}
function resourcesView(state) {
  const items = activeTools(state);
  const favorites = favoriteIds();
  return `${header('Gráficos & Recursos', 'Use uma lista densa e pesquisável em vez de navegar por dezenas de cards grandes.')}${searchBox('Buscar por nome, finalidade ou tag', 'resources')}<div class="acervo-filter-chips" data-resource-filters><button type="button" class="acervo-chip ${resourceFilter === 'ALL' ? 'active' : ''}" data-resource-filter="ALL">Todos</button><button type="button" class="acervo-chip ${resourceFilter === 'GRAPH' ? 'active' : ''}" data-resource-filter="GRAPH">Gráficos</button><button type="button" class="acervo-chip ${resourceFilter === 'BIOMETER' ? 'active' : ''}" data-resource-filter="BIOMETER">Biômetros</button><button type="button" class="acervo-chip ${resourceFilter === 'FAVORITES' ? 'active' : ''}" data-resource-filter="FAVORITES">Favoritos</button></div><section class="section acervo-list" data-acervo-list>${items.length ? items.map((item) => `<article class="resource-row" data-resource-type="${esc(item.type || 'OTHER')}" data-resource-favorite="${favorites.has(item.id) ? 'true' : 'false'}" data-acervo-search-text="${esc(norm(`${item.name || ''} ${item.purpose || ''} ${item.notes || ''} ${(item.tags || []).join(' ')}`))}"><button type="button" class="resource-favorite ${favorites.has(item.id) ? 'active' : ''}" data-acervo-tool-favorite="${esc(item.id)}" aria-label="${favorites.has(item.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">★</button><div class="resource-row-copy"><strong>${esc(item.name)}</strong><small>${esc(item.purpose || ((item.tags || []).slice(0, 3).join(' · ')) || 'Recurso da biblioteca')}</small></div><span class="resource-kind">${esc(toolTypeLabel(item.type))}</span></article>`).join('') : '<div class="empty">Nenhum recurso cadastrado.</div>'}</section>`;
}
function therapiesView(state) {
  const items = modalities(state);
  return `${header('Terapias', 'Veja as modalidades disponíveis na prática. Alterações pertencem às Configurações, não ao conteúdo do Acervo.')}<section class="section acervo-list">${items.map((item) => `<article class="therapy-row"><div class="therapy-row-copy"><strong>${esc(item.label)}</strong><small>${item.base ? 'Base permanente do Fluxa' : 'Terapia complementar ativa'}</small></div><span class="resource-kind">${item.base ? 'BASE' : 'ATIVA'}</span></article>`).join('')}</section><section class="section"><button type="button" class="btn secondary wide" data-acervo-configure-therapies>Configurar terapias da prática</button></section>`;
}
function render(state) {
  if (section === 'assisteds') return assistedsView(state);
  if (section === 'protocols') return protocolsView();
  if (section === 'resources') return resourcesView(state);
  if (section === 'therapies') return therapiesView(state);
  return homeView(state);
}
registerWorkspaceView('acervo', render);

function applySearch(input) {
  const q = norm(input.value).trim();
  const view = input.closest('[data-workspace-view="acervo"]');
  if (!view) return;
  const target = input.dataset.acervoSearch;
  if (target === 'categories') {
    view.querySelectorAll('[data-acervo-section]').forEach((node) => {
      node.hidden = Boolean(q && !norm(node.dataset.acervoSearchText || node.textContent).includes(q));
    });
    return;
  }
  view.querySelectorAll('[data-acervo-list] [data-acervo-search-text]').forEach((node) => {
    const queryOk = !q || norm(node.dataset.acervoSearchText || node.textContent).includes(q);
    const typeOk = target !== 'resources' || resourceMatches(node);
    node.hidden = !(queryOk && typeOk);
  });
}
function resourceMatches(node) {
  if (resourceFilter === 'ALL') return true;
  if (resourceFilter === 'FAVORITES') return node.dataset.resourceFavorite === 'true';
  return node.dataset.resourceType === resourceFilter;
}
function reapplyResourceFilter() {
  const view = document.querySelector('[data-workspace-view="acervo"]');
  const input = view?.querySelector('[data-acervo-search="resources"]');
  if (input) applySearch(input);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.acervoSection) {
    section = button.dataset.acervoSection;
    rerenderWorkspace();
    return;
  }
  if (button.dataset.acervoBack !== undefined) {
    section = 'home';
    resourceFilter = 'ALL';
    rerenderWorkspace();
    return;
  }
  if (button.dataset.resourceFilter) {
    resourceFilter = button.dataset.resourceFilter;
    button.closest('[data-resource-filters]')?.querySelectorAll('[data-resource-filter]').forEach((item) => item.classList.toggle('active', item === button));
    reapplyResourceFilter();
    return;
  }
  if (button.dataset.acervoToolFavorite) {
    const favorites = favoriteIds();
    const id = button.dataset.acervoToolFavorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites(favorites);
    const row = button.closest('[data-resource-favorite]');
    const active = favorites.has(id);
    button.classList.toggle('active', active);
    button.setAttribute('aria-label', active ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    if (row) row.dataset.resourceFavorite = String(active);
    reapplyResourceFilter();
    return;
  }
  if (button.dataset.acervoConfigureTherapies !== undefined) openWorkspaceSettings();
}, true);

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-acervo-search]')) applySearch(event.target);
}, true);

ensureRootProtocolCatalog().then(() => {
  rootsReady = true;
  if (currentWorkspaceRoute() === 'acervo' && section === 'protocols') rerenderWorkspace();
}).catch(() => {
  rootsReady = true;
});
