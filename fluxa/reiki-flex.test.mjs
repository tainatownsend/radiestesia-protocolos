import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, createAssistedEntity, selectAssistedForSession, startPreparation, startSession, togglePreparationStep, completePreparation } from './domain.js';
import { ReikiMode, startFlexibleReiki, pauseFlexibleReiki, resumeFlexibleReiki, completeFlexibleReiki, recoverStaleFlexibleReiki } from './reiki-flex.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa Reiki',birthDate:'1990-01-01'});
assert.throws(
  ()=>startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE}),
  /Habilite Reiki/i,
  'new outside-session Reiki must respect configured therapeutic modalities at the domain layer'
);
assert.equal(store.getState().reikiApplications.length,0,'rejected Reiki start must not create application history');
store.setState((state)=>{const draft=structuredClone(state);draft.settings.therapeuticModalities={enabled:['REIKI']};return draft;});
const app=startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE});
assert.equal(app.sessionId,null);
assert.equal(app.mode,ReikiMode.DISTANCE);
assert.equal(app.status,'RUNNING');
assert.throws(()=>recoverStaleFlexibleReiki(store,app.id),/fora de sessão/i,'outside-session Reiki must use the normal completion path, never recovery');

pauseFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'PAUSED');
assert.throws(()=>startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.IN_PERSON}),/aplicação de Reiki ativa/);
resumeFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'RUNNING');
completeFlexibleReiki(store,app.id,'registro');
const done=store.getState().reikiApplications[0];
assert.equal(done.status,'COMPLETED');
assert.equal(done.sessionId,null);
assert.equal(done.notes,'registro');
assert.ok(store.getState().events.some((e)=>e.eventType==='REIKI_COMPLETED' && e.metadata.outsideSession===true));

const sessionOwner=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Reiki sessão',birthDate:'1992-02-02'});
const other=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Outro contexto',birthDate:'1993-03-03'});
const session=startSession(store);
selectAssistedForSession(store,session.id,other.id);
const countBefore=store.getState().reikiApplications.length;
assert.throws(
  ()=>startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON}),
  /preparação da sessão/i,
  'session Reiki must not start before the session preparation is completed'
);
assert.equal(store.getState().reikiApplications.length,countBefore,'rejected unprepared session Reiki must not create an application');
const prep=startPreparation(store,session.id);
for(const step of prep.steps) togglePreparationStep(store,prep.id,step.key);
completePreparation(store,prep.id);
assert.throws(
  ()=>startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON}),
  /Assistido atual não corresponde/i,
  'session Reiki must not start for a different assisted entity than the explicit session context'
);
assert.equal(store.getState().reikiApplications.length,countBefore,'rejected session Reiki start must not create an application');
assert.equal(store.getState().sessions.find((item)=>item.id===session.id).currentAssistedEntityId,other.id,'rejected start must not replace session context');

selectAssistedForSession(store,session.id,sessionOwner.id);
const sessionApp=startFlexibleReiki(store,{sessionId:session.id,assistedEntityId:sessionOwner.id,mode:ReikiMode.IN_PERSON});
assert.throws(()=>recoverStaleFlexibleReiki(store,sessionApp.id),/sessão aberta/i,'recovery must never cancel Reiki that still belongs to an open session');
const startedSnapshot=structuredClone(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id));
selectAssistedForSession(store,session.id,other.id);
const eventsBeforeRejectedPause=store.getState().events.length;
assert.throws(
  ()=>pauseFlexibleReiki(store,sessionApp.id),
  /Assistido atual não corresponde/i,
  'running session Reiki must not pause while the session points at a different assisted entity'
);
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id),startedSnapshot,'rejected flexible pause must preserve the application');
assert.equal(store.getState().events.length,eventsBeforeRejectedPause,'rejected flexible pause must not append history');

