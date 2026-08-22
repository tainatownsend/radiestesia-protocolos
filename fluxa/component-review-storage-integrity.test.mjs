import assert from 'node:assert/strict';
import { validateStateReferences } from './storage-integrity.js';

function state(review){
  return {
    sessions:[{id:'s1',currentAssistedEntityId:'a1'}],
    assistedEntities:[{id:'a1'},{id:'a2'}],
    events:[],preparationRuns:[],closingRuns:[],investigations:[],findings:[],
    treatments:[{id:'t1',assistedEntityId:'a1'},{id:'t2',assistedEntityId:'a1'}],
    treatmentComponents:[{id:'c1',treatmentId:'t1'},{id:'c2',treatmentId:'t2'}],
    componentReviews:review?[review]:[],treatmentReviews:[],assessments:[],reikiApplications:[],tools:[],customProtocols:[]
  };
}

const valid={id:'cr1',treatmentId:'t1',componentId:'c1',sessionId:'s1',assistedEntityId:'a1'};
assert.equal(validateStateReferences(state(valid)),true);
assert.throws(()=>validateStateReferences(state({...valid,treatmentId:'missing'})),/ComponentReview\.treatmentId.*inexistente/i);
assert.throws(()=>validateStateReferences(state({...valid,componentId:'missing'})),/ComponentReview\.componentId.*inexistente/i);
assert.throws(()=>validateStateReferences(state({...valid,sessionId:'missing'})),/ComponentReview\.sessionId.*inexistente/i);
assert.throws(()=>validateStateReferences(state({...valid,assistedEntityId:'missing'})),/ComponentReview\.assistedEntityId.*inexistente/i);
assert.throws(()=>validateStateReferences(state({...valid,assistedEntityId:'a2'})),/revisão de componente cr1.*outro Assistido/i);
assert.throws(()=>validateStateReferences(state({...valid,componentId:'c2'})),/componente de outro tratamento/i);

const duplicateState=state(valid);
duplicateState.componentReviews.push({...valid});
assert.throws(()=>validateStateReferences(duplicateState),/id duplicado.*componentReviews/i);

console.log('component-review-storage-integrity.test.mjs: ok');
