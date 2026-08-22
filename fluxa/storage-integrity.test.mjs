import assert from 'node:assert/strict';
import { validateStateReferences } from './storage-integrity.js';

function base(overrides={}){
  return {
    sessions:[{id:'s1',currentAssistedEntityId:'a1'}],
    assistedEntities:[{id:'a1'},{id:'a2'}],
    events:[{id:'e1',sessionId:'s1',assistedEntityId:'a1'}],
    preparationRuns:[],closingRuns:[],investigations:[],findings:[],treatments:[],treatmentComponents:[],treatmentReviews:[],assessments:[],reikiApplications:[],tools:[],customProtocols:[],
    ...overrides
  };
}

assert.equal(validateStateReferences(base()),true);
assert.throws(()=>validateStateReferences(base({sessions:[{id:'s1',currentAssistedEntityId:'missing'}]})),/Session\.currentAssistedEntityId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({assistedEntities:[{id:'a1'},{id:'a1'}]})),/id duplicado.*assistedEntities/i);
assert.throws(()=>validateStateReferences(base({events:[{id:'e1'},{id:'e1'}]})),/id duplicado.*events/i);

const investigation={id:'i1',originSessionId:'s1',currentSessionId:'s1',assistedEntityId:'a1'};
const finding={id:'f1',investigationId:'i1',assistedEntityId:'a1'};
const treatment={id:'t1',originSessionId:'s1',assistedEntityId:'a1',findingIds:['f1']};
const component={id:'c1',treatmentId:'t1'};
const complete=base({investigations:[investigation],findings:[finding],treatments:[treatment],treatmentComponents:[component]});
assert.equal(validateStateReferences(complete),true);

assert.throws(()=>validateStateReferences(base({investigations:[{...investigation,assistedEntityId:'missing'}]})),/Investigation\.assistedEntityId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({investigations:[investigation],findings:[{...finding,investigationId:'missing'}]})),/Finding\.investigationId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({investigations:[investigation],findings:[{...finding,assistedEntityId:'a2'}]})),/achado f1.*Assistido diferente/i);
assert.throws(()=>validateStateReferences(base({investigations:[investigation],findings:[finding],treatments:[{...treatment,assistedEntityId:'a2'}]})),/tratamento t1.*achado de outro Assistido/i);
assert.throws(()=>validateStateReferences(base({treatmentComponents:[{id:'c1',treatmentId:'missing'}]})),/TreatmentComponent\.treatmentId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({treatments:[{id:'t1',assistedEntityId:'a1'}],reikiApplications:[{id:'r1',assistedEntityId:'a2',treatmentId:'t1'}]})),/Reiki r1.*outro Assistido/i);
assert.throws(()=>validateStateReferences(base({events:[{id:'e1',sessionId:'missing',assistedEntityId:'a1'}]})),/Event\.sessionId.*inexistente/i);

assert.throws(()=>validateStateReferences(base({treatments:[{id:'t1',assistedEntityId:'a1',previousTreatmentId:'t1'}]})),/não pode apontar para si próprio/i);
assert.throws(()=>validateStateReferences(base({treatments:[{id:'t0',assistedEntityId:'a2'},{id:'t1',assistedEntityId:'a1',previousTreatmentId:'t0'}]})),/ciclo anterior de outro Assistido/i);
assert.throws(()=>validateStateReferences(base({treatments:[{id:'t1',assistedEntityId:'a1',recommendedByAssessmentId:'missing'}]})),/recommendedByAssessmentId.*inexistente/i);
assert.equal(validateStateReferences(base({
  treatments:[{id:'t0',assistedEntityId:'a1'},{id:'t1',assistedEntityId:'a1',previousTreatmentId:'t0',recommendedByAssessmentId:'as1'}],
  assessments:[{id:'as1',assistedEntityId:'a1',treatmentId:'t0'}]
})),true);

console.log('storage-integrity.test.mjs: ok');