const eventsBeforeRejectedComplete=store.getState().events.length;
assert.throws(
  ()=>completeFlexibleReiki(store,sessionApp.id,'contexto incorreto'),
  /Assistido atual não corresponde/i,
  'running session Reiki must not complete while the session points at a different assisted entity'
);
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id),startedSnapshot,'rejected flexible completion must preserve the application');
assert.equal(store.getState().events.length,eventsBeforeRejectedComplete,'rejected flexible completion must not append history');

selectAssistedForSession(store,session.id,sessionOwner.id);
pauseFlexibleReiki(store,sessionApp.id);
selectAssistedForSession(store,session.id,other.id);
const pausedSnapshot=structuredClone(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id));
const eventsBeforeResume=store.getState().events.length;
assert.throws(
  ()=>resumeFlexibleReiki(store,sessionApp.id),
  /Assistido atual não corresponde/i,
  'paused session Reiki must not resume while the session points at a different assisted entity'
);
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id),pausedSnapshot,'rejected resume must preserve the application');
assert.equal(store.getState().events.length,eventsBeforeResume,'rejected resume must not append history');

const eventsBeforePausedComplete=store.getState().events.length;
assert.throws(
  ()=>completeFlexibleReiki(store,sessionApp.id,'ainda incorreto'),
  /Assistido atual não corresponde/i,
  'paused session Reiki must not complete while the session points at a different assisted entity'
);
assert.deepEqual(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id),pausedSnapshot,'rejected paused completion must preserve the application');
assert.equal(store.getState().events.length,eventsBeforePausedComplete,'rejected paused completion must not append history');

selectAssistedForSession(store,session.id,sessionOwner.id);
store.setState((state)=>{const draft=structuredClone(state);draft.settings.therapeuticModalities={enabled:[]};return draft;});
resumeFlexibleReiki(store,sessionApp.id);
assert.equal(store.getState().reikiApplications.find((item)=>item.id===sessionApp.id).status,'RUNNING','existing Reiki must remain resumable after modality is disabled so it can be concluded safely');
completeFlexibleReiki(store,sessionApp.id,'sessão alinhada');

store.setState((state)=>{
  const draft=structuredClone(state);
  const linkedSession=draft.sessions.find((item)=>item.id===session.id);
  linkedSession.status='CLOSED';
  linkedSession.closedAt='2026-09-06T10:30:00.000Z';
  draft.reikiApplications.push({
    id:'reiki_stale',
    sessionId:session.id,
    assistedEntityId:sessionOwner.id,
    mode:ReikiMode.DISTANCE,
    status:'RUNNING',
    startedAt:'2026-09-06T10:00:00.000Z',
    endedAt:null,
    durationSeconds:null,
    notes:null,
    intervals:[{id:'int_stale',startedAt:'2026-09-06T10:00:00.000Z',endedAt:null}],
    createdAt:'2026-09-06T10:00:00.000Z',
    updatedAt:'2026-09-06T10:00:00.000Z',
  });
  return draft;
});
completeFlexibleReiki(store,'reiki_stale','recuperado após sessão antiga');
const stale=store.getState().reikiApplications.find((item)=>item.id==='reiki_stale');
assert.equal(stale.status,'CANCELED','closed-session Reiki must be canceled, never falsely completed');
assert.ok(stale.endedAt,'recovery must close the stale application');
assert.ok(Number.isFinite(stale.durationSeconds),'recovery must preserve a duration snapshot');
assert.equal(stale.notes,'recuperado após sessão antiga');
const recoveryEvent=store.getState().events.find((e)=>e.eventType==='REIKI_CANCELED' && e.entityId==='reiki_stale');
assert.ok(recoveryEvent,'recovery must append an auditable cancellation event');
assert.equal(recoveryEvent.sessionId,session.id,'recovery must preserve the original session reference');
assert.equal(recoveryEvent.metadata.recovery,true);
assert.equal(recoveryEvent.metadata.staleSessionContext,true);
assert.equal(store.getState().sessions.find((item)=>item.id===session.id).status,'CLOSED','recovering stale Reiki must not reopen or alter the closed session');

console.log('reiki-flex.test.mjs: ok');
