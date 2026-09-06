import { AssistedType, createAssistedEntity } from '../domain.js';
import { createStore, loadState } from '../store.js';
import { exportLocalDataFile, recoverLocalData, validateImportPayload } from '../storage-health.js';
import { focusSheet, trapSheetFocus } from './components/mobile-sheet.js';
import { renderAppShell } from './app-shell.js';
import { setPageScrollLock } from './mobile-viewport.js';
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
import { isContinuityLocked } from './workflow-continuity.js';

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
function requireDataReplacementIdle() {
  const sessionOpen = Boolean(liveMode && store?.getState?.().sessions?.some((session) => session.status === 'OPEN'));
  if (sessionOpen) throw new Error('Finalize a sessão atual antes de importar ou recuperar os dados locais.');
}
function currentWorkflowModel() {
  return liveMode ? deriveV2Model(store.getState()) : model;
}
function requireTreatmentActionAllowed(action, treatmentId) {
  const current = currentWorkflowModel();
  if (!isContinuityLocked(current.nextActionCode) || action === 'workspace') return;
  const isRecommendedReview = current.nextActionCode === 'TREATMENT_REVIEW'
    && action === 'review'
    && current.nextActionTreatmentId === treatmentId;
  const isRecommendedFinal = current.nextActionCode === 'TREATMENT_FINAL'
    && action === 'final'
    && current.nextActionTreatmentId === treatmentId;
  if (isRecommendedReview || isRecommendedFinal) return;
  throw new Error('Conclua a próxima ação recomendada em Hoje antes de alterar outro tratamento.');
}
function requireNewTreatmentAllowed() {
  const current = currentWorkflowModel();
  if (isContinuityLocked(current.nextActionCode)) {
    throw new Error('Conclua a próxima ação recomendada em Hoje antes de criar outro tratamento.');
  }
}
function assistedContextChangeAllowed() {
  return !isContinuityLocked(currentWorkflowModel().nextActionCode);
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
  setPageScrollLock(Boolean(ui.sheet), globalThis.window, document);
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
  scheduleRender();
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
  scheduleRender({ focusDialog: true });
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

function treatmentIdForComponent(componentId) {
  return (model.treatments || []).find((treatment) => (treatment.components || []).some((component) => component.id === componentId))?.id || null;
}

function performTreatmentAction(action, treatmentId, source = null) {
  if (!liveMode) return;
  if (source) opener = source;
  ui.activeTreatmentId = treatmentId;
  ui.error = '';
  try {
    requireTreatmentActionAllowed(action, treatmentId);
    if (action === 'start') {
      startPlannedTreatmentV2(store, treatmentId);
      ui.sheet = 'treatment-workspace';
    } else if (action === 'resume') {
      resumeTreatmentV2(store, treatmentId);
      ui.sheet = 'treatment-workspace';
    } else if (action === 'review') {
      const treatment = treatmentById(treatmentId);
      const due = treatment?.components?.find((item) => item.reviewable);
      if (!due) throw new Error('Nenhum componente está pronto para revisão.');
      ui.reviewComponentId = due.id;
      ui.sheet = 'treatment-review';
    } else if (action === 'final') {
      ui.sheet = 'final-assessment';
    } else {
      ui.sheet = 'treatment-workspace';
    }
    scheduleRender({ focusDialog: true });
  } catch (error) {
    showInlineError(error);
  }
}

function performPrimaryAction(source = null) {
  if (!liveMode) return;
  try {
    const action = model.nextActionCode;
    if (action === 'START_SESSION') {
      beginSession(store);
      ui.sheet = 'preparation';
      ui.justClosedSessionId = null;
    } else if (action === 'PREPARE') {
      prepareCurrentSession(store);
      ui.sheet = 'preparation';
    } else if (action === 'SELECT_ASSISTED') {
      ui.sheet = 'assisted';
    } else if (action === 'HAWKINS') {
      ui.sheet = 'hawkins';
    } else if (action === 'INVESTIGATE') {
      beginTriage(store);
      ui.sheet = 'triage';
    } else if (action === 'REVIEW_FINDINGS') {
      ui.sheet = 'findings';
    } else if (action === 'TREATMENT_REVIEW' || action === 'TREATMENT_FINAL') {
      performTreatmentAction(action === 'TREATMENT_REVIEW' ? 'review' : 'final', model.nextActionTreatmentId, source);
      return;
    } else if (action === 'TREATMENT_RESUME') {
      performTreatmentAction('resume', model.nextActionTreatmentId, source);
      return;
    } else if (action === 'REIKI') {
      ui.sheet = 'reiki';
    } else if (action === 'CLOSE_SESSION') {
      ui.sheet = 'closing';
    }
    if (source) opener = source;
    scheduleRender({ focusDialog: Boolean(ui.sheet) });
  } catch (error) {
    showInlineError(error);
  }
}

function submitCurrentSheet() {
  if (!liveMode) return;
  try {
    if (ui.sheet === 'preparation') {
      const frequencyValue = root.querySelector('[data-v2-frequency]')?.value || '';
      const protectionNotes = root.querySelector('[data-v2-protection-notes]')?.value || '';
      const permissionNotes = root.querySelector('[data-v2-permission-notes]')?.value || '';
      advancePreparation(store, { frequencyValue, protectionNotes, permissionNotes });
    } else if (ui.sheet === 'assisted' && ui.assistedCreate) {
      createAndSelectPerson(store, {
        displayName: root.querySelector('[data-v2-assisted-name]')?.value || '',
        birthDate: root.querySelector('[data-v2-assisted-birthdate]')?.value || '',
      });
      ui.assistedCreate = false;
    } else if (ui.sheet === 'hawkins') {
      recordSessionHawkins(store, root.querySelector('[data-v2-hawkins]')?.value || '');
    } else if (ui.sheet === 'findings') {
      const ids = [...root.querySelectorAll('[data-v2-finding-choice]:checked')].map((input) => input.value);
      confirmInvestigationFindings(store, model.investigation?.id, ids);
    } else if (ui.sheet === 'closing') {
      const confirmation = root.querySelector('[data-v2-closing-confirmation]')?.value || '';
      const closedId = closeCurrentSessionV2(store, { confirmation });
      ui.justClosedSessionId = closedId;
      ui.route = 'today';
    } else if (ui.sheet === 'library-new-assisted') {
      const displayName = root.querySelector('[data-v2-library-person-name]')?.value || '';
      const birthDate = root.querySelector('[data-v2-library-person-birthdate]')?.value || '';
      createAssistedEntity(store, { type: AssistedType.PERSON, displayName, birthDate });
      ui.librarySection = 'assisteds';
    }
    ui.sheet = null;
    ui.error = '';
    render();
  } catch (error) {
    showInlineError(error);
  }
}

root.addEventListener('click', (event) => {
  const target = event.target.closest('button, label, input, summary');
  if (!target) return;

  if (target.matches('[data-v2-close-sheet]')) {
    closeSheet();
    return;
  }
  if (target.matches('[data-v2-primary]')) {
    submitCurrentSheet();
    return;
  }
  if (target.matches('[data-v2-secondary]')) {
    if (ui.sheet === 'assisted' && ui.assistedCreate) {
      ui.assistedCreate = false;
      scheduleRender({ focusDialog: true });
    } else {
      closeSheet();
    }
    return;
  }
  if (target.matches('[data-v2-preview-action]')) {
    const action = target.dataset.v2PreviewAction;
    if (action === 'start-session' || action === 'next') performPrimaryAction(target);
    else if (action === 'change-assisted') {
      if (!liveMode) return;
      if (!assistedContextChangeAllowed()) {
        showInlineError(new Error('Conclua a etapa em andamento antes de trocar o Assistido da sessão.'));
        return;
      }
      openSheet('assisted', target);
    } else if (action === 'investigate') {
      try { beginTriage(store); openSheet('triage', target); } catch (error) { showInlineError(error); }
    } else if (action === 'treat') {
      try { requireNewTreatmentAllowed(); openTreatmentComposer(target); } catch (error) { showInlineError(error); }
    } else if (action === 'reiki') openSheet('reiki', target);
    else if (action === 'close-session') openSheet('closing', target);
    return;
  }
  if (target.matches('[data-v2-route]')) {
    ui.route = target.dataset.v2Route;
    ui.sheet = null;
    ui.error = '';
    ui.historySessionId = null;
    if (ui.route !== 'library') ui.librarySection = 'home';
    render();
    return;
  }
  if (target.matches('[data-v2-open-settings]')) {
    openSheet('settings', target);
    return;
  }
  if (target.matches('[data-v2-select-assisted]')) {
    if (!liveMode) return;
    try {
      const assistedId = target.dataset.v2SelectAssisted;
      if (!assistedContextChangeAllowed()) throw new Error('Conclua a etapa em andamento antes de trocar o Assistido da sessão.');
      selectSessionAssisted(store, assistedId);
      ui.sheet = null;
      ui.assistedCreate = false;
      ui.error = '';
      render();
      if (target.hasAttribute('data-v2-closing-blocker-assisted')) performPrimaryAction();
    } catch (error) {
      showInlineError(error);
    }
    return;
  }
  if (target.matches('[data-v2-triage-answer]')) {
    if (!liveMode) return;
    try {
      answerTriage(store, model.investigation?.id, target.dataset.v2TriageAnswer);
      const next = deriveLiveModel();
      ui.sheet = next.findings?.length && !next.investigation ? 'findings' : 'triage';
      scheduleRender({ focusDialog: true });
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-triage-back]')) {
    if (!liveMode) return;
    stepBackTriage(store, model.investigation?.id);
    scheduleRender({ focusDialog: true });
    return;
  }
  if (target.matches('[data-v2-treatment-submit]')) {
    if (!liveMode) return;
    try {
      const start = target.dataset.v2TreatmentSubmit === 'start';
      const treatment = saveTreatmentDraft(store, treatmentInput(), { start });
      ui.activeTreatmentId = treatment.id;
      ui.sheet = start ? 'treatment-workspace' : null;
      ui.route = 'treatments';
      ui.error = '';
      render();
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-treatment-action]')) {
    performTreatmentAction(target.dataset.v2TreatmentAction, target.dataset.treatmentId, target);
    return;
  }
  if (target.matches('[data-v2-review-component]')) {
    if (!liveMode) return;
    try {
      const componentId = target.dataset.v2ReviewComponent;
      requireTreatmentActionAllowed('review', treatmentIdForComponent(componentId));
      ui.reviewComponentId = componentId;
      ui.sheet = 'treatment-review';
      openSheet('treatment-review', target);
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-review-save]')) {
    if (!liveMode) return;
    try {
      const outcome = root.querySelector('[name="reviewOutcome"]:checked')?.value || 'continue';
      const notes = root.querySelector('[data-v2-review-notes]')?.value || '';
      reviewTreatmentComponentV2(store, ui.reviewComponentId, { outcome, notes });
      ui.sheet = 'treatment-workspace';
      ui.reviewComponentId = null;
      scheduleRender({ focusDialog: true });
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-final-submit]')) {
    if (!liveMode) return;
    try {
      finalizeTreatmentV2(store, ui.activeTreatmentId, {
        finalHertz: root.querySelector('[data-v2-final-frequency]')?.value || '',
        imbalance: root.querySelector('[data-v2-final-imbalance]')?.value || '',
        needsNewTreatment: Boolean(root.querySelector('[data-v2-final-needs-new]')?.checked),
        nextTreatmentTiming: root.querySelector('[data-v2-final-next]')?.value || '',
        notes: root.querySelector('[data-v2-final-notes]')?.value || '',
      });
      ui.sheet = null;
      ui.error = '';
      render();
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-reiki-control]')) {
    if (!liveMode) return;
    try {
      const action = target.dataset.v2ReikiControl;
      if (action === 'pause') pauseSessionReiki(store);
      else if (action === 'resume') resumeSessionReiki(store);
      else if (action === 'complete') completeSessionReiki(store, root.querySelector('[data-v2-reiki-notes]')?.value || '');
      ui.sheet = null;
      ui.error = '';
      render();
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-closing-reiki]')) {
    openSheet('reiki', target);
    return;
  }
  if (target.matches('[data-v2-library-section]')) {
    ui.librarySection = target.dataset.v2LibrarySection;
    ui.route = 'library';
    render();
    return;
  }
  if (target.matches('[data-v2-library-back]')) {
    ui.librarySection = 'home';
    render();
    return;
  }
  if (target.matches('[data-v2-library-new-assisted]')) {
    openSheet('library-new-assisted', target);
    return;
  }
  if (target.matches('[data-v2-history-session]')) {
    ui.route = 'history';
    ui.historySessionId = target.dataset.v2HistorySession;
    ui.justClosedSessionId = null;
    render();
    return;
  }
  if (target.matches('[data-v2-history-back]')) {
    ui.historySessionId = null;
    render();
    return;
  }
  if (target.matches('[data-v2-open-history]')) {
    ui.route = 'history';
    ui.justClosedSessionId = null;
    render();
    return;
  }
  if (target.matches('[data-v2-add-item]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items.push(blankItem());
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-remove-item]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items.splice(Number(target.dataset.itemIndex), 1);
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-add-command]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(target.dataset.itemIndex)]?.commands.push(blankCommand());
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-remove-command]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(target.dataset.itemIndex)]?.commands.splice(Number(target.dataset.commandIndex), 1);
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-add-graph]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(target.dataset.itemIndex)]?.commands[Number(target.dataset.commandIndex)]?.graphApplications.push(blankGraph());
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-remove-graph]')) {
    syncTreatmentDraftFromDom();
    ui.treatmentDraft.items[Number(target.dataset.itemIndex)]?.commands[Number(target.dataset.commandIndex)]?.graphApplications.splice(Number(target.dataset.graphIndex), 1);
    renderPreservingSheetScroll();
    return;
  }
  if (target.matches('[data-v2-settings-save-modalities]')) {
    if (!liveMode) return;
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
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-settings-export]')) {
    if (!liveMode) return;
    try {
      exportLocalDataFile();
      model = deriveLiveModel();
      scheduleRender({ focusDialog: true });
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-settings-import-apply]')) {
    if (!liveMode || !ui.importPreview?.normalized) return;
    try {
      requireDataReplacementIdle();
      const normalized = structuredClone(ui.importPreview.normalized);
      store.setState(() => normalized);
      ui.importPreview = null;
      renderPreservingSheetScroll();
    } catch (error) { showInlineError(error); }
    return;
  }
  if (target.matches('[data-v2-settings-recover]')) {
    if (!liveMode) return;
    try {
      requireDataReplacementIdle();
      recoverLocalData();
      loadState({ force:true });
      ui.sheet = null;
      render();
    } catch (error) { showInlineError(error); }
  }
});

