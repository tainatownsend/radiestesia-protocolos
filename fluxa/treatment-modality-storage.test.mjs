import assert from 'node:assert/strict';
import { importLocalDataText } from './storage-health.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); }
  getItem(key){ return this.map.has(key)?this.map.get(key):null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

globalThis.localStorage=new MemoryStorage();

const payload={
  version:5,
  sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],
  assistedEntities:[{id:'a1',displayName:'Maria'}],
  events:[],preparationRuns:[],closingRuns:[],investigations:[],findings:[],
  treatments:[{
    id:'t1',originSessionId:'s1',assistedEntityId:'a1',status:'IN_PROGRESS',title:'Tratamento integrado',
    modalities:['RADIESTHESIA','REIKI','BACH_FLOWERS','CUSTOM_0'],
    modalitySnapshots:[
      {id:'RADIESTHESIA',label:'Radiestesia'},
      {id:'REIKI',label:'Aplicação de Reiki'},
      {id:'BACH_FLOWERS',label:'Florais de Bach'},
      {id:'CUSTOM_0',label:'Aromaterapia'}
    ]
  }],
  treatmentComponents:[],componentReviews:[],treatmentReviews:[],assessments:[],
  reikiApplications:[],tools:[],customProtocols:[],settings:{}
};

importLocalDataText(JSON.stringify(payload));
let restored=JSON.parse(localStorage.getItem('fluxa.mvp.v1')).treatments.find(item=>item.id==='t1');
assert.deepEqual(restored.modalities,payload.treatments[0].modalities,'Treatment modality IDs must survive local backup/import.');
assert.deepEqual(restored.modalitySnapshots,payload.treatments[0].modalitySnapshots,'Treatment modality labels must survive local backup/import.');
assert.equal(restored.modalitySnapshots[0].id,'RADIESTHESIA','Radiestesia must remain the recorded base modality.');

const legacyPayload=structuredClone(payload);
delete legacyPayload.treatments[0].modalities;
delete legacyPayload.treatments[0].modalitySnapshots;
importLocalDataText(JSON.stringify(legacyPayload));
restored=JSON.parse(localStorage.getItem('fluxa.mvp.v1')).treatments.find(item=>item.id==='t1');
assert.equal(restored.modalities,undefined,'Legacy treatments without modality metadata must remain import-compatible.');
assert.equal(restored.modalitySnapshots,undefined,'Legacy treatments without modality snapshots must remain import-compatible.');

console.log('treatment-modality-storage.test.mjs: ok');
