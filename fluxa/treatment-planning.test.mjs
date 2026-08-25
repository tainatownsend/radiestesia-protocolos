import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, TreatmentStatus, PREPARATION_STEPS, createAssistedEntity, selectAssistedForSession, startSession, startPreparation, togglePreparationStep, completePreparation } from './domain.js';
import { recordHawkinsBaseline } from './hawkins-measurement.js';
import { createPlannedTreatment, addPlannedTreatmentComponent, startPlannedTreatment } from './treatment-planning.js';

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

function recordBaseline(store, sessionId, assistedEntityId, hertz = 450) {
  selectAssistedForSession(store, sessionId, assistedEntityId);
  return recordHawkinsBaseline(store, { sessionId, assistedEntityId, hertz });
}

{
  const store = createStore();
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa teste', birthDate:'1990-01-01' });
  assert.throws(() => createPlannedTreatment(store, { assistedEntityId:assisted.id, title:'Sem componente', components:[] }), /componente/);

  // Compatibility with planned treatments created by earlier branch revisions.
  store.setState((state)=>{const draft=structuredClone(state);draft.treatments.push({id:'legacy_planned',assistedEntityId:assisted.id,title:'Planejado antigo',status:TreatmentStatus.PLANNED,createdAt:store.nowIso(),updatedAt:store.nowIso()});return draft;});
  const recoveredComponent=addPlannedTreatmentComponent(store,'legacy_planned',{name:'Componente recuperado'});
  assert.equal(recoveredComponent.status,TreatmentStatus.PLANNED);
  assert.equal(store.getState().treatmentComponents.filter((item)=>item.treatmentId==='legacy_planned').length,1);

  store.setState((state) => {
    const draft = structuredClone(state);
    draft.tools.push({ id:'tool_1', type:'GRAPH', name:'Gráfico A original', archivedAt:null, createdAt:store.nowIso(), updatedAt:store.nowIso() });
    draft.tools.push({ id:'tool_archived', type:'GRAPH', name:'Arquivado', archivedAt:store.nowIso(), createdAt:store.nowIso(), updatedAt:store.nowIso() });
    return draft;
  });
  assert.throws(() => createPlannedTreatment(store, {
    assistedEntityId:assisted.id, title:'Com recurso arquivado', components:[{name:'Arquivado',toolId:'tool_archived'}]
  }), /Biblioteca/);

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
  assert.throws(() => startPlannedTreatment(store, planned.id, session.id), /Hawkins|frequência vibracional/i, 'planned treatment start must require same-session Hawkins baseline');
  const baseline = recordBaseline(store, session.id, assisted.id, 480);
  startPlannedTreatment(store, planned.id, session.id);
  const started = store.getState().treatments.find((item) => item.id === planned.id);
  assert.equal(started.status, TreatmentStatus.IN_PROGRESS);
  assert.equal(started.originSessionId, session.id);
  assert.ok(started.startedAt);
  assert.equal(started.hawkinsBaselineAssessmentId, baseline.id);
  assert.equal(started.hawkinsBaselineHertz, 480);
  assert.equal(store.getState().sessions.find((item) => item.id === session.id).currentAssistedEntityId, assisted.id);
  const componentsAfter = store.getState().treatmentComponents.filter((item) => item.treatmentId === planned.id);
  assert.ok(componentsAfter.every((item) => item.status === TreatmentStatus.IN_PROGRESS));
  assert.ok(componentsAfter.every((item) => item.startedAt === started.startedAt));
  assert.ok(componentsAfter[0].expectedEndAt);
  assert.equal(componentsAfter[0].toolSnapshot.name, 'Gráfico A original');
  assert.equal(componentsAfter[1].expectedEndAt, null);
  const startEvent = store.getState().events.find((item) => item.eventType === 'TREATMENT_STARTED' && item.entityId === planned.id);
  assert.equal(startEvent.metadata.hawkinsBaselineHertz, 480);
}

{
  localStorage.map.clear();
  const store=createStore();
  const owner=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Dono do tratamento',birthDate:'1990-01-01'});
  const other=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Outro assistido',birthDate:'1991-01-01'});
  const planned=createPlannedTreatment(store,{assistedEntityId:owner.id,title:'Planejado com contexto',components:[{name:'Componente'}]});
  const session=startSession(store);prepare(store,session.id);selectAssistedForSession(store,session.id,other.id);
  const eventsBefore=store.getState().events.length;
  assert.throws(()=>startPlannedTreatment(store,planned.id,session.id),/Assistido atual não corresponde/i,'starting a planned treatment must not silently replace an explicitly selected different assisted context');
  assert.equal(store.getState().treatments.find((item)=>item.id===planned.id).status,TreatmentStatus.PLANNED);
  assert.equal(store.getState().sessions.find((item)=>item.id===session.id).currentAssistedEntityId,other.id);
  assert.equal(store.getState().events.length,eventsBefore,'rejected start must not create treatment/component events');

  selectAssistedForSession(store,session.id,owner.id);
  assert.throws(()=>startPlannedTreatment(store,planned.id,session.id),/Hawkins|frequência vibracional/i,'planned treatment must not start after assisted selection until Hawkins baseline exists');
  recordBaseline(store,session.id,owner.id,510);
  startPlannedTreatment(store,planned.id,session.id);
  assert.equal(store.getState().treatments.find((item)=>item.id===planned.id).status,TreatmentStatus.IN_PROGRESS);
}

console.log('treatment-planning.test.mjs: ok');
