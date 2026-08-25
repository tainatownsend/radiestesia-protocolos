import assert from 'node:assert/strict';
import { createStore } from './store.js';
import {
  AssistedType,
  completePreparation,
  createAssistedEntity,
  selectAssistedForSession,
  startPreparation,
  startReiki,
  startSession,
  togglePreparationStep
} from './domain.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Assistido Reiki legado',birthDate:'1990-01-01'});
const other=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Outro assistido',birthDate:'1991-01-01'});
const session=startSession(store);

assert.throws(
  ()=>startReiki(store,session.id,assisted.id),
  /Habilite Reiki/i,
  'legacy domain entry must reject new Reiki when the modality is disabled'
);
assert.equal(store.getState().reikiApplications.length,0,'rejected legacy Reiki start must not create application history');

store.setState((state)=>{const draft=structuredClone(state);draft.settings.therapeuticModalities={enabled:['REIKI']};return draft;});
assert.throws(
  ()=>startReiki(store,session.id,assisted.id),
  /preparação da sessão/i,
  'legacy domain entry must require completed session preparation'
);

const prep=startPreparation(store,session.id);
for(const step of prep.steps) togglePreparationStep(store,prep.id,step.key);
completePreparation(store,prep.id);

assert.throws(
  ()=>startReiki(store,session.id,assisted.id),
  /Selecione o Assistido da sessão/i,
  'legacy domain entry must require an explicit session assisted context'
);

selectAssistedForSession(store,session.id,other.id);
assert.throws(
  ()=>startReiki(store,session.id,assisted.id),
  /Assistido atual não corresponde/i,
  'legacy domain entry must reject a Reiki application for a different assisted entity'
);
assert.equal(store.getState().reikiApplications.length,0,'context rejection must not append Reiki history');

selectAssistedForSession(store,session.id,assisted.id);
const app=startReiki(store,session.id,assisted.id);
assert.equal(app.status,'RUNNING');
assert.equal(app.sessionId,session.id);
assert.equal(app.assistedEntityId,assisted.id);
assert.ok(store.getState().events.some((event)=>event.eventType==='REIKI_STARTED'&&event.entityId===app.id));

console.log('legacy-reiki-domain-guard.test.mjs: ok');
