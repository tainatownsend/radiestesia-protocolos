import { sessionCockpit } from './session/session-cockpit.js';
import { preparationFlow } from './session/preparation-flow.js';

const ROUTES = [
  ['today', 'Hoje'],
  ['treatments', 'Tratamentos'],
  ['history', 'Histórico'],
  ['library', 'Acervo'],
];

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function placeholder(route) {
  const labels = {
    treatments: ['Tratamentos', 'Fila longitudinal de trabalho'],
    history: ['Histórico', 'Narrativa da evolução + auditoria sob demanda'],
    library: ['Acervo', 'Assistidos, protocolos, gráficos, recursos e terapias'],
  };
  const [title, copy] = labels[route] || labels.treatments;
  return `
    <section class="v2-section">
      <p class="v2-eyebrow">Fluxa UI V2</p>
      <h1 class="v2-title">${esc(title)}</h1>
      <p class="v2-copy">${esc(copy)}.</p>
      <div class="v2-card v2-card--soft">
        <strong>Estrutura reservada</strong>
        <p class="v2-copy">Esta superfície será migrada depois que o golden path mobile estiver validado.</p>
      </div>
    </section>
  `;
}

export function renderAppShell(model, ui) {
  const route = ui.route || 'today';
  const currentContext = model.sessionOpen
    ? (model.assistedSelected ? model.assistedName : 'Sessão aberta')
    : 'Sem sessão';
  const content = route === 'today' ? sessionCockpit(model) : placeholder(route);

  const nav = ROUTES.map(([id, label]) => `
    <button type="button" data-v2-route="${id}" ${route === id ? 'aria-current="page"' : ''}>${label}</button>
  `).join('');

  return `
    <div class="v2-app">
      <header class="v2-header">
        <div class="v2-brand">
          <strong>Fluxa</strong>
          <span>UI V2 · structural preview</span>
        </div>
        <span class="v2-context-chip">${esc(currentContext)}</span>
      </header>

      <main class="v2-main" id="v2-main">${content}</main>
      <nav class="v2-nav" aria-label="Navegação principal">${nav}</nav>
      ${ui.sheet === 'preparation' ? preparationFlow(model) : ''}
    </div>
  `;
}