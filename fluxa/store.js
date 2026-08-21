const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';
const RECOVERY_KEY = 'fluxa.mvp.v1.recovery';
const storeInstances = new Set();
const crossTabSubscribers = new Set();
let storageListenerInstalled = false;

function nowIso() { return new Date().toISOString(); }
function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function errorMessage(error) { return String(error?.message || error || 'Falha desconhecida de armazenamento.'); }
function notifyPersistenceError(error) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return;
  globalThis.dispatchEvent(new CustomEvent('fluxa:persistence-error', { detail:{ message:errorMessage(error) } }));
}
function readStorage(key) {
  try { return { value:localStorage.getItem(key), error:null }; }
  catch (error) { return { value:null, error }; }
}

function emptyState() {
  return {
    version: 5,
    meta: { createdAt: nowIso(), updatedAt: nowIso(), lastPersistenceError: null },
    sessions: [], assistedEntities: [], events: [], preparationRuns: [], closingRuns: [],
    investigations: [], findings: [], treatments: [], treatmentComponents: [], componentReviews: [],
    treatmentReviews: [], assessments: [], reikiApplications: [], tools: [], customProtocols: [], settings: {}
  };
}

function list(value) { return Array.isArray(value) ? value : []; }
function hasFluxaShape(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Array.isArray(value.sessions) && Array.isArray(value.assistedEntities)
    && Array.isArray(value.events) && Array.isArray(value.treatments));
}

function normalize(parsed) {
  const base = emptyState();
  return {
    ...base, ...parsed, version: 5, meta: { ...base.meta, ...(parsed?.meta || {}) }, settings: { ...base.settings, ...(parsed?.settings || {}) },
    sessions:list(parsed?.sessions), assistedEntities:list(parsed?.assistedEntities), events:list(parsed?.events),
    preparationRuns:list(parsed?.preparationRuns), closingRuns:list(parsed?.closingRuns), investigations:list(parsed?.investigations),
    findings:list(parsed?.findings), treatments:list(parsed?.treatments), treatmentComponents:list(parsed?.treatmentComponents),
    componentReviews:list(parsed?.componentReviews), treatmentReviews:list(parsed?.treatmentReviews), assessments:list(parsed?.assessments),
    reikiApplications:list(parsed?.reikiApplications), tools:list(parsed?.tools), customProtocols:list(parsed?.customProtocols)
  };
}

function parseCandidate(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return hasFluxaShape(parsed) ? normalize(parsed) : null;
  } catch (_) { return null; }
}

function ensureStorageListener() {
  if (storageListenerInstalled || typeof globalThis.addEventListener !== 'function') return;
  storageListenerInstalled = true;
  globalThis.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    const next = parseCandidate(event.newValue);
    if (!next) return;
    crossTabSubscribers.forEach((subscriber) => subscriber(next));
  });
}

export function loadState() {
  const errors=[];
  for (const key of [STORAGE_KEY, RECOVERY_KEY, BACKUP_KEY]) {
    const result=readStorage(key);
    if (result.error) { errors.push(result.error); continue; }
    const candidate=parseCandidate(result.value);
    if (candidate) return candidate;
  }
  const fresh=emptyState();
  if (errors.length) {
    fresh.meta.lastPersistenceError=errorMessage(errors[0]);
    notifyPersistenceError(errors[0]);
  }
  return fresh;
}

export function saveState(state) {
  const next = normalize({ ...state, meta: { ...state.meta, updatedAt: nowIso(), lastPersistenceError: null } });
  const serialized = JSON.stringify(next);
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(RECOVERY_KEY, serialized);
    if (current && parseCandidate(current)) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(STORAGE_KEY, serialized);
    return next;
  } catch (error) {
    console.error('Fluxa: falha ao persistir dados locais', error);
    notifyPersistenceError(error);
    try {
      const fallback = normalize({ ...state, meta: { ...state.meta, updatedAt: nowIso(), lastPersistenceError: errorMessage(error) } });
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(fallback));
    } catch (_) {}
    const wrapped=new Error('Não foi possível salvar neste dispositivo. Verifique o armazenamento do navegador antes de continuar.');
    try { wrapped.cause=error; } catch (_) {}
    throw wrapped;
  }
}

export function createStore() {
  let state = loadState();
  const listeners = new Set();
  function notify() { listeners.forEach((listener) => listener(state)); }
  function syncFromPeer(nextState) { state = normalize(structuredClone(nextState)); notify(); }
  storeInstances.add(syncFromPeer);
  crossTabSubscribers.add(syncFromPeer);
  ensureStorageListener();
  return {
    getState() { return state; },
    setState(updater) {
      const proposed = typeof updater === 'function' ? updater(state) : updater;
      state = saveState(proposed);
      for (const sync of storeInstances) if (sync !== syncFromPeer) sync(state);
      notify();
      return state;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    makeId,
    nowIso
  };
}
