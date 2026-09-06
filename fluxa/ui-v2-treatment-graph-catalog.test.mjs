import assert from 'node:assert/strict';
import { treatmentComposer } from './ui-v2/treatment/treatment-composer.js';

const draft = {
  title:'', objective:'', modalities:[], findingIds:[],
  items:[{ itemLabel:'', commands:[{ text:'', graphApplications:[{ graphName:'', durationValue:'', durationUnit:'DAY' }] }] }],
};

const freshHtml = treatmentComposer({
  assistedName:'Marina',
  modalityOptions:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  graphOptions:[],
  treatmentFindings:[],
  library:{ resources:[] },
}, { treatmentDraft:structuredClone(draft), error:'' });
assert.match(freshHtml,/value="Prosperador"/,'Fresh V2 treatment composer must still expose the starter graph catalog.');
assert.match(freshHtml,/value="Flor da Vida"/,'Starter graph suggestions must be available without storage seeding.');

const libraryHtml = treatmentComposer({
  assistedName:'Marina',
  modalityOptions:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  graphOptions:['Legacy fallback'],
  treatmentFindings:[],
  library:{ resources:[
    { id:'g1', name:'Meu gráfico', type:'GRAPH' },
    { id:'b1', name:'Biômetro X', type:'BIOMETER' },
  ] },
}, { treatmentDraft:structuredClone(draft), error:'' });
assert.match(libraryHtml,/value="Meu gráfico"/,'Composer should consume normalized graph resources from Acervo when available.');
assert.doesNotMatch(libraryHtml,/value="Biômetro X"/,'Non-graph resources must not leak into graph suggestions.');
assert.doesNotMatch(libraryHtml,/value="Legacy fallback"/,'Acervo graph resources should be authoritative over stale fallback names.');

console.log('ui-v2-treatment-graph-catalog.test.mjs: ok');
