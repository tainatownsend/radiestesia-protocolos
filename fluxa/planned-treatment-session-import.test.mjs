import assert from 'node:assert/strict';
import { importLocalDataText, validateImportPayload } from './storage-health.js';
import { validateStateReferences } from './storage-integrity.js';

class MemoryStorage {
  constructor(){ this.map=new Map(); }
  getItem(key){ return this.map.has(key)?this.map.get(key):null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}
globalThis.localStorage=new MemoryStorage();

function payload(plannedInSessionId='ses_1'){
  return {
    version:5,
    sessions:[{ id:'ses_1', status:'CLOSED' }],
    assistedEntities:[{ id:'ast_1', displayName:'Marina' }],
    events:[],
    treatments:[{
      id:'trt_1',
      assistedEntityId:'ast_1',
      title:'Equilíbrio',
      status:'PLANNED',
      plannedInSessionId,
    }],
    reikiApplications:[],
  };
}

assert.doesNotThrow(()=>validateStateReferences(payload()), 'A treatment planned in an existing session must remain valid.');
assert.doesNotThrow(()=>validateImportPayload(payload()), 'The real import validator must accept an existing planned session reference.');

const broken=payload('ses_missing');
assert.throws(
  ()=>validateStateReferences(broken),
  /Treatment\.plannedInSessionId.*inexistente/i,
  'The storage invariant must reject an orphan plannedInSessionId.',
);
assert.throws(
  ()=>validateImportPayload(broken),
  /Treatment\.plannedInSessionId.*inexistente/i,
  'Import validation must reject the same orphan reference before any write.',
);

localStorage.setItem('fluxa.mvp.v1',JSON.stringify(payload()));
assert.throws(()=>importLocalDataText(JSON.stringify(broken)),/Treatment\.plannedInSessionId.*inexistente/i);
const primary=JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
assert.equal(primary.treatments[0].plannedInSessionId,'ses_1','A rejected import must preserve the current primary state.');
assert.equal(localStorage.getItem('fluxa.mvp.v1.backup'),null,'A rejected import must not rotate the primary into backup.');
assert.equal(localStorage.getItem('fluxa.mvp.v1.recovery'),null,'A rejected import must not create a recovery snapshot.');

console.log('planned-treatment-session-import.test.mjs: ok');
