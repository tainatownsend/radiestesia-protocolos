import assert from 'node:assert/strict';
import { inspectStorageHealth, recoverLocalData, importLocalDataText } from './storage-health.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

{
  const health = inspectStorageHealth();
  assert.equal(health.status, 'OK');
  assert.equal(health.writable, true);
}

{
  localStorage.setItem('fluxa.mvp.v1', '{invalid');
  localStorage.setItem('fluxa.mvp.v1.backup', JSON.stringify({ version:2, sessions:[{ id:'s1' }] }));
  const health = inspectStorageHealth();
  assert.equal(health.status, 'PRIMARY_CORRUPT');
  assert.equal(health.canRecover, true);
  recoverLocalData();
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id, 's1');
}

{
  localStorage.setItem('fluxa.mvp.v1', JSON.stringify({ sessions:[{ id:'old' }], assistedEntities:[], events:[], treatments:[] }));
  const imported = JSON.stringify({ sessions:[{ id:'new' }], assistedEntities:[{ id:'a1' }], events:[], treatments:[] });
  importLocalDataText(imported);
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id, 'new');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.backup')).sessions[0].id, 'old');
  assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1.recovery')).assistedEntities[0].id, 'a1');
}

{
  assert.throws(() => importLocalDataText(JSON.stringify({ hello:'world' })), /não parece ser uma cópia válida/i);
}

console.log('storage-health.test.mjs: ok');
