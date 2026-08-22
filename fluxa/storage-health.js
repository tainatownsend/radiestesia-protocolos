import { validateStateReferences } from './storage-integrity.js';

const STORAGE_KEY = 'fluxa.mvp.v1';
const BACKUP_KEY = 'fluxa.mvp.v1.backup';
const RECOVERY_KEY = 'fluxa.mvp.v1.recovery';
const TEST_KEY = 'fluxa.mvp.storage.test';
const LAST_EXPORT_KEY = 'fluxa.lastSuccessfulExportAt';
const CURRENT_VERSION = 5;

const COLLECTIONS = [
  'sessions','assistedEntities','events','preparationRuns','closingRuns','investigations','findings',
  'treatments','treatmentComponents','componentReviews','treatmentReviews','assessments','reikiApplications','tools','customProtocols'
];
const REQUIRED_COLLECTIONS = ['sessions','assistedEntities','events','treatments','reikiApplications'];

function parse(raw) { if (!raw) return null; try { return JSON.parse(raw); } catch (_) { return null; } }
function errorMessage(error) { return String(error?.message || error || 'Falha desconhecida de armazenamento.'); }
function read(key) { try { return { value:localStorage.getItem(key), error:null }; } catch (error) { return { value:null, error }; } }
function write(key,value) { try { localStorage.setItem(key,value); return null; } catch (error) { return error; } }
function storageAccessError(operation,error) {
  const wrapped=new Error(`Não foi possível ${operation} porque o navegador bloqueou o armazenamento local do Fluxa.`);
  try { wrapped.cause=error; } catch (_) {}
  return wrapped;
}
function schemaVersion(value) {
  if (value?.version == null) return null;
  const version=Number(value.version);
  return Number.isFinite(version)?version:null;
}
function hasUnsupportedFutureVersion(value) {
  const version=schemaVersion(value);
  return version!=null&&version>CURRENT_VERSION;
}

function looksLikeFluxaData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const version=schemaVersion(value);
  if (value.version != null && (version==null || version <= 0 || version > CURRENT_VERSION)) return false;
  if (!REQUIRED_COLLECTIONS.every((key) => Array.isArray(value[key]))) return false;
  if (COLLECTIONS.some((key) => value[key] != null && !Array.isArray(value[key]))) return false;
  return true;
}

function validCandidate(raw) { const value = parse(raw); return looksLikeFluxaData(value) ? value : null; }
function validSemanticCandidate(raw) {
  const value=validCandidate(raw);if(!value)return null;
  try { validateStateReferences(value); return value; } catch (_) { return null; }
}

function canonicalize(value) {
  const next = { ...value, version: CURRENT_VERSION };
  for (const key of COLLECTIONS) next[key] = Array.isArray(value[key]) ? value[key] : [];
  next.settings = value.settings && typeof value.settings === 'object' && !Array.isArray(value.settings) ? value.settings : {};
  next.meta = { ...(value.meta && typeof value.meta === 'object' ? value.meta : {}), importedAt: new Date().toISOString() };
  return next;
}

export function inspectStorageHealth() {
  let writable = true;
  let writeError = null;
  try { localStorage.setItem(TEST_KEY, '1'); localStorage.removeItem(TEST_KEY); }
  catch (error) { writable = false; writeError = error?.name || errorMessage(error); }

  const primaryRead=read(STORAGE_KEY);
  const backupRead=read(BACKUP_KEY);
  const recoveryRead=read(RECOVERY_KEY);
  const exportRead=read(LAST_EXPORT_KEY);
  const readError=primaryRead.error||backupRead.error||recoveryRead.error||exportRead.error;
  const primaryRaw=primaryRead.value;
  const backupRaw=backupRead.value;
  const recoveryRaw=recoveryRead.value;
  const primary=validCandidate(primaryRaw);
  const backup=validSemanticCandidate(backupRaw);
  const recovery=validSemanticCandidate(recoveryRaw);

  return {
    writable:writable&&!readError,
    writeError,
    readError:readError?errorMessage(readError):null,
    hasPrimary:Boolean(primaryRaw),
    primaryValid:!primaryRaw||Boolean(primary),
    backupValid:Boolean(backup),
    recoveryValid:Boolean(recovery),
    canRecover:Boolean(backup||recovery),
    preferredRecoverySource:recovery?'RECOVERY':(backup?'BACKUP':null),
    lastExportAt:exportRead.value,
    status:readError?'READ_ERROR':(!writable?'WRITE_ERROR':(primaryRaw&&!primary?'PRIMARY_CORRUPT':'OK'))
  };
}

export function recoverLocalData() {
  const recoveryRead=read(RECOVERY_KEY);
  const backupRead=read(BACKUP_KEY);
  if(recoveryRead.error||backupRead.error)throw storageAccessError('ler as cópias de recuperação',recoveryRead.error||backupRead.error);
  const sourceRaw=validSemanticCandidate(recoveryRead.value)?recoveryRead.value:(validSemanticCandidate(backupRead.value)?backupRead.value:null);
  if(!sourceRaw)throw new Error('Nenhuma cópia local válida do Fluxa foi encontrada para recuperação.');
  const source=canonicalize(JSON.parse(sourceRaw));
  validateStateReferences(source);
  const serialized=JSON.stringify(source);
  const recoveryError=write(RECOVERY_KEY,serialized);if(recoveryError)throw storageAccessError('gravar a cópia de recuperação',recoveryError);
  const primaryError=write(STORAGE_KEY,serialized);if(primaryError)throw storageAccessError('restaurar os dados principais',primaryError);
  return true;
}

export function validateImportPayload(value) {
  if (hasUnsupportedFutureVersion(value)) throw new Error(`Este backup foi criado por uma versão mais nova do Fluxa (schema ${schemaVersion(value)}). Atualize o Fluxa antes de importar para não perder dados.`);
  if (!looksLikeFluxaData(value)) throw new Error('Este arquivo não parece ser uma cópia válida do Fluxa.');
  const normalized=canonicalize(value);
  validateStateReferences(normalized);
  return normalized;
}

export function importLocalDataText(text) {
  const parsed=parse(text);
  const normalized=validateImportPayload(parsed);
  const currentRead=read(STORAGE_KEY);
  if(currentRead.error)throw storageAccessError('ler os dados atuais antes da importação',currentRead.error);
  if(currentRead.value&&validCandidate(currentRead.value)){
    const backupError=write(BACKUP_KEY,currentRead.value);if(backupError)throw storageAccessError('preservar o backup anterior',backupError);
  }
  const serialized=JSON.stringify(normalized);
  const recoveryError=write(RECOVERY_KEY,serialized);if(recoveryError)throw storageAccessError('gravar a cópia de recuperação da importação',recoveryError);
  const primaryError=write(STORAGE_KEY,serialized);if(primaryError)throw storageAccessError('concluir a importação',primaryError);
  return true;
}

export function exportLocalDataFile() {
  const currentRead=read(STORAGE_KEY);
  if(currentRead.error)throw storageAccessError('ler os dados para exportação',currentRead.error);
  const raw=currentRead.value;
  if(!raw||!validCandidate(raw))throw new Error('Não há dados locais válidos do Fluxa para exportar.');
  const blob=new Blob([raw],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`fluxa-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
  // Safari/iOS may still be starting the download when click() returns.
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  // A successful file export should not be invalidated solely because this convenience timestamp cannot be stored.
  write(LAST_EXPORT_KEY,new Date().toISOString());
}
