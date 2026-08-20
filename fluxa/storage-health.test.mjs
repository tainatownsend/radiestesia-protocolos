import assert from 'node:assert/strict';
import { inspectStorageHealth, recoverLocalData } from './storage-health.js';

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

console.log('storage-health.test.mjs: ok');
