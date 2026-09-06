import { findingsSummary } from './investigation/findings-summary.js';
import { triageFlow } from './investigation/triage-flow.js';
import { assistedPicker } from './session/assisted-picker.js';
import { hawkinsFlow } from './session/hawkins-flow.js';
import { preparationFlow } from './session/preparation-flow.js';
import { sessionCockpit } from './session/session-cockpit.js';
import { treatmentComposer } from './treatment/treatment-composer.js';
import { treatmentPage } from './treatment/treatment-page.js';
import { treatmentWorkspace } from './treatment/treatment-workspace.js';
import { treatmentReview } from './treatment/treatment-review.js';
import { finalAssessment } from './treatment/final-assessment.js';
import { reikiWorkspace } from './reiki/reiki-workspace.js';

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
    history: ['Histórico', 'Narrativa da evolução + auditoria sob demanda'],
    library: ['Acervo', 'Assistidos, protocolos, gráficos, recursos e terapias'],
  };
  const [title, copy] = labels[route] || labels.history;
  return `
    <section class="v2-section">
      <p class="v2-eyebrow">Fluxa UI V2</p>
      <h1 class="v2-title">${esc(title)}</h1>
      <p class="v2-copy">${esc(copy)}.</p>
      <div class="v2-card v2-card--soft">
        <strong>Em migração</strong>
        <p class="v2-copy">Esta superfície entra depois que o golden path da sessão estiver estável no iPhone.</p>
      </div>
    </section>
  `;
}

function sheetMarkup(model, ui) {
  if (ui.sheet === 'preparation') return preparationFlow(model, ui);
  if (ui.sheet === 'assisted') return assistedPicker(model, ui);
  if (ui.sheet === 'hawkins') return hawkinsFlow(model, ui);
  if (ui.sheet === 'triage') return triageFlow(model, ui);
  if (ui.sheet === 'findings') return findingsSummary(model, ui);
  if (ui.sheet === 'treatment-composer') return treatmentComposer(model, ui);
  if (ui.sheet === 'treatment-workspace') return treatmentWorkspace(model, ui);
  if (ui.sheet === 'treatment-review') return treatmentReview(model, ui);
  if (ui.sheet === 'final-assessment') return finalAssessment(model, ui);
  if (ui.sheet === 'reiki') return reikiWorkspace(model, ui);
  return '';
}

export function renderAppShell(model, ui) {
  const route = ui.route || 'today';
  const currentContext = model.sessionOpen
    ? (model.assistedSelected ? model.assistedName : 'Sessão aberta')
    : 'Sem sessão';
  const content = route === 'today'
    ? sessionCockpit(model)
    : (route === 'treatments' ? treatmentPage(model) : placeholder(route));

  const nav = ROUTES.map(([id, label]) => `
    <button type="button" data-v2-route="${id}" ${route === id ? 'aria-current="page"' : ''}>${label}</button>
  `).join('');

  return `
    <div class="v2-app">
      <header class="v2-header">
        <div class="v2-brand">
          <strong>Fluxa</strong>
          <span>${model.source === 'live' ? 'Sessão guiada · UI V2' : 'UI V2 · preview seguro'}</span>
        </div>
        <span class="v2-context-chip">${esc(currentContext)}</span>
      </header>

      <main class="v2-main" id="v2-main">${content}</main>
      <nav class="v2-nav" aria-label="Navegação principal">${nav}</nav>
      ${sheetMarkup(model, ui)}
    </div>
  `;
}
