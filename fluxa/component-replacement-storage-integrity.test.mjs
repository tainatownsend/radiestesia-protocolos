import assert from 'node:assert/strict';
import { validateStateReferences } from './storage-integrity.js';

function state(components){
  return {
    sessions:[{id:'s1',currentAssistedEntityId:'a1'}],
    assistedEntities:[{id:'a1'}],
    events:[],preparationRuns:[],closingRuns:[],investigations:[],findings:[],
    treatments:[{id:'t1',assistedEntityId:'a1'},{id:'t2',assistedEntityId:'a1'}],
    treatmentComponents:components,
    componentReviews:[],treatmentReviews:[],assessments:[],reikiApplications:[],tools:[],customProtocols:[]
  };
}

assert.equal(validateStateReferences(state([
  {id:'c1',treatmentId:'t1',replacedByComponentId:'c2'},
  {id:'c2',treatmentId:'t1'}
])),true,'a replacement component in the same treatment is valid');

assert.equal(validateStateReferences(state([
  {id:'legacy',treatmentId:'t1'}
])),true,'legacy components without replacement links remain valid');

assert.throws(()=>validateStateReferences(state([
  {id:'c1',treatmentId:'t1',replacedByComponentId:'missing'}
])),/TreatmentComponent\.replacedByComponentId.*inexistente/i,'replacement links must reference an existing component');

assert.throws(()=>validateStateReferences(state([
  {id:'c1',treatmentId:'t1',replacedByComponentId:'c1'}
])),/não pode apontar para si próprio como substituto/i,'a component cannot replace itself');

assert.throws(()=>validateStateReferences(state([
  {id:'c1',treatmentId:'t1',replacedByComponentId:'c2'},
  {id:'c2',treatmentId:'t2'}
])),/substituto de outro tratamento/i,'replacement links must stay inside the same treatment');

console.log('component-replacement-storage-integrity.test.mjs: ok');
