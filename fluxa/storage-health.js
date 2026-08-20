const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';
const RECOVERY_KEY = 'fluxa.mvp.v1.recovery';
const TEST_KEY = 'fluxa.mvp.storage.test';

function parse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

export function inspectStorageHealth() {
  let writable = true;
  let writeError = null;
  try {
    localStorage.setItem(TEST_KEY, '1');
    localStorage.removeItem(TEST_KEY);
  } catch (error) {
    writable = false;
    writeError = error?.name || 'StorageError';
  }

  const primaryRaw = localStorage.getItem(STORAGE_KEY);
  const backupRaw = localStorage.getItem(BACKUP_KEY);
  const recoveryRaw = localStorage.getItem(RECOVERY_KEY);
  const primary = parse(primaryRaw);
  const backup = parse(backupRaw);
  const recovery = parse(recoveryRaw);

  return {
    writable,
    writeError,
    hasPrimary: Boolean(primaryRaw),
    primaryValid: !primaryRaw || Boolean(primary),
    backupValid: Boolean(backup),
    recoveryValid: Boolean(recovery),
    canRecover: Boolean(backup || recovery),
    status: !writable ? 'WRITE_ERROR' : (primaryRaw && !primary ? 'PRIMARY_CORRUPT' : 'OK')
  };
}

export function recoverLocalData() {
  const backupRaw = localStorage.getItem(BACKUP_KEY);
  const recoveryRaw = localStorage.getItem(RECOVERY_KEY);
  const source = parse(backupRaw) ? backupRaw : (parse(recoveryRaw) ? recoveryRaw : null);
  if (!source) throw new Error('Nenhuma cópia local válida foi encontrada para recuperação.');
  localStorage.setItem(STORAGE_KEY, source);
  return true;
}

export function exportLocalDataFile() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || !parse(raw)) throw new Error('Não há dados locais válidos para exportar.');
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fluxa-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
