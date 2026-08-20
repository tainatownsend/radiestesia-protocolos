import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, createAssistedEntity } from './domain.js';
import { ReikiMode, startFlexibleReiki, pauseFlexibleReiki, resumeFlexibleReiki, completeFlexibleReiki } from './reiki-flex.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa Reiki',birthDate:'1990-01-01'});
const app=startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE});
assert.equal(app.sessionId,null);
assert.equal(app.mode,ReikiMode.DISTANCE);
assert.equal(app.status,'RUNNING');

pauseFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'PAUSED');
resumeFlexibleReiki(store,app.id);
assert.equal(store.getState().reikiApplications[0].status,'RUNNING');
completeFlexibleReiki(store,app.id,'registro');
const done=store.getState().reikiApplications[0];
assert.equal(done.status,'COMPLETED');
assert.equal(done.sessionId,null);
assert.equal(done.notes,'registro');
assert.ok(store.getState().events.some((e)=>e.eventType==='REIKI_COMPLETED' && e.metadata.outsideSession===true));

console.log('reiki-flex.test.mjs: ok');
