import { createStore } from './store.js';

const store = createStore();
const renderers = new Map();
const CUSTOM_ROUTES = new Set(['history', 'acervo']);
const ROUTE_KEY = 'fluxa.workspaceRoute';
let activeWorkspaceRoute = readWorkspaceRoute();
let enhancing = false;

function readWorkspaceRoute() {
  try {
    const value = sessionStorage.getItem(ROUTE_KEY);
    return CUSTOM_ROUTES.has(value) ? value : null;
  } catch (_) {
    return null;
  }
}
function saveWorkspaceRoute(value) {
  try {
    if (value) sessionStorage.setItem(ROUTE_KEY, value);
    else sessionStorage.removeItem(ROUTE_KEY);
  } catch (_) {}
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function timeValue(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}
function fmtDateTime(value) {
  const time = timeValue(value);
  if (time == null) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(time));
}
function duration(session) {
  const start = timeValue(session?.startedAt);
  const end = session?.endedAt ? timeValue(session.endedAt) : Date.now();
  if (start == null || end == null) return '—';
  const mins = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest} min`;
}
function activeBaseRoute() {
  const active = document.querySelector('.bottom-nav .nav-btn.active[data-route]');
  return active?.dataset.route || 'today';
}
function navIcon(route) {
  const paths = {
    today:'<path d="M4 10.5 12 4l8 6.5V20H7v-7h10v7"/>',
    treatments:'<path d="M5 18.5c2.3-5.8 6.8-9.3 14-10.7-1.2 6.4-4.8 10.6-10.9 12"/><path d="M7.8 16.2c2.3-2.4 4.9-4.5 7.8-6.2"/>',
    history:'<path d="M12 5a7 7 0 1 1-6.2 3.7"/><path d="M4 5v4h4M12 8v4l3 2"/>',
    acervo:'<path d="M4.5 5.5h6.7c1.2 0 2.2 1 2.2 2.2V20c0-1.4-1.1-2.5-2.5-2.5H4.5z"/><path d="M19.5 5.5h-6.7c-1.2 0-2.2 1-2.2 2.2V20c0-1.4 1.1-2.5 2.5-2.5h6.4z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[route] || ''}</svg>`;
}
function effectiveRoute() {
  if (activeWorkspaceRoute) return activeWorkspaceRoute;
  const base = activeBaseRoute();
  return ['assisted', 'library'].includes(base) ? 'acervo' : base;
}
function ensureWorkspaceNav() {
  const root = document.querySelector('#app');
  const bridge = root?.querySelector('.bottom-nav');
  if (!root || !bridge) return;
  let nav = root.querySelector('[data-workspace-nav-shell]');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'workspace-bottom-nav';
    nav.dataset.workspaceNavShell = 'true';
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.innerHTML = [
      ['today', 'Hoje'],
      ['treatments', 'Tratamentos'],
      ['history', 'Histórico'],
      ['acervo', 'Acervo']
    ].map(([route, label]) => `<button type="button" class="workspace-nav-btn" data-workspace-route="${route}">${navIcon(route)}<span>${label}</span></button>`).join('');
    bridge.after(nav);
  }
  const current = effectiveRoute();
  nav.querySelectorAll('[data-workspace-route]').forEach((button) => {
    const active = button.dataset.workspaceRoute === current;
    button.classList.toggle('active', active);
    button.toggleAttribute('aria-current', active);
  });
  document.body.classList.add('workspace-shell-ready');
}
function settingsIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>';
}
function ensureSettingsButton() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('[data-open-workspace-settings]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'workspace-settings-button';
  button.dataset.openWorkspaceSettings = 'true';
  button.setAttribute('aria-label', 'Configurações');
  button.innerHTML = settingsIcon();
  topbar.appendChild(button);
}
function removeLibraryPreferences() {
  document.querySelectorAll('[data-modality-settings-card]').forEach((node) => node.remove());
}
function placeholderAcervo() {
  return `<p class="eyebrow">Acervo</p><h1>Seu material de trabalho, organizado.</h1><p class="lead">Assistidos, protocolos, gráficos, recursos e terapias ficam aqui. As configurações da prática agora vivem separadamente no ícone de ajustes.</p><section class="section empty">Organizando o acervo…</section>`;
}
function historyView(state) {
  const sessions = [...(state.sessions || [])].sort((a, b) => (timeValue(b.startedAt) || 0) - (timeValue(a.startedAt) || 0));
  return `<p class="eyebrow">Histórico</p><h1>Sessões e registros.</h1><p class="lead">Consulte sessões anteriores, abra a linha do tempo e gere relatórios sem misturar histórico com o trabalho de hoje.</p>
    <section class="section workspace-history-list">${sessions.length ? sessions.map((session) => {
      const events = (state.events || []).filter((event) => event.sessionId === session.id);
      const assistedIds = new Set(events.map((event) => event.assistedEntityId).filter(Boolean));
      const names = [...assistedIds].map((id) => state.assistedEntities.find((item) => item.id === id)?.displayName).filter(Boolean);
      return `<article class="workspace-history-row"><div><p class="eyebrow">${session.status === 'CLOSED' ? 'Encerrada' : 'Em andamento'}</p><h2>${esc(fmtDateTime(session.startedAt))}</h2><p class="muted">${esc(duration(session))}${names.length ? ` · ${esc(names.join(', '))}` : ''} · ${events.length} ${events.length === 1 ? 'registro' : 'registros'}</p></div><div class="workspace-row-actions"><button class="btn secondary small" data-open-session-history="${esc(session.id)}">Abrir</button>${session.status === 'CLOSED' ? `<button class="btn ghost small" data-session-report="${esc(session.id)}">Relatório</button>` : ''}</div></article>`;
    }).join('') : '<div class="empty">Nenhuma sessão registrada ainda.</div>'}</section>`;
}
renderers.set('history', historyView);
renderers.set('acervo', placeholderAcervo);

