import { AssistedType, createAssistedEntity } from '../domain.js';
import { createStore, loadState } from '../store.js';
import { exportLocalDataFile, recoverLocalData, validateImportPayload } from '../storage-health.js';
import { focusSheet, trapSheetFocus } from './components/mobile-sheet.js';
import { renderAppShell } from './app-shell.js';
import {
  advancePreparation,
  answerTriage,
  beginSession,
  beginTriage,
  closeCurrentSessionV2,
  completeSessionReiki,
  confirmInvestigationFindings,
  createAndSelectPerson,
  finalizeTreatmentV2,
  pauseSessionReiki,
  prepareCurrentSession,
  recordSessionHawkins,
  resumeSessionReiki,
  resumeTreatmentV2,
  reviewTreatmentComponentV2,
  saveTreatmentDraft,
  selectSessionAssisted,
  startPlannedTreatmentV2,
  startSessionReiki,
  stepBackTriage,
} from './state/actions.js';
import { deriveHistoryModel } from './history/history-model.js';
import { deriveLibraryModel } from './library/library-model.js';
import { deriveV2Model } from './state/selectors.js';
import { fixtureFromLocation } from './testing/fixtures.js';

const root = document.querySelector('#fluxa-v2-root');
const params = new URLSearchParams(globalThis.location?.search || '');
const liveMode = params.get('mode') === 'live';
const store = liveMode ? createStore() : null;

function deriveLiveModel() {
  const state = store.getState();
  return { ...deriveV2Model(state), ...deriveHistoryModel(state), ...deriveLibraryModel(state) };
}

