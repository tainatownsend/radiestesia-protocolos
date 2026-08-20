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
assert.equal(loadState().sessions[0].id,'recovery','structurally invalid primary should fall through to newest recovery snapshot');
assert.equal(loadState().version,5);
assert.ok(Array.isArray(loadState().componentReviews));

localStorage.map.clear();
localStorage.setItem('fluxa.mvp.v1','{invalid');
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(state('backup-only')));
assert.equal(loadState().sessions[0].id,'backup-only');

localStorage.map.clear();
const store=createStore();
store.setState((current)=>{const draft=structuredClone(current);draft.sessions.push({id:'new',status:'OPEN'});return draft;});
const persisted=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
assert.equal(persisted.version,5);
assert.equal(persisted.sessions[0].id,'new');
assert.ok(Array.isArray(persisted.componentReviews));

console.log('store.test.mjs: ok');
