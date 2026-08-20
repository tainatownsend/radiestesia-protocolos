const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';
const RECOVERY_KEY = 'fluxa.mvp.v1.recovery';
const TEST_KEY = 'fluxa.mvp.storage.test';
const CURRENT_VERSION = 5;

const COLLECTIONS = [
  'sessions','assistedEntities','events','preparationRuns','closingRuns','investigations','findings',
  'treatments','treatmentComponents','componentReviews','treatmentReviews','assessments','reikiApplications','tools'
];
const REQUIRED_COLLECTIONS = ['sessions','assistedEntities','events','treatments','reikiApplications'];

function parse(raw) { if (!raw) return null; try { return JSON.parse(raw); } catch (_) { return null; } }

function looksLikeFluxaData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.version != null && (!Number.isFinite(Number(value.version)) || Number(value.version) <= 0)) return false;
  if (!REQUIRED_COLLECTIONS.every((key) => Array.isArray(value[key]))) return false;
  if (COLLECTIONS.some((key) => value[key] != null && !Array.isArray(value[key]))) return false;
  return true;
}

function validCandidate(raw) { const value = parse(raw); return looksLikeFluxaData(value) ? value : null; }

function canonicalize(value) {
  const next = { ...value, version: CURRENT_VERSION };
  for (const key of COLLECTIONS) next[key] = Array.isArray(value[key]) ? value[key] : [];
  next.meta = { ...(value.meta && typeof value.meta === 'object' ? value.meta : {}), importedAt: new Date().toISOString() };
  return next;
}

export function inspectStorageHealth() {
  let writable = true;
  let writeError = null;
  try { localStorage.setItem(TEST_KEY, '1'); localStorage.removeItem(TEST_KEY); }
  catch (error) { writable = false; writeError = error?.name || 'StorageError'; }

  const primaryRaw = localStorage.getItem(STORAGE_KEY);
  const backupRaw = localStorage.getItem(BACKUP_KEY);
  const recoveryRaw = localStorage.getItem(RECOVERY_KEY);
  const primary = validCandidate(primaryRaw);
  const backup = validCandidate(backupRaw);
  const recovery = validCandidate(recoveryRaw);

  return {
    writable, writeError, hasPrimary:Boolean(primaryRaw), primaryValid:!primaryRaw || Boolean(primary),
    backupValid:Boolean(backup), recoveryValid:Boolean(recovery), canRecover:Boolean(backup || recovery),
    preferredRecoverySource: recovery ? 'RECOVERY' : (backup ? 'BACKUP' : null),
    status: !writable ? 'WRITE_ERROR' : (primaryRaw && !primary ? 'PRIMARY_CORRUPT' : 'OK')
  };
}

export function recoverLocalData() {
  const recoveryRaw = localStorage.getItem(RECOVERY_KEY);
  const backupRaw = localStorage.getItem(BACKUP_KEY);
  // RECOVERY is written before PRIMARY on each save and is therefore normally the newest recoverable state.
  const sourceRaw = validCandidate(recoveryRaw) ? recoveryRaw : (validCandidate(backupRaw) ? backupRaw : null);
  if (!sourceRaw) throw new Error('Nenhuma cópia local válida do Fluxa foi encontrada para recuperação.');
  const source = canonicalize(JSON.parse(sourceRaw));
  const serialized = JSON.stringify(source);
  localStorage.setItem(RECOVERY_KEY, serialized);
  localStorage.setItem(STORAGE_KEY, serialized);
  return true;
}

export function validateImportPayload(value) {
  if (!looksLikeFluxaData(value)) throw new Error('Este arquivo não parece ser uma cópia válida do Fluxa.');
  return canonicalize(value);
}

export function importLocalDataText(text) {
  const parsed = parse(text);
  const normalized = validateImportPayload(parsed);
  const current = localStorage.getItem(STORAGE_KEY);
  if (current && validCandidate(current)) localStorage.setItem(BACKUP_KEY, current);
  const serialized = JSON.stringify(normalized);
  localStorage.setItem(RECOVERY_KEY, serialized);
  localStorage.setItem(STORAGE_KEY, serialized);
  return true;
}

export function exportLocalDataFile() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || !validCandidate(raw)) throw new Error('Não há dados locais válidos do Fluxa para exportar.');
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fluxa-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
