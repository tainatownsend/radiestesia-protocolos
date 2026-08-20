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
    version: 1,
    meta: { createdAt: nowIso(), updatedAt: nowIso() },
    sessions: [],
    assistedEntities: [],
    events: [],
    preparationRuns: [],
    investigations: [],
    findings: [],
    treatments: [],
    treatmentComponents: [],
    reikiApplications: []
  };
}

function normalize(parsed) {
  const base = emptyState();
  return {
    ...base,
    ...parsed,
    meta: { ...base.meta, ...(parsed?.meta || {}) },
    sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    assistedEntities: Array.isArray(parsed?.assistedEntities) ? parsed.assistedEntities : [],
    events: Array.isArray(parsed?.events) ? parsed.events : [],
    preparationRuns: Array.isArray(parsed?.preparationRuns) ? parsed.preparationRuns : [],
    investigations: Array.isArray(parsed?.investigations) ? parsed.investigations : [],
    findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
    treatments: Array.isArray(parsed?.treatments) ? parsed.treatments : [],
    treatmentComponents: Array.isArray(parsed?.treatmentComponents) ? parsed.treatmentComponents : [],
    reikiApplications: Array.isArray(parsed?.reikiApplications) ? parsed.reikiApplications : []
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
