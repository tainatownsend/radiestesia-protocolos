import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType, TreatmentStatus, PREPARATION_STEPS,
  closeSession, completePreparation, createAssistedEntity, createTreatment,
  selectAssistedForSession, startPreparation, startSession, togglePreparationStep
} from './domain.js';
import { HAWKINS_KIND, HawkinsPhase, recordHawkinsBaseline } from './hawkins-measurement.js';
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
  const preparation = startPreparation(store, session.id);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, preparation.id, step.key);
  completePreparation(store, preparation.id);
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa administrativa', birthDate:'1980-01-01' });
  selectAssistedForSession(store,session.id,assisted.id);
  recordHawkinsBaseline(store,{sessionId:session.id,assistedEntityId:assisted.id,hertz:460});
  const { treatment, component } = createTreatment(store, { sessionId:session.id, assistedEntityId:assisted.id, title:'Tratamento administrativo', componentName:'Componente', durationValue:1, durationUnit:'DAY' });
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), false);
  stopTreatmentComponent(store, component.id, { sessionId:session.id, reason:'Resolvido anteriormente' });
  closeSession(store, session.id);
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), false, 'administrative completion must remain blocked without final Hawkins');
  assert.throws(
    () => completeTreatmentAdministratively(store, treatment.id, { confirmNoMeasurement:true }),
    /Hawkins.*obrigatória/i,
    'administrative completion must not bypass the mandatory final Hawkins lifecycle'
  );
  assert.equal(store.getState().treatments.find((item) => item.id === treatment.id).status, TreatmentStatus.IN_PROGRESS);

  const finalAssessment = {
    id:'final_admin',
    kind:HAWKINS_KIND,
    phase:HawkinsPhase.FINAL,
    treatmentId:treatment.id,
    sessionId:session.id,
    assistedEntityId:assisted.id,
    hertz:525,
    frequency:'525',
    occurredAt:'2026-08-20T11:00:00.000Z',
    createdAt:'2026-08-20T11:00:00.000Z'
  };
  store.setState((state) => { const draft=structuredClone(state); draft.assessments.push(finalAssessment); return draft; });
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), true);
  assert.throws(() => completeTreatmentAdministratively(store, treatment.id, {}), /nenhuma nova medição/i);
  completeTreatmentAdministratively(store, treatment.id, { confirmNoMeasurement:true, notes:'Apenas registro administrativo' });
  const completed = store.getState().treatments.find((item) => item.id === treatment.id);
  assert.equal(completed.status, TreatmentStatus.COMPLETED);
  assert.equal(completed.completedAdministratively, true);
  assert.equal(completed.hawkinsFinalAssessmentId, finalAssessment.id);
  assert.equal(completed.hawkinsFinalHertz, 525);
  const event = store.getState().events.filter((item) => item.entityId === treatment.id && item.eventType === 'TREATMENT_COMPLETED').at(-1);
  assert.equal(event.sessionId, null);
  assert.equal(event.metadata.administrative, true);
  assert.equal(event.metadata.measurementPerformedNow, false);
  assert.equal(event.metadata.finalAssessmentId, finalAssessment.id);
  assert.equal(event.metadata.hawkinsHertz, 525);
}

{
  globalThis.localStorage = new MemoryStorage();
  const store = createStore();
  const session = startSession(store);
  const preparation = startPreparation(store, session.id);
  for (const step of PREPARATION_STEPS) togglePreparationStep(store, preparation.id, step.key);
  completePreparation(store, preparation.id);
  const assisted = createAssistedEntity(store, { type:AssistedType.PERSON, displayName:'Pessoa com medição inválida', birthDate:'1980-01-01' });
  selectAssistedForSession(store,session.id,assisted.id);
  recordHawkinsBaseline(store,{sessionId:session.id,assistedEntityId:assisted.id,hertz:470});
  const { treatment, component } = createTreatment(store, { sessionId:session.id, assistedEntityId:assisted.id, title:'Tratamento protegido', componentName:'Componente' });
  stopTreatmentComponent(store, component.id, { sessionId:session.id, reason:'Resolvido' });
  closeSession(store,session.id);
  store.setState((state) => { const draft=structuredClone(state); draft.assessments.push({ id:'invalid_final', kind:HAWKINS_KIND, phase:HawkinsPhase.FINAL, treatmentId:treatment.id, assistedEntityId:assisted.id, hertz:0, frequency:'0', occurredAt:'2026-08-20T12:00:00.000Z', createdAt:'2026-08-20T12:00:00.000Z' }); return draft; });
  assert.equal(canCompleteTreatmentAdministratively(store.getState(), treatment.id), false, 'invalid final Hawkins must never unlock administrative completion');
  assert.throws(()=>completeTreatmentAdministratively(store,treatment.id,{confirmNoMeasurement:true}),/Hawkins.*obrigatória/i);
  assert.equal(store.getState().treatments.find((item)=>item.id===treatment.id).status,TreatmentStatus.IN_PROGRESS);
}

console.log('administrative-treatment.test.mjs: ok');
