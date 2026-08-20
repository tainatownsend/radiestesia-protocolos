const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState() {
  return {
    version: 2,
    meta: { createdAt: nowIso(), updatedAt: nowIso() },
    sessions: [],
    assistedEntities: [],
    events: [],
    preparationRuns: [],
    closingRuns: [],
    investigations: [],
    findings: [],
    treatments: [],
    treatmentComponents: [],
    treatmentReviews: [],
    reikiApplications: []
  };
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(parsed) {
  const base = emptyState();
  return {
    ...base,
    ...parsed,
    version: 2,
    meta: { ...base.meta, ...(parsed?.meta || {}) },
    sessions: list(parsed?.sessions),
    assistedEntities: list(parsed?.assistedEntities),
    events: list(parsed?.events),
    preparationRuns: list(parsed?.preparationRuns),
    closingRuns: list(parsed?.closingRuns),
    investigations: list(parsed?.investigations),
    findings: list(parsed?.findings),
    treatments: list(parsed?.treatments),
    treatmentComponents: list(parsed?.treatmentComponents),
    treatmentReviews: list(parsed?.treatmentReviews),
    reikiApplications: list(parsed?.reikiApplications)
  };
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    return normalize(JSON.parse(raw));
  } catch (error) {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      try {
        return normalize(JSON.parse(backup));
      } catch (_) {}
    }
    console.error('Fluxa: falha ao carregar dados locais', error);
    return emptyState();
  }
}

export function saveState(state) {
  const next = normalize({ ...state, meta: { ...state.meta, updatedAt: nowIso() } });
  const current = localStorage.getItem(STORAGE_KEY);
  try {
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Fluxa: falha ao persistir dados locais', error);
    throw error;
  }
}

export function createStore() {
  let state = loadState();
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState() {
      return state;
    },
    setState(updater) {
      const proposed = typeof updater === 'function' ? updater(state) : updater;
      state = saveState(proposed);
      notify();
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    makeId,
    nowIso
  };
}