export function registerWorkspaceView(route, renderer) {
  if (!CUSTOM_ROUTES.has(route) || typeof renderer !== 'function') return;
  renderers.set(route, renderer);
  if (activeWorkspaceRoute === route) renderWorkspace(true);
}
export function currentWorkspaceRoute() {
  return activeWorkspaceRoute;
}
export function rerenderWorkspace() {
  if (activeWorkspaceRoute) renderWorkspace(true);
}
export function navigateWorkspace(route) {
  if (route === 'today' || route === 'treatments') {
    activeWorkspaceRoute = null;
    saveWorkspaceRoute(null);
    document.querySelector('[data-workspace-view]')?.remove();
    const baseMain = document.querySelector('#app > main:not([data-workspace-view])');
    if (baseMain) baseMain.hidden = false;
    document.querySelector(`.bottom-nav [data-route="${CSS.escape(route)}"]`)?.click();
    queueMicrotask(ensureWorkspaceNav);
    return;
  }
  if (!CUSTOM_ROUTES.has(route)) return;
  activeWorkspaceRoute = route;
  saveWorkspaceRoute(route);
  renderWorkspace(true);
}
function renderWorkspace(force = false) {
  if (!activeWorkspaceRoute) return;
  const root = document.querySelector('#app');
  const bridge = root?.querySelector('.bottom-nav');
  const baseMain = root?.querySelector('main:not([data-workspace-view])');
  if (!root || !bridge || !baseMain) return;
  let current = root.querySelector('[data-workspace-view]');
  if (current && !force && current.dataset.workspaceView === activeWorkspaceRoute) return;
  current?.remove();
  baseMain.hidden = true;
  const main = document.createElement('main');
  main.dataset.workspaceView = activeWorkspaceRoute;
  main.className = 'workspace-view';
  const renderer = renderers.get(activeWorkspaceRoute);
  main.innerHTML = renderer ? renderer(store.getState()) : '<div class="empty">Conteúdo indisponível.</div>';
  bridge.before(main);
  ensureWorkspaceNav();
}
function settingsState(state) {
  const raw = state?.settings?.therapeuticModalities || {};
  return {
    enabled:Array.isArray(raw.enabled) ? raw.enabled : [],
    custom:Array.isArray(raw.custom) ? raw.custom.map((value) => String(value).trim()).filter(Boolean) : []
  };
}
export function openWorkspaceSettings() {
  document.querySelector('#workspace-settings-overlay')?.remove();
  const settings = settingsState(store.getState());
  const options = [
    ['REIKI', 'Aplicação de Reiki'],
    ['BACH_FLOWERS', 'Florais de Bach'],
    ['CRYSTALS', 'Cristais'],
    ['RADIONIC_TABLE', 'Mesa radiônica']
  ];
  const wrap = document.createElement('div');
  wrap.id = 'workspace-settings-overlay';
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="sheet workspace-settings-sheet"><div class="sheet-head"><div><p class="eyebrow">Configurações</p><h2>Como você trabalha</h2></div><button class="close-btn" type="button" data-close-workspace-settings>×</button></div><p class="muted">Configurações definem o comportamento do Fluxa. O conteúdo terapêutico permanece no Acervo.</p><form id="workspace-settings-form" class="form-grid"><section class="workspace-settings-group"><p class="eyebrow">Minha prática</p><h3>Terapias disponíveis</h3><div class="workspace-base-modality"><strong>Radiestesia</strong><span>Sempre disponível como base do Fluxa.</span></div><div class="checklist">${options.map(([id, label]) => `<label class="check-row"><input type="checkbox" name="enabledModality" value="${id}" ${settings.enabled.includes(id) ? 'checked' : ''}><span><strong>${label}</strong><small>Mostrar como opção ao compor tratamentos.</small></span></label>`).join('')}</div><div class="field"><label for="workspace-custom-modalities">Outras terapias <span class="muted">(opcional)</span></label><textarea id="workspace-custom-modalities" name="customModalities" placeholder="Uma terapia por linha">${esc(settings.custom.join('\n'))}</textarea></div></section><section class="workspace-settings-group"><p class="eyebrow">Dados e privacidade</p><h3>MVP local-first</h3><p class="muted">Os registros continuam armazenados neste dispositivo. Backup, importação e limpeza permanecem nas ferramentas de dados do Fluxa.</p></section><button class="btn primary wide" type="submit">Salvar configurações</button></form></section>`;
  document.body.appendChild(wrap);
}
function clearCustomRouteForBaseClick(button) {
  if (!button?.matches?.('[data-route="today"],[data-route="treatments"]')) return;
  activeWorkspaceRoute = null;
  saveWorkspaceRoute(null);
  document.querySelector('[data-workspace-view]')?.remove();
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    ensureSettingsButton();
    ensureWorkspaceNav();
    removeLibraryPreferences();
    if (activeWorkspaceRoute && !document.querySelector('[data-workspace-view]')) renderWorkspace(false);
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => {
  if (activeWorkspaceRoute) queueMicrotask(() => renderWorkspace(true));
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.workspaceRoute) {
    event.preventDefault();
    event.stopImmediatePropagation();
    navigateWorkspace(button.dataset.workspaceRoute);
    return;
  }
  if (button.dataset.openWorkspaceSettings !== undefined) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspaceSettings();
    return;
  }
  if (button.dataset.closeWorkspaceSettings !== undefined) {
    document.querySelector('#workspace-settings-overlay')?.remove();
    return;
  }
  clearCustomRouteForBaseClick(button);
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'workspace-settings-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  const enabled = data.getAll('enabledModality').map(String);
  const custom = String(data.get('customModalities') || '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.settings = draft.settings || {};
    draft.settings.therapeuticModalities = { enabled, custom };
    return draft;
  });
  document.querySelector('#workspace-settings-overlay')?.remove();
}, true);
