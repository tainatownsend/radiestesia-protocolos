import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, createAssistedEntity } from './domain.js';
import { ReikiMode, startFlexibleReiki, pauseFlexibleReiki } from './reiki-flex.js';
import { activeReikiApplication, cancelReikiApplication } from './reiki-lifecycle.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

const store=createStore();
const assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa Reiki',birthDate:'1990-01-01'});
const first=startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.DISTANCE});
assert.equal(activeReikiApplication(store.getState()).id,first.id);
pauseFlexibleReiki(store,first.id);
assert.equal(activeReikiApplication(store.getState()).status,'PAUSED');
const canceled=cancelReikiApplication(store,first.id,'iniciada por engano');
assert.equal(canceled.status,'CANCELED');
assert.ok(canceled.canceledAt);
assert.equal(canceled.cancelReason,'iniciada por engano');
assert.equal(activeReikiApplication(store.getState()),null);
assert.ok(store.getState().events.some((event)=>event.eventType==='REIKI_CANCELED'&&event.entityId===first.id));

const second=startFlexibleReiki(store,{assistedEntityId:assisted.id,mode:ReikiMode.IN_PERSON});
assert.notEqual(second.id,first.id);
assert.equal(second.status,'RUNNING');

console.log('reiki-lifecycle.test.mjs: ok');
