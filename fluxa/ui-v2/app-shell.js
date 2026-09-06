import { findingsSummary } from './investigation/findings-summary.js';
import { triageFlow } from './investigation/triage-flow.js';
import { historyPage } from './history/history-page.js';
import { libraryPage } from './library/library-page.js';
import { newAssistedSheet } from './library/new-assisted-sheet.js';
import { reikiWorkspace } from './reiki/reiki-workspace.js';
import { settingsSheet } from './settings/settings-sheet.js';
import { closingFlow } from './session/closing-flow.js';
import { postCloseSummary } from './session/post-close-summary.js';
import { assistedPicker } from './session/assisted-picker.js';
import { hawkinsFlow } from './session/hawkins-flow.js';
import { preparationFlow } from './session/preparation-flow.js';
import { sessionCockpit } from './session/session-cockpit.js';
import { fixtureVisualData } from './testing/fixture-visual-data.js';
import { finalAssessment } from './treatment/final-assessment.js';
import { treatmentComposer } from './treatment/treatment-composer.js';
import { treatmentPage } from './treatment/treatment-page.js';
import { treatmentReview } from './treatment/treatment-review.js';
import { treatmentWorkspace } from './treatment/treatment-workspace.js';

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

function fixtureResolved(model, ui) {
  if (model.source !== 'fixture') return { model, ui };
  const fixtureUi = model.fixtureUi || {};
  const visual = fixtureVisualData(model.id);
  Object.assign(ui, fixtureUi, {
    sheet: model.overlay || fixtureUi.sheet || ui.sheet,
  });
  return {
    model: { ...model, ...visual },
    ui,
  };
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
  if (ui.sheet === 'closing') return closingFlow(model, ui);
  if (ui.sheet === 'library-new-assisted') return newAssistedSheet(model, ui);
  if (ui.sheet === 'settings') return settingsSheet(model, ui);
  return '';
}

export function renderAppShell(sourceModel, sourceUi) {
  const resolved = fixtureResolved(sourceModel, sourceUi);
  const model = resolved.model;
  const ui = resolved.ui;
  const route = ui.route || 'today';
  const currentContext = model.sessionOpen
    ? (model.assistedSelected ? model.assistedName : 'Sessão aberta')
    : (ui.justClosedSessionId ? 'Sessão encerrada' : 'Sem sessão');
  let content;
  if (route === 'today') {
    content = ui.justClosedSessionId ? postCloseSummary(model, ui.justClosedSessionId) : sessionCockpit(model);
  } else if (route === 'treatments') {
    content = treatmentPage(model);
  } else if (route === 'history') {
    content = historyPage(model, ui);
  } else {
    content = libraryPage(model, ui);
  }

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
        <div class="v2-header-actions">
          <span class="v2-context-chip">${esc(currentContext)}</span>
          <button class="v2-settings-trigger" type="button" data-v2-open-settings aria-label="Abrir configurações" ${model.source === 'live' ? '' : 'disabled'}>Ajustes</button>
        </div>
      </header>

      <main class="v2-main" id="v2-main">${content}</main>
      <nav class="v2-nav" aria-label="Navegação principal">${nav}</nav>
      ${sheetMarkup(model, ui)}
    </div>
  `;
}
