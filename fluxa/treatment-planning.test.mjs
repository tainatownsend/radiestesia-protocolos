import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, TreatmentStatus, PREPARATION_STEPS, createAssistedEntity, startSession, startPreparation, togglePreparationStep, completePreparation } from './domain.js';
import { createPlannedTreatment, startPlannedTreatment } from './treatment-planning.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

function prepare(store, sessionId) {
  const run = startPreparation(store, sessionId);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, run.id, step.key);
  completePreparation(store, run.id);
}

{
  const store = createStore();
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa teste', birthDate:'1990-01-01' });
  store.setState((state) => {
    const draft = structuredClone(state);
    draft.tools.push({ id:'tool_1', type:'GRAPH', name:'Gráfico A original', archivedAt:null, createdAt:store.nowIso(), updatedAt:store.nowIso() });
    return draft;
  });
  const planned = createPlannedTreatment(store, {
    assistedEntityId:assisted.id,
    title:'Ciclo futuro',
    notes:'Planejado fora de sessão',
    components:[
      { name:'Gráfico A', durationValue:2, durationUnit:'HOUR', toolId:'tool_1' },
      { name:'Recurso sem prazo' }
    ]
  });
  assert.equal(planned.status, TreatmentStatus.PLANNED);
  assert.equal(planned.originSessionId, null);
  assert.equal(planned.startedAt, null);
  const componentsBefore = store.getState().treatmentComponents.filter((item) => item.treatmentId === planned.id);
  assert.equal(componentsBefore.length, 2);
  assert.ok(componentsBefore.every((item) => item.status === TreatmentStatus.PLANNED));
  assert.ok(componentsBefore.every((item) => item.startedAt === null && item.expectedEndAt === null));
  assert.equal(componentsBefore[0].toolSnapshot.name, 'Gráfico A original');

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.tools.find((tool) => tool.id === 'tool_1').name = 'Gráfico renomeado depois';
    return draft;
  });
  assert.equal(store.getState().treatmentComponents.find((item) => item.id === componentsBefore[0].id).toolSnapshot.name, 'Gráfico A original');

  const session = startSession(store);
  assert.throws(() => startPlannedTreatment(store, planned.id, session.id), /preparação/);
  prepare(store, session.id);
  startPlannedTreatment(store, planned.id, session.id);
  const started = store.getState().treatments.find((item) => item.id === planned.id);
  assert.equal(started.status, TreatmentStatus.IN_PROGRESS);
  assert.equal(started.originSessionId, session.id);
  assert.ok(started.startedAt);
  assert.equal(store.getState().sessions.find((item) => item.id === session.id).currentAssistedEntityId, assisted.id);
  const componentsAfter = store.getState().treatmentComponents.filter((item) => item.treatmentId === planned.id);
  assert.ok(componentsAfter.every((item) => item.status === TreatmentStatus.IN_PROGRESS));
  assert.ok(componentsAfter.every((item) => item.startedAt === started.startedAt));
  assert.ok(componentsAfter[0].expectedEndAt);
  assert.equal(componentsAfter[0].toolSnapshot.name, 'Gráfico A original');
  assert.equal(componentsAfter[1].expectedEndAt, null);
}

console.log('treatment-planning.test.mjs: ok');