root.addEventListener('change', async (event) => {
  const target = event.target;
  if (target.matches('[data-v2-settings-import-file]')) {
    if (!liveMode) return;
    try {
      requireDataReplacementIdle();
      const file = target.files?.[0];
      if (!file) return;
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
    finally { target.value = ''; }
  }
  if (target.matches('[data-v2-final-needs-new]')) scheduleRender({ focusDialog: true });
});

root.addEventListener('input', (event) => {
  const target = event.target;
  if (target.matches('[data-v2-assisted-search-input]')) {
    const needle = normalizeSearch(target.value);
    root.querySelectorAll('[data-v2-assisted-search]').forEach((row) => {
      row.hidden = needle && !String(row.dataset.v2AssistedSearch || '').includes(needle);
    });
  }
  if (target.matches('[data-v2-library-search]')) {
    const needle = normalizeSearch(target.value);
    root.querySelectorAll('[data-v2-library-search-text]').forEach((row) => {
      row.hidden = needle && !normalizeSearch(row.dataset.v2LibrarySearchText || '').includes(needle);
    });
  }
});

document.addEventListener('keydown', (event) => {
  if (!ui.sheet) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSheet();
    return;
  }
  trapSheetFocus(event, root);
});

render({ focusDialog: Boolean(ui.sheet) });
