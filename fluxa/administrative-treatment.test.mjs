import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, TreatmentStatus, closeSession, createAssistedEntity, createTreatment, startSession } from './domain.js';
import { stopTreatmentComponent } from './backlog.js';
import { canCompleteTreatmentAdministratively, completeTreatmentAdministratively } from './administrative-treatment.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

{
  const store = createStore();
  const session = startSession(store);
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa administrativa', birthDate:'1980-01-01' });
  const { treatment, component } = createTreatment(store, { sessionId:session.id, assistedEntityId:assisted.id, title:'Tratamento administrativo', componentName:'Componente', durationValue:1, durationUnit:'DAY' });
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), false);
  stopTreatmentComponent(store, component.id, { sessionId:session.id, reason:'Resolvido anteriormente' });
  closeSession(store, session.id);
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), true);
  assert.throws(() => completeTreatmentAdministratively(store, treatment.id, {}), /nenhuma nova medição/i);
  completeTreatmentAdministratively(store, treatment.id, { confirmNoMeasurement:true, notes:'Apenas registro administrativo' });
  const completed = store.getState().treatments.find((item) => item.id === treatment.id);
  assert.equal(completed.status, TreatmentStatus.COMPLETED);
  assert.equal(completed.completedAdministratively, true);
  const event = store.getState().events.filter((item) => item.entityId === treatment.id && item.eventType === 'TREATMENT_COMPLETED').at(-1);
  assert.equal(event.sessionId, null);
  assert.equal(event.metadata.administrative, true);
  assert.equal(event.metadata.measurementPerformedNow, false);
}

console.log('administrative-treatment.test.mjs: ok');
