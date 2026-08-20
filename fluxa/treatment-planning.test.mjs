import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, TreatmentStatus, createAssistedEntity, startSession } from './domain.js';
import { createPlannedTreatment, startPlannedTreatment } from './treatment-planning.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

{
  const store = createStore();
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa teste', birthDate:'1990-01-01' });
  const planned = createPlannedTreatment(store, { assistedEntityId:assisted.id, title:'Ciclo futuro', notes:'Planejado fora de sessão' });
  assert.equal(planned.status, TreatmentStatus.PLANNED);
  assert.equal(planned.originSessionId, null);
  assert.equal(planned.startedAt, null);

  const session = startSession(store);
  startPlannedTreatment(store, planned.id, session.id);
  const started = store.getState().treatments.find((item) => item.id === planned.id);
  assert.equal(started.status, TreatmentStatus.IN_PROGRESS);
  assert.equal(started.originSessionId, session.id);
  assert.ok(started.startedAt);
  assert.equal(store.getState().sessions.find((item) => item.id === session.id).currentAssistedEntityId, assisted.id);
}

console.log('treatment-planning.test.mjs: ok');
