import { createStore } from '../store.js';
import { focusSheet, trapSheetFocus } from './components/mobile-sheet.js';
import { renderAppShell } from './app-shell.js';
import {
  advancePreparation,
  answerTriage,
  beginSession,
  beginTriage,
  confirmInvestigationFindings,
  createAndSelectPerson,
  prepareCurrentSession,
  recordSessionHawkins,
  selectSessionAssisted,
  stepBackTriage,
} from './state/actions.js';
import { deriveV2Model } from './state/selectors.js';
import { fixtureFromLocation } from './testing/fixtures.js';

const root = document.querySelector('#fluxa-v2-root');
const params = new URLSearchParams(globalThis.location?.search || '');
const liveMode = params.get('mode') === 'live';
const store = liveMode ? createStore() : null;
let model = liveMode ? deriveV2Model(store.getState()) : { ...fixtureFromLocation(), source: 'fixture' };
const ui = {
  route: 'today',
  sheet: liveMode ? null : (model.overlay === 'preparation' ? 'preparation' : null),
  assistedCreate: false,
  error: '',
};
let opener = null;
let renderQueued = false;
let focusAfterRender = false;

function render({ focusDialog = false } = {}) {
  if (liveMode) model = deriveV2Model(store.getState());
  root.innerHTML = renderAppShell(model, ui);
  document.body.dataset.v2SheetOpen = ui.sheet ? 'true' : 'false';
  document.body.style.overflow = ui.sheet ? 'hidden' : '';
  document.body.style.overscrollBehavior = ui.sheet ? 'none' : '';
  if (focusDialog && ui.sheet) queueMicrotask(() => focusSheet(root));
}

function scheduleRender({ focusDialog = false } = {}) {
  focusAfterRender ||= focusDialog;
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => {
    renderQueued = false;
    const shouldFocus = focusAfterRender;
    focusAfterRender = false;
    render({ focusDialog: shouldFocus });
  });
}

function clearInlineError() {
  ui.error = '';
  root.querySelector('.v2-inline-error')?.remove();
}

function showInlineError(error) {
  const message = String(error?.message || error || 'Não foi possível concluir esta ação.');
  ui.error = message;
  const body = root.querySelector('.v2-sheet__body');
  if (!body) return;
  body.querySelector('.v2-inline-error')?.remove();
  const alert = document.createElement('div');
  alert.className = 'v2-inline-error';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  body.prepend(alert);
}

function closeSheet() {
  ui.sheet = null;
  ui.assistedCreate = false;
  ui.error = '';
  render();
  queueMicrotask(() => opener?.focus?.());
}

function openSheet(name, source = null) {
  if (source) opener = source;
  ui.sheet = name;
  ui.error = '';
  render({ focusDialog: true });
}

function nextSheetForModel(nextModel) {
  const map = {
    PREPARATION: 'preparation',
    SELECT_ASSISTED: 'assisted',
    HAWKINS: 'hawkins',
    TRIAGE: 'triage',
    FINDINGS: 'findings',
  };
  return map[nextModel.nextActionCode] || null;
}

function performNext(source) {
  if (!liveMode) {
    if (model.nextAction === 'Concluir preparação' || model.nextAction === 'Continuar preparação') openSheet('preparation', source);
    return;
  }
  clearInlineError();
  try {
    if (model.nextActionCode === 'START_SESSION') {
      beginSession(store);
      openSheet('preparation', source);
      return;
    }
    if (model.nextActionCode === 'PREPARATION') {
      prepareCurrentSession(store);
      openSheet('preparation', source);
      return;
    }
    if (model.nextActionCode === 'SELECT_ASSISTED') return openSheet('assisted', source);
    if (model.nextActionCode === 'HAWKINS') return openSheet('hawkins', source);
    if (model.nextActionCode === 'TRIAGE') return openSheet('triage', source);
    if (model.nextActionCode === 'FINDINGS') return openSheet('findings', source);
    if (model.nextActionCode === 'INVESTIGATE') {
      beginTriage(store);
      openSheet('triage', source);
    }
  } catch (error) {
    showInlineError(error);
  }
}

