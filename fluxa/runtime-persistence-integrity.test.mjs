import assert from 'node:assert/strict';
import { createStore } from './store.js';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

globalThis.localStorage=new MemoryStorage();

const store=createStore();
store.setState((state)=>{
  const draft=structuredClone(state);
  draft.assistedEntities.push({id:'ast_1',type:'PERSON',displayName:'Pessoa',birthDate:'1990-01-01',archivedAt:null});
  draft.treatments.push({id:'trt_1',assistedEntityId:'ast_1',originSessionId:null,findingIds:[],title:'Tratamento válido',status:'PLANNED'});
  return draft;
});

const primaryBefore=localStorage.getItem('fluxa.mvp.v1');
const recoveryBefore=localStorage.getItem('fluxa.mvp.v1.recovery');
const backupBefore=localStorage.getItem('fluxa.mvp.v1.backup');
const memoryBefore=structuredClone(store.getState());

assert.throws(
  ()=>store.setState((state)=>{
    const draft=structuredClone(state);
    draft.treatmentComponents.push({id:'cmp_broken',treatmentId:'missing-treatment',name:'Inválido',status:'PLANNED'});
    return draft;
  }),
  /registro inexistente|TreatmentComponent\.treatmentId/i,
  'runtime mutations with broken references must be rejected before persistence'
);

assert.deepEqual(store.getState(),memoryBefore,'a rejected mutation must not replace the in-memory state');
assert.equal(localStorage.getItem('fluxa.mvp.v1'),primaryBefore,'a rejected mutation must not modify primary storage');
assert.equal(localStorage.getItem('fluxa.mvp.v1.recovery'),recoveryBefore,'a rejected mutation must not poison recovery storage');
assert.equal(localStorage.getItem('fluxa.mvp.v1.backup'),backupBefore,'a rejected mutation must not rotate backup storage');

assert.throws(
  ()=>store.setState((state)=>{
    const draft=structuredClone(state);
    draft.treatments.push({id:'trt_2',assistedEntityId:'missing-assisted',originSessionId:null,findingIds:[],title:'Outro inválido',status:'PLANNED'});
    return draft;
  }),
  /Treatment\.assistedEntityId|registro inexistente/i,
  'cross-entity integrity must also be enforced on normal runtime writes'
);

assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).treatments.length,1,'valid persisted data must remain intact after rejected writes');

console.log('runtime-persistence-integrity.test.mjs: ok');
