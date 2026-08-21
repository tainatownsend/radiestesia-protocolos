import assert from 'node:assert/strict';
import { loadState, createStore } from './store.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
class ThrowingStorage {
  getItem(){throw new Error('storage blocked');}
  setItem(){throw new Error('storage blocked');}
  removeItem(){throw new Error('storage blocked');}
}
globalThis.localStorage=new MemoryStorage();

function state(id, updatedAt=null){return {version:4,meta:updatedAt?{updatedAt}:{},sessions:[{id}],assistedEntities:[],events:[],treatments:[]};}

localStorage.setItem('fluxa.mvp.v1',JSON.stringify({hello:'world'}));
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('backup')));
localStorage.setItem('fluxa.mvp.v1.recovery',JSON.stringify(state('recovery')));
const recovered=loadState();
assert.equal(recovered.sessions[0].id,'recovery','structurally invalid primary should fall through to recovery snapshot');
assert.equal(recovered.version,5);
assert.ok(Array.isArray(recovered.componentReviews));
assert.ok(Array.isArray(recovered.customProtocols));
assert.deepEqual(recovered.settings,{});

localStorage.map.clear();
localStorage.setItem('fluxa.mvp.v1','{invalid');
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('backup-only')));
assert.equal(loadState().sessions[0].id,'backup-only');

localStorage.map.clear();
localStorage.setItem('fluxa.mvp.v1',JSON.stringify(state('stale-primary','2026-08-20T10:00:00.000Z')));
localStorage.setItem('fluxa.mvp.v1.recovery',JSON.stringify(state('newer-recovery','2026-08-20T10:01:00.000Z')));
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('older-backup','2026-08-20T09:59:00.000Z')));
assert.equal(loadState().sessions[0].id,'newer-recovery','a newer recovery snapshot must win when a prior primary write failed after recovery was written');

localStorage.map.clear();
localStorage.setItem('fluxa.mvp.v1',JSON.stringify(state('primary-tie','2026-08-20T10:00:00.000Z')));
localStorage.setItem('fluxa.mvp.v1.recovery',JSON.stringify(state('recovery-tie','2026-08-20T10:00:00.000Z')));
assert.equal(loadState().sessions[0].id,'primary-tie','primary remains preferred when valid snapshots have the same update timestamp');

localStorage.map.clear();
const store=createStore();
store.setState((current)=>{
  const draft=structuredClone(current);
  draft.sessions.push({id:'new',status:'OPEN'});
  draft.customProtocols.push({id:'cp1',protocolKey:'mine',version:1,questions:[]});
  draft.settings={
    preparationLabels:{breathing:'Aterramento e respiração'},
    sessionTemplates:[{id:'template_1',name:'Acompanhamento',steps:['ASSESS','INVESTIGATE','TREAT']}]
  };
  return draft;
});
const persisted=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
assert.equal(persisted.version,5);
assert.equal(persisted.sessions[0].id,'new');
assert.ok(Array.isArray(persisted.componentReviews));
assert.equal(persisted.customProtocols[0].protocolKey,'mine');
assert.equal(persisted.settings.preparationLabels.breathing,'Aterramento e respiração');
assert.equal(persisted.settings.sessionTemplates[0].name,'Acompanhamento');
assert.deepEqual(persisted.settings.sessionTemplates[0].steps,['ASSESS','INVESTIGATE','TREAT']);

const reloaded=loadState();
assert.equal(reloaded.settings.sessionTemplates[0].id,'template_1');
assert.deepEqual(reloaded.settings.sessionTemplates[0].steps,['ASSESS','INVESTIGATE','TREAT']);

globalThis.localStorage=new ThrowingStorage();
const unavailable=loadState();
assert.equal(unavailable.version,5);
assert.equal(unavailable.sessions.length,0);
assert.match(unavailable.meta.lastPersistenceError,/storage blocked/,'read failure should surface in state metadata without crashing startup');
const unavailableStore=createStore();
assert.throws(()=>unavailableStore.setState((current)=>({...current,settings:{test:true}})),/Não foi possível salvar neste dispositivo/,'write failure should use a clear product-level error');

console.log('store.test.mjs: ok');
