const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';
const RECOVERY_KEY = 'fluxa.mvp.v1.recovery';

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState() {
  return {
    version: 3,
    meta: { createdAt: nowIso(), updatedAt: nowIso(), lastPersistenceError: null },
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
    assessments: [],
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
    version: 3,
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
    assessments: list(parsed?.assessments),
    reikiApplications: list(parsed?.reikiApplications)
  };
}

function parseCandidate(raw) {
  if (!raw) return null;
  try { return normalize(JSON.parse(raw)); } catch (_) { return null; }
}

export function loadState() {
  const primary = parseCandidate(localStorage.getItem(STORAGE_KEY));
  if (primary) return primary;
  const backup = parseCandidate(localStorage.getItem(BACKUP_KEY));
  if (backup) return backup;
  const recovery = parseCandidate(localStorage.getItem(RECOVERY_KEY));
  if (recovery) return recovery;
  return emptyState();
}

export function saveState(state) {
  const next = normalize({ ...state, meta: { ...state.meta, updatedAt: nowIso(), lastPersistenceError: null } });
  const current = localStorage.getItem(STORAGE_KEY);
  const serialized = JSON.stringify(next);
  try {
    // Recovery is written first so an interrupted primary write still leaves a valid candidate.
    localStorage.setItem(RECOVERY_KEY, serialized);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(STORAGE_KEY, serialized);
    return next;
  } catch (error) {
    console.error('Fluxa: falha ao persistir dados locais', error);
    try {
      const fallback = normalize({ ...state, meta: { ...state.meta, updatedAt: nowIso(), lastPersistenceError: String(error?.message || error) } });
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(fallback));
    } catch (_) {}
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
