import assert from 'node:assert/strict';
import { inspectStorageHealth, recoverLocalData, importLocalDataText, validateImportPayload } from './storage-health.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

function payload(overrides={}) { return { version:4, sessions:[], assistedEntities:[], events:[], treatments:[], reikiApplications:[], ...overrides }; }

{
  const health = inspectStorageHealth();
  assert.equal(health.status, 'OK');
  assert.equal(health.writable, true);
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
  const imported = JSON.stringify(payload({ sessions:[{ id:'new' }], assistedEntities:[{ id:'a1' }] }));
  importLocalDataText(imported);
  const current=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
  assert.equal(current.sessions[0].id, 'new');
  assert.equal(current.version,5);
  assert.ok(Array.isArray(current.componentReviews));
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.backup')).sessions[0].id, 'old');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.recovery')).assistedEntities[0].id, 'a1');
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
}

console.log('storage-health.test.mjs: ok');