function handlePrimary() {
  if (!liveMode) return;
  clearInlineError();
  try {
    if (ui.sheet === 'preparation') {
      const currentStep = model.preparation?.stepKey;
      advancePreparation(store, {
        frequencyValue: root.querySelector('[data-v2-prep-frequency]')?.value,
        protectionNotes: root.querySelector('[data-v2-prep-protection]')?.value,
        permissionNotes: root.querySelector('[data-v2-prep-permission]')?.value,
      });
      const nextModel = deriveV2Model(store.getState());
      if (nextModel.prepared) {
        ui.sheet = nextModel.assistedSelected ? (nextModel.hawkinsReady ? null : 'hawkins') : 'assisted';
        scheduleRender({ focusDialog: Boolean(ui.sheet) });
      } else if (currentStep !== nextModel.preparation?.stepKey) {
        scheduleRender({ focusDialog: true });
      }
      return;
    }

    if (ui.sheet === 'assisted') {
      if (!ui.assistedCreate) {
        ui.assistedCreate = true;
        render({ focusDialog: true });
        return;
      }
      createAndSelectPerson(store, {
        displayName: root.querySelector('[data-v2-assisted-name]')?.value,
        birthDate: root.querySelector('[data-v2-assisted-birthdate]')?.value,
      });
      ui.assistedCreate = false;
      ui.sheet = 'hawkins';
      scheduleRender({ focusDialog: true });
      return;
    }

    if (ui.sheet === 'hawkins') {
      recordSessionHawkins(store, root.querySelector('[data-v2-hawkins-input]')?.value);
      ui.sheet = null;
      scheduleRender();
      return;
    }

    if (ui.sheet === 'findings') {
      const selected = [...root.querySelectorAll('[data-v2-finding-choice]:checked')].map((input) => input.value);
      if (model.findingsInvestigationId) confirmInvestigationFindings(store, model.findingsInvestigationId, selected);
      ui.sheet = null;
      scheduleRender();
    }
  } catch (error) {
    showInlineError(error);
  }
}

if (store) store.subscribe(() => scheduleRender());

root.addEventListener('click', (event) => {
  const route = event.target.closest('[data-v2-route]');
  if (route) {
    ui.route = route.dataset.v2Route;
    ui.sheet = null;
    ui.error = '';
    render();
    return;
  }

  if (event.target.closest('[data-v2-close-sheet]')) {
    closeSheet();
    return;
  }

  const assisted = event.target.closest('[data-v2-select-assisted]');
  if (assisted && liveMode) {
    clearInlineError();
    try {
      selectSessionAssisted(store, assisted.dataset.v2SelectAssisted);
      ui.sheet = 'hawkins';
      scheduleRender({ focusDialog: true });
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-secondary]') && ui.sheet === 'assisted' && ui.assistedCreate) {
    ui.assistedCreate = false;
    ui.error = '';
    render({ focusDialog: true });
    return;
  }

  if (event.target.closest('[data-v2-primary]')) {
    handlePrimary();
    return;
  }

  const triageAnswer = event.target.closest('[data-v2-triage-answer]');
  if (triageAnswer && liveMode && model.investigation) {
    clearInlineError();
    try {
      answerTriage(store, model.investigation.id, triageAnswer.dataset.v2TriageAnswer);
      const nextModel = deriveV2Model(store.getState());
      ui.sheet = nextModel.nextActionCode === 'FINDINGS' ? 'findings'
        : (nextModel.nextActionCode === 'TRIAGE' ? 'triage' : null);
      scheduleRender({ focusDialog: Boolean(ui.sheet) });
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-triage-back]') && liveMode && model.investigation) {
    clearInlineError();
    try {
      stepBackTriage(store, model.investigation.id);
      scheduleRender({ focusDialog: true });
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  const action = event.target.closest('[data-v2-preview-action]');
  if (!action) return;
  opener = action;
  const name = action.dataset.v2PreviewAction;
  if (name === 'next' || name === 'start-session') {
    performNext(action);
    return;
  }
  if (name === 'investigate' && liveMode) {
    clearInlineError();
    try {
      beginTriage(store);
      openSheet('triage', action);
    } catch (error) {
      showInlineError(error);
    }
  }
});

root.addEventListener('input', (event) => {
  const search = event.target.closest('[data-v2-assisted-search-input]');
  if (!search) return;
  const query = String(search.value || '').trim().toLocaleLowerCase('pt-BR');
  root.querySelectorAll('[data-v2-assisted-search]').forEach((row) => {
    row.hidden = Boolean(query && !row.dataset.v2AssistedSearch.includes(query));
  });
});

document.addEventListener('keydown', (event) => {
  if (!ui.sheet) return;
  if (event.key === 'Escape') {
    closeSheet();
    return;
  }
  trapSheetFocus(event, root);
});

render({ focusDialog: Boolean(ui.sheet) });
