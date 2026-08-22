import assert from 'node:assert/strict';
import { importLocalDataText } from './storage-health.js';

class MemoryStorage {
  constructor(){ this.map = new Map(); }
  getItem(key){ return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

globalThis.localStorage = new MemoryStorage();

const payload = {
  version:5,
  sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],
  assistedEntities:[{id:'a1',displayName:'Maria'}],
  events:[], preparationRuns:[], closingRuns:[], investigations:[], findings:[],
  treatments:[{
    id:'t1', originSessionId:'s1', assistedEntityId:'a1', status:'IN_PROGRESS', title:'Tratamento financeiro',
    treatmentTheme:'Financeiro',
    treatmentThemeSource:'../app.js',
    treatmentThemeSuggestionId:'../app.js:financialLimitingBeliefs'
  }],
  treatmentComponents:[], componentReviews:[], treatmentReviews:[], assessments:[],
  reikiApplications:[], tools:[], customProtocols:[], settings:{}
};

importLocalDataText(JSON.stringify(payload));
const restored = JSON.parse(localStorage.getItem('fluxa.mvp.v1'));
const treatment = restored.treatments.find((item) => item.id === 't1');
assert.equal(treatment.treatmentTheme,'Financeiro','Theme provenance must survive local backup/import.');
assert.equal(treatment.treatmentThemeSource,'../app.js','Theme source provenance must survive local backup/import.');
assert.equal(treatment.treatmentThemeSuggestionId,'../app.js:financialLimitingBeliefs','Exact selected suggestion provenance must survive local backup/import.');

const legacyPayload = structuredClone(payload);
delete legacyPayload.treatments[0].treatmentTheme;
delete legacyPayload.treatments[0].treatmentThemeSource;
delete legacyPayload.treatments[0].treatmentThemeSuggestionId;
importLocalDataText(JSON.stringify(legacyPayload));
const legacyTreatment = JSON.parse(localStorage.getItem('fluxa.mvp.v1')).treatments.find((item) => item.id === 't1');
assert.equal(legacyTreatment.treatmentTheme,undefined,'Legacy treatments without thematic provenance must remain import-compatible.');

console.log('treatment-theme-storage.test.mjs: ok');
