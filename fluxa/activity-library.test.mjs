import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, createAssistedEntity, selectAssistedForSession, startSession } from './domain.js';
import { ActivityLibraryEventType, ToolType, activeTools, archiveTool, createTool, recordGeneralAssessment } from './activity-library.js';

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
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa teste', birthDate:'1990-01-01' });
  selectAssistedForSession(store, session.id, assisted.id);
  const assessment = recordGeneralAssessment(store, {
    sessionId: session.id,
    assistedEntityId: assisted.id,
    subject: 'Frequência vibracional',
    result: '8500',
    scale: 'escala teste'
  });
  assert.equal(assessment.kind, 'GENERAL');
  assert.equal(store.getState().assessments.length, 1);
  assert.equal(store.getState().events.at(-1).eventType, ActivityLibraryEventType.ASSESSMENT_RECORDED);
}

{
  localStorage.map.clear();
  const store = createStore();
  const graph = createTool(store, { type:ToolType.GRAPH, name:'Gráfico teste', purpose:'Teste' });
  const meter = createTool(store, { type:ToolType.BIOMETER, name:'Biômetro teste' });
  assert.deepEqual(activeTools(store.getState()).map((item) => item.id).sort(), [graph.id, meter.id].sort());
  archiveTool(store, graph.id);
  assert.deepEqual(activeTools(store.getState()).map((item) => item.id), [meter.id]);
  assert.ok(store.getState().tools.find((item) => item.id === graph.id).archivedAt);
}

console.log('activity-library.test.mjs: ok');
