import assert from 'node:assert/strict';
import { inspectStorageHealth, recoverLocalData, importLocalDataText, validateImportPayload } from './storage-health.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
class ThrowingStorage {
  getItem(){throw new Error('blocked storage read');}
  setItem(){throw new Error('blocked storage write');}
  removeItem(){throw new Error('blocked storage remove');}
}

globalThis.localStorage = new MemoryStorage();

function payload(overrides={}) { return { version:4, sessions:[], assistedEntities:[], events:[], treatments:[], reikiApplications:[], ...overrides }; }

{
  const health = inspectStorageHealth();
  assert.equal(health.status, 'OK');
  assert.equal(health.writable, true);
  assert.equal(health.lastExportAt,null);
}

{
  localStorage.setItem('fluxa.mvp.v1', '{invalid');
  localStorage.setItem('fluxa.mvp.v1.backup', JSON.stringify(payload({ sessions:[{ id:'older-backup' }] })));
  localStorage.setItem('fluxa.mvp.v1.recovery', JSON.stringify(payload({ sessions:[{ id:'newer-recovery' }] })));
  const health = inspectStorageHealth();
  assert.equal(health.status, 'PRIMARY_CORRUPT');
  assert.equal(health.canRecover, true);
  assert.equal(health.preferredRecoverySource,'RECOVERY');
  recoverLocalData();
  const restored=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
  assert.equal(restored.sessions[0].id, 'newer-recovery');
  assert.equal(restored.version,5);
  assert.ok(Array.isArray(restored.componentReviews));
  assert.ok(Array.isArray(restored.tools));
  assert.ok(Array.isArray(restored.customProtocols));
  assert.deepEqual(restored.settings,{});
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.mvp.v1','{invalid');
  localStorage.setItem('fluxa.mvp.v1.recovery','{also-invalid');
  localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(payload({sessions:[{id:'backup-fallback'}]})));
  assert.equal(inspectStorageHealth().preferredRecoverySource,'BACKUP');
  recoverLocalData();
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id,'backup-fallback');
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.mvp.v1', JSON.stringify(payload({ sessions:[{ id:'old' }] })));
  const imported = JSON.stringify(payload({
    sessions:[{ id:'new' }],
    assistedEntities:[{ id:'a1' }],
    customProtocols:[{id:'cp1',protocolKey:'mine',version:1,questions:[]}],
    settings:{preparationLabels:{breathing:'Respirar'}}
  }));
  importLocalDataText(imported);
  const current=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
  assert.equal(current.sessions[0].id, 'new');
  assert.equal(current.version,5);
  assert.ok(Array.isArray(current.componentReviews));
  assert.equal(current.customProtocols[0].protocolKey,'mine');
  assert.equal(current.settings.preparationLabels.breathing,'Respirar');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.backup')).sessions[0].id, 'old');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.recovery')).assistedEntities[0].id, 'a1');
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.mvp.v1', JSON.stringify(payload({ sessions:[{ id:'keep-current' }] })));
  const future=JSON.stringify(payload({version:6,sessions:[{id:'future'}],futureOnlyField:{must:'survive'}}));
  assert.throws(()=>importLocalDataText(future),/versão mais nova|schema 6/i,'future backups must never be silently downgraded');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id,'keep-current','failed future import must preserve current data');
  assert.equal(localStorage.getItem('fluxa.mvp.v1.backup'),null,'rejected import must not mutate backup state');
  assert.throws(()=>validateImportPayload(payload({version:99})),/versão mais nova|schema 99/i);
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.mvp.v1',JSON.stringify(payload({version:6,sessions:[{id:'future-primary'}]})));
  localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(payload({sessions:[{id:'compatible-backup'}]})));
  const health=inspectStorageHealth();
  assert.equal(health.status,'PRIMARY_CORRUPT','a future primary must not be rewritten by an older runtime');
  assert.equal(health.preferredRecoverySource,'BACKUP');
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.lastSuccessfulExportAt','2026-08-20T10:00:00.000Z');
  assert.equal(inspectStorageHealth().lastExportAt,'2026-08-20T10:00:00.000Z');
}

{
  localStorage.map.clear();
  localStorage.setItem('fluxa.mvp.v1', JSON.stringify({ hello:'world' }));
  const health=inspectStorageHealth();
  assert.equal(health.status,'PRIMARY_CORRUPT','unrelated JSON is not a valid Fluxa primary');
}

{
  assert.throws(() => importLocalDataText(JSON.stringify({ hello:'world' })), /não parece ser uma cópia válida/i);
  assert.throws(() => validateImportPayload(payload({ tools:{} })), /não parece ser uma cópia válida/i);
  assert.throws(() => validateImportPayload(payload({ customProtocols:{} })), /não parece ser uma cópia válida/i);
}

{
  globalThis.localStorage=new ThrowingStorage();
  const health=inspectStorageHealth();
  assert.equal(health.status,'READ_ERROR');
  assert.equal(health.writable,false);
  assert.match(health.readError,/blocked storage read/);
  assert.throws(()=>recoverLocalData(),/navegador bloqueou o armazenamento local/i);
  assert.throws(()=>importLocalDataText(JSON.stringify(payload())),/navegador bloqueou o armazenamento local/i);
}

console.log('storage-health.test.mjs: ok');
