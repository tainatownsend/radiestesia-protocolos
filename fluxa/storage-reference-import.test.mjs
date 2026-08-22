import assert from 'node:assert/strict';
import { importLocalDataText, inspectStorageHealth, recoverLocalData } from './storage-health.js';

class MemoryStorage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}
globalThis.localStorage=new MemoryStorage();

function payload(overrides={}){
  return {version:5,sessions:[],assistedEntities:[],events:[],treatments:[],reikiApplications:[],...overrides};
}

localStorage.setItem('fluxa.mvp.v1',JSON.stringify(payload({sessions:[{id:'keep'}]})));
const broken=payload({
  assistedEntities:[{id:'a1'}],
  treatments:[{id:'t1',assistedEntityId:'a1'}],
  treatmentComponents:[{id:'c1',treatmentId:'missing'}]
});
assert.throws(()=>importLocalDataText(JSON.stringify(broken)),/TreatmentComponent\.treatmentId.*inexistente/i);
assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id,'keep','invalid import must preserve current primary');
assert.equal(localStorage.getItem('fluxa.mvp.v1.backup'),null,'invalid import must not rotate backup');

localStorage.map.clear();
const brokenRecovery=payload({
  assistedEntities:[{id:'a1'}],
  treatments:[{id:'t1',assistedEntityId:'a1'}],
  treatmentComponents:[{id:'c1',treatmentId:'missing'}]
});
const validBackup=payload({sessions:[{id:'safe'}]});
localStorage.setItem('fluxa.mvp.v1','{corrupt');
localStorage.setItem('fluxa.mvp.v1.recovery',JSON.stringify(brokenRecovery));
localStorage.setItem('fluxa.mvp.v1.backup',JSON.stringify(validBackup));
const health=inspectStorageHealth();
assert.equal(health.recoveryValid,false,'semantically broken recovery snapshot must not be offered');
assert.equal(health.backupValid,true);
assert.equal(health.preferredRecoverySource,'BACKUP');
recoverLocalData();
assert.equal(JSON.parse(localStorage.getItem('fluxa.mvp.v1')).sessions[0].id,'safe');

console.log('storage-reference-import.test.mjs: ok');