const emptyLibrary = {
  assisteds: [], resources: [], protocols: [], therapies: [{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  counts: { assisteds:0, resources:0, protocols:0, therapies:1 },
};
let model = liveMode
  ? deriveLiveModel()
  : {
      ...fixtureFromLocation(), source:'fixture', historySessions:[], safeClose:null, latestClosedSession:null,
      library:emptyLibrary, therapeuticSettings:{ enabled:[], custom:[] },
    };

function blankGraph() {
  return { graphName: '', durationValue: '', durationUnit: 'DAY' };
}
function blankCommand() {
  return { text: '', graphApplications: [blankGraph()] };
}
function blankItem(label = '') {
  return { itemLabel: label, commands: [blankCommand()] };
}
function blankTreatmentDraft(findingIds = [], firstLabel = '') {
  return { title: '', objective: '', modalities: [], findingIds: [...findingIds], items: [blankItem(firstLabel)] };
}
function normalizeSearch(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

const ui = {
  route: 'today',
  sheet: liveMode ? null : (model.overlay === 'preparation' ? 'preparation' : null),
  assistedCreate: false,
  error: '',
  activeTreatmentId: null,
  reviewComponentId: null,
  treatmentDraft: blankTreatmentDraft(),
  justClosedSessionId: null,
  historySessionId: null,
  librarySection: 'home',
  importPreview: null,
};
let opener = null;
let renderQueued = false;
let focusAfterRender = false;

function render({ focusDialog = false } = {}) {
  if (liveMode) model = deriveLiveModel();
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

function renderPreservingSheetScroll() {
  const scrollTop = root.querySelector('.v2-sheet__body')?.scrollTop || 0;
  render();
  queueMicrotask(() => {
    const body = root.querySelector('.v2-sheet__body');
    if (body) body.scrollTop = scrollTop;
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
  if (!body) {
    render();
    return;
  }
  body.querySelector('.v2-inline-error')?.remove();
  const alert = document.createElement('div');
  alert.className = 'v2-inline-error';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  body.prepend(alert);
}

function closeSheet() {
  const closingSheet = ui.sheet;
  ui.sheet = null;
  ui.assistedCreate = false;
  ui.reviewComponentId = null;
  if (closingSheet === 'settings') ui.importPreview = null;
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

function openTreatmentComposer(source = null, findingIds = []) {
  const findings = (model.treatmentFindings || []).filter((finding) => findingIds.includes(finding.id));
  const firstLabel = findings.length === 1 ? findings[0].title : '';
  ui.treatmentDraft = blankTreatmentDraft(findingIds, firstLabel);
  openSheet('treatment-composer', source);
}

function syncTreatmentDraftFromDom() {
  if (ui.sheet !== 'treatment-composer') return;
  root.querySelectorAll('[data-v2-treatment-draft]').forEach((field) => {
    const kind = field.dataset.v2TreatmentDraft;
    const itemIndex = Number(field.dataset.itemIndex);
    const commandIndex = Number(field.dataset.commandIndex);
    const graphIndex = Number(field.dataset.graphIndex);
    if (kind === 'title' || kind === 'objective') {
      ui.treatmentDraft[kind] = field.value;
      return;
    }
    const item = ui.treatmentDraft.items?.[itemIndex];
    if (!item) return;
    if (kind === 'itemLabel') item.itemLabel = field.value;
    const command = item.commands?.[commandIndex];
    if (!command) return;
    if (kind === 'commandText') command.text = field.value;
    const graph = command.graphApplications?.[graphIndex];
    if (graph && ['graphName', 'durationValue', 'durationUnit'].includes(kind)) graph[kind] = field.value;
  });
  ui.treatmentDraft.modalities = [...root.querySelectorAll('[data-v2-treatment-modality]:checked')].map((input) => input.value);
}

function treatmentInput() {
  syncTreatmentDraftFromDom();
  const modalities = (model.modalityOptions || [])
    .filter((item) => ui.treatmentDraft.modalities.includes(item.id))
    .map((item) => ({ id: item.id, label: item.label }));
  return { ...structuredClone(ui.treatmentDraft), modalities };
}

function treatmentById(id) {
  return (model.treatments || []).find((item) => item.id === id) || null;
}

function performTreatmentAction(action, treatmentId, source = null) {
  if (!liveMode) return;
  if (source) opener = source;
  ui.activeTreatmentId = treatmentId;
  ui.error = '';
  try {
    if (action === 'start') {
      startPlannedTreatmentV2(store, treatmentId);
      ui.sheet = 'treatment-workspace';
    } else if (action === 'resume') {
      resumeTreatmentV2(store, treatmentId);
      ui.sheet = 'treatment-workspace';
    } else if (action === 'final') {
      ui.sheet = 'final-assessment';
    } else if (action === 'review') {
      const treatment = treatmentById(treatmentId);
      const component = treatment?.components?.find((item) => item.reviewable);
      if (component) {
        ui.reviewComponentId = component.id;
        ui.sheet = 'treatment-review';
      } else {
        ui.sheet = 'treatment-workspace';
      }
    } else {
      ui.sheet = 'treatment-workspace';
    }
    render({ focusDialog: true });
  } catch (error) {
    ui.sheet = 'treatment-workspace';
    render({ focusDialog: true });
    showInlineError(error);
  }
}

function performNext(source) {
  if (!liveMode) {
    if (model.nextAction === 'Concluir preparação' || model.nextAction === 'Continuar preparação') openSheet('preparation', source);
    return;
  }
  clearInlineError();
  try {
    if (model.nextActionCode === 'START_SESSION') {
      ui.justClosedSessionId = null;
      ui.historySessionId = null;
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
    if (model.nextActionCode === 'COMPOSE_TREATMENT') return openTreatmentComposer(source, (model.treatmentFindings || []).map((item) => item.id));
    if (model.nextActionCode === 'REIKI_ACTIVE') return openSheet('reiki', source);
    if (['TREATMENT_FINAL', 'TREATMENT_REVIEW', 'TREATMENT_WORKSPACE'].includes(model.nextActionCode)) {
      const treatment = treatmentById(model.nextActionTreatmentId);
      return performTreatmentAction(treatment?.primaryAction || 'workspace', model.nextActionTreatmentId, source);
    }
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
      const nextModel = deriveLiveModel();
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

    if (ui.sheet === 'library-new-assisted') {
      createAssistedEntity(store, {
        type: AssistedType.PERSON,
        displayName: root.querySelector('[data-v2-library-person-name]')?.value || '',
        birthDate: root.querySelector('[data-v2-library-person-birthdate]')?.value || '',
      });
      ui.sheet = null;
      ui.librarySection = 'assisteds';
      scheduleRender();
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
      const created = model.findingsInvestigationId
        ? confirmInvestigationFindings(store, model.findingsInvestigationId, selected)
        : [];
      const nextModel = deriveLiveModel();
      const findingIds = created.map((item) => item.id);
      model = nextModel;
      if (findingIds.length) openTreatmentComposer(null, findingIds);
      else {
        ui.sheet = null;
        scheduleRender();
      }
      return;
    }

    if (ui.sheet === 'treatment-review') {
      const outcome = root.querySelector('input[name="reviewOutcome"]:checked')?.value || 'continue';
      reviewTreatmentComponentV2(store, {
        componentId: ui.reviewComponentId,
        verifiedComplete: outcome === 'complete',
        permissionToDismantle: outcome === 'complete',
        notes: root.querySelector('[data-v2-review-notes]')?.value || '',
      });
      const nextModel = deriveLiveModel();
      const treatment = nextModel.treatments.find((item) => item.id === ui.activeTreatmentId);
      model = nextModel;
      ui.reviewComponentId = null;
      ui.sheet = treatment?.readyForFinalAssessment ? 'final-assessment' : 'treatment-workspace';
      scheduleRender({ focusDialog: true });
      return;
    }

    if (ui.sheet === 'final-assessment') {
      finalizeTreatmentV2(store, ui.activeTreatmentId, {
        frequency: root.querySelector('[data-v2-final-frequency]')?.value,
        imbalancePercent: root.querySelector('[data-v2-final-imbalance]')?.value,
        needsNewTreatment: Boolean(root.querySelector('[data-v2-final-needs-new]')?.checked),
        nextTreatmentWhen: root.querySelector('[data-v2-final-next]')?.value || '',
        notes: root.querySelector('[data-v2-final-notes]')?.value || '',
      });
      ui.sheet = null;
      ui.activeTreatmentId = null;
      ui.route = 'today';
      scheduleRender();
      return;
    }

    if (ui.sheet === 'reiki' && !model.reiki) {
      const mode = root.querySelector('input[name="reikiMode"]:checked')?.value || 'IN_PERSON';
      startSessionReiki(store, mode);
      scheduleRender({ focusDialog: true });
      return;
    }

    if (ui.sheet === 'closing') {
      const sessionId = closeCurrentSessionV2(store, {
        confirmation: root.querySelector('[data-v2-closing-confirmation]')?.value || '',
      });
      ui.sheet = null;
      ui.route = 'today';
      ui.historySessionId = null;
      ui.justClosedSessionId = sessionId;
      scheduleRender();
    }
  } catch (error) {
    showInlineError(error);
  }
}

function handleSecondary() {
  if (ui.sheet === 'assisted' && ui.assistedCreate) {
    ui.assistedCreate = false;
    ui.error = '';
    render({ focusDialog: true });
    return;
  }
  if (ui.sheet === 'treatment-review' || ui.sheet === 'final-assessment') {
    ui.reviewComponentId = null;
    ui.sheet = 'treatment-workspace';
    ui.error = '';
    render({ focusDialog: true });
    return;
  }
  closeSheet();
}

if (store) store.subscribe(() => scheduleRender());

root.addEventListener('click', (event) => {
  const route = event.target.closest('[data-v2-route]');
  if (route) {
    ui.route = route.dataset.v2Route;
    ui.sheet = null;
    if (ui.route !== 'history') ui.historySessionId = null;
    if (ui.route !== 'library') ui.librarySection = 'home';
    ui.error = '';
    render();
    return;
  }

  if (event.target.closest('[data-v2-close-sheet]')) {
    closeSheet();
    return;
  }

  const settingsTrigger = event.target.closest('[data-v2-open-settings]');
  if (settingsTrigger) {
    if (!liveMode) return;
    openSheet('settings', settingsTrigger);
    return;
  }

  const librarySection = event.target.closest('[data-v2-library-section]');
  if (librarySection) {
    ui.route = 'library';
    ui.librarySection = librarySection.dataset.v2LibrarySection || 'home';
    ui.error = '';
    render();
    return;
  }

  if (event.target.closest('[data-v2-library-back]')) {
    ui.route = 'library';
    ui.librarySection = 'home';
    ui.error = '';
    render();
    return;
  }

  const newLibraryAssisted = event.target.closest('[data-v2-library-new-assisted]');
  if (newLibraryAssisted) {
    if (!liveMode) return;
    openSheet('library-new-assisted', newLibraryAssisted);
    return;
  }

  if (event.target.closest('[data-v2-settings-export]')) {
    if (!liveMode) return;
    clearInlineError();
    try {
      exportLocalDataFile();
      renderPreservingSheetScroll();
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-settings-recover]')) {
    if (!liveMode) return;
    clearInlineError();
    try {
      recoverLocalData();
      store.setState(() => loadState());
      renderPreservingSheetScroll();
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-settings-import-apply]')) {
    if (!liveMode || !ui.importPreview?.normalized) return;
    clearInlineError();
    try {
      const normalized = structuredClone(ui.importPreview.normalized);
      store.setState(() => normalized);
      ui.importPreview = null;
      renderPreservingSheetScroll();
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-settings-save-modalities]')) {
    if (!liveMode) return;
    clearInlineError();
    try {
      const enabled = [...root.querySelectorAll('input[name="v2EnabledModality"]:checked')].map((input) => input.value);
      const custom = String(root.querySelector('[data-v2-settings-custom-modalities]')?.value || '')
        .split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      store.setState((state) => {
        const draft = structuredClone(state);
        draft.settings = draft.settings || {};
        draft.settings.therapeuticModalities = { enabled, custom };
        return draft;
      });
      renderPreservingSheetScroll();
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-closing-reiki]')) {
    ui.sheet = 'reiki';
    ui.error = '';
    render({ focusDialog: true });
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

  if (event.target.closest('[data-v2-secondary]')) {
    handleSecondary();
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
      const nextModel = deriveLiveModel();
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

  const treatmentSubmit = event.target.closest('[data-v2-treatment-submit]');
  if (treatmentSubmit && liveMode) {
    clearInlineError();
    try {
      const treatment = saveTreatmentDraft(store, treatmentInput(), { start: treatmentSubmit.dataset.v2TreatmentSubmit === 'start' });
      ui.activeTreatmentId = treatment.id;
      ui.treatmentDraft = blankTreatmentDraft();
      ui.route = 'treatments';
      ui.sheet = 'treatment-workspace';
      scheduleRender({ focusDialog: true });
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  const treatmentAction = event.target.closest('[data-v2-treatment-action]');
  if (treatmentAction) {
    performTreatmentAction(treatmentAction.dataset.v2TreatmentAction, treatmentAction.dataset.treatmentId, treatmentAction);
    return;
  }

  const reviewComponent = event.target.closest('[data-v2-review-component]');
  if (reviewComponent) {
    ui.reviewComponentId = reviewComponent.dataset.v2ReviewComponent;
    ui.sheet = 'treatment-review';
    ui.error = '';
    render({ focusDialog: true });
    return;
  }

  if (event.target.closest('[data-v2-add-item]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items.push(blankItem());
    renderPreservingSheetScroll();
    return;
  }
  const removeItem = event.target.closest('[data-v2-remove-item]');
  if (removeItem) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items.splice(Number(removeItem.dataset.itemIndex), 1);
    renderPreservingSheetScroll();
    return;
  }
  const addCommand = event.target.closest('[data-v2-add-command]');
  if (addCommand) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(addCommand.dataset.itemIndex)]?.commands.push(blankCommand());
    renderPreservingSheetScroll();
    return;
  }
  const removeCommand = event.target.closest('[data-v2-remove-command]');
  if (removeCommand) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(removeCommand.dataset.itemIndex)]?.commands.splice(Number(removeCommand.dataset.commandIndex), 1);
    renderPreservingSheetScroll();
    return;
  }
  const addGraph = event.target.closest('[data-v2-add-graph]');
  if (addGraph) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(addGraph.dataset.itemIndex)]?.commands[Number(addGraph.dataset.commandIndex)]?.graphApplications.push(blankGraph());
    renderPreservingSheetScroll();
    return;
  }
  const removeGraph = event.target.closest('[data-v2-remove-graph]');
  if (removeGraph) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(removeGraph.dataset.itemIndex)]?.commands[Number(removeGraph.dataset.commandIndex)]?.graphApplications.splice(Number(removeGraph.dataset.graphIndex), 1);
    renderPreservingSheetScroll();
    return;
  }

  const reikiControl = event.target.closest('[data-v2-reiki-control]');
  if (reikiControl && liveMode && model.reiki) {
    clearInlineError();
    try {
      const action = reikiControl.dataset.v2ReikiControl;
      if (action === 'pause') pauseSessionReiki(store, model.reiki.id);
      if (action === 'resume') resumeSessionReiki(store, model.reiki.id);
      if (action === 'complete') {
        completeSessionReiki(store, model.reiki.id, root.querySelector('[data-v2-reiki-notes]')?.value || '');
        ui.sheet = null;
      }
      scheduleRender({ focusDialog: Boolean(ui.sheet) });
    } catch (error) {
      showInlineError(error);
    }
    return;
  }

  const historySession = event.target.closest('[data-v2-history-session]');
  if (historySession) {
    ui.route = 'history';
    ui.sheet = null;
    ui.historySessionId = historySession.dataset.v2HistorySession;
    ui.error = '';
    render();
    return;
  }

  if (event.target.closest('[data-v2-history-back]')) {
    ui.historySessionId = null;
    render();
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
    return;
  }
  if (name === 'treat') {
    openTreatmentComposer(action, (model.treatmentFindings || []).map((item) => item.id));
    return;
  }
  if (name === 'reiki') {
    openSheet('reiki', action);
    return;
  }
  if (name === 'close-session') {
    openSheet('closing', action);
  }
});

root.addEventListener('input', (event) => {
  const assistedSearch = event.target.closest('[data-v2-assisted-search-input]');
  if (assistedSearch) {
    const query = String(assistedSearch.value || '').trim().toLocaleLowerCase('pt-BR');
    root.querySelectorAll('[data-v2-assisted-search]').forEach((row) => {
      row.hidden = Boolean(query && !row.dataset.v2AssistedSearch.includes(query));
    });
    return;
  }

  const librarySearch = event.target.closest('[data-v2-library-search]');
  if (librarySearch) {
    const query = normalizeSearch(librarySearch.value);
    root.querySelectorAll('[data-v2-library-search-text]').forEach((row) => {
      row.hidden = Boolean(query && !String(row.dataset.v2LibrarySearchText || '').includes(query));
    });
    return;
  }

  if (event.target.closest('[data-v2-treatment-draft], [data-v2-treatment-modality]')) syncTreatmentDraftFromDom();
});

root.addEventListener('change', async (event) => {
  const importInput = event.target.closest('[data-v2-settings-import-file]');
  if (importInput && liveMode) {
    clearInlineError();
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (_) { throw new Error('Este arquivo não contém um backup JSON válido do Fluxa.'); }
      const normalized = validateImportPayload(parsed);
      ui.importPreview = {
        name: file.name,
        normalized,
        summary: {
          sessions: normalized.sessions?.length || 0,
          assisteds: normalized.assistedEntities?.length || 0,
          treatments: normalized.treatments?.length || 0,
          resources: normalized.tools?.length || 0,
        },
      };
      renderPreservingSheetScroll();
    } catch (error) {
      ui.importPreview = null;
      showInlineError(error);
    }
    return;
  }

  if (event.target.closest('[data-v2-treatment-modality]')) syncTreatmentDraftFromDom();
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
