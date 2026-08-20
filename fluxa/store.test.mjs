import assert from 'node:assert/strict';
import { loadState, createStore } from './store.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();

function state(id){return {version:4,meta:{},sessions:[{id}],assistedEntities:[],events:[],treatments:[]};}

localStorage.setItem('fluxa.mvp.v1',JSON.stringify({hello:'world'}));
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('backup')));
localStorage.setItem('fluxa.mvp.v1.recovery',JSON.stringify(state('recovery')));
const recovered=loadState();
assert.equal(recovered.sessions[0].id,'recovery','structurally invalid primary should fall through to newest recovery snapshot');
assert.equal(recovered.version,5);
assert.ok(Array.isArray(recovered.componentReviews));
assert.ok(Array.isArray(recovered.customProtocols));
assert.deepEqual(recovered.settings,{});

localStorage.map.clear();
localStorage.setItem('fluxa.mvp.v1','{invalid');
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('backup-only')));
assert.equal(loadState().sessions[0].id,'backup-only');

localStorage.map.clear();
const store=createStore();
store.setState((current)=>{
  const draft=structuredClone(current);
  draft.sessions.push({id:'new',status:'OPEN'});
  draft.customProtocols.push({id:'cp1',protocolKey:'mine',version:1,questions:[]});
  draft.settings={preparationLabels:{breathing:'Aterramento e respiração'}};
  return draft;
});
const persisted=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
assert.equal(persisted.version,5);
assert.equal(persisted.sessions[0].id,'new');
assert.ok(Array.isArray(persisted.componentReviews));
assert.equal(persisted.customProtocols[0].protocolKey,'mine');
assert.equal(persisted.settings.preparationLabels.breathing,'Aterramento e respiração');

console.log('store.test.mjs: ok');
