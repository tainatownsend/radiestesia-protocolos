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
assert.equal(validateStateReferences(base({
  treatments:[{id:'legacy-next',assistedEntityId:'a1',recommendedByAssessmentId:'legacy-as'}],
  assessments:[{id:'legacy-as',assistedEntityId:'a1'}]
})),true,'Legacy recommendation links without explicit previousTreatmentId remain valid.');
assert.throws(()=>validateStateReferences(base({
  treatments:[{id:'t0',assistedEntityId:'a1'},{id:'t1',assistedEntityId:'a1',previousTreatmentId:'t0',recommendedByAssessmentId:'as1'}],
  assessments:[{id:'as1',assistedEntityId:'a2',treatmentId:'t0'}]
})),/recomendado por avaliação de outro Assistido/i,'A follow-up treatment cannot be recommended by another assisted entity assessment.');
assert.throws(()=>validateStateReferences(base({
  treatments:[{id:'t0',assistedEntityId:'a1'},{id:'t-other',assistedEntityId:'a1'},{id:'t1',assistedEntityId:'a1',previousTreatmentId:'t0',recommendedByAssessmentId:'as1'}],
  assessments:[{id:'as1',assistedEntityId:'a1',treatmentId:'t-other'}]
})),/não pertence ao ciclo anterior informado/i,'A follow-up recommendation must be the assessment of the recorded previous cycle.');
assert.throws(()=>validateStateReferences(base({
  treatments:[
    {id:'t0',assistedEntityId:'a1'},
    {id:'t1',assistedEntityId:'a1',previousTreatmentId:'t0',recommendedByAssessmentId:'as1'},
    {id:'t2',assistedEntityId:'a1',previousTreatmentId:'t0',recommendedByAssessmentId:'as1'}
  ],
  assessments:[{id:'as1',assistedEntityId:'a1',treatmentId:'t0'}]
})),/recomenda mais de um próximo ciclo/i,'One final assessment cannot originate multiple follow-up treatment cycles.');

const rootInvestigation={id:'root1',kind:'ROOT_PROTOCOL',protocolId:'p1',originSessionId:'s1',currentSessionId:'s1',assistedEntityId:'a1'};
const sourceAssessment={id:'as-source',sessionId:'s1',assistedEntityId:'a1',followUpAssessmentId:'as-orient'};
const orientingAssessment={id:'as-orient',kind:'ORIENTING',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'as-source',linkedInvestigationId:'root1',selectedProtocolId:'p1'};
const handoffAssessments=[sourceAssessment,orientingAssessment];
assert.equal(validateStateReferences(base({investigations:[rootInvestigation],assessments:handoffAssessments})),true);
assert.equal(validateStateReferences(base({assessments:[{id:'legacy-source',sessionId:'s1',assistedEntityId:'a1'},{id:'legacy-orient',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'legacy-source'}]})),true,'Legacy one-way handoff remains valid when the reciprocal field was never stored.');
assert.throws(()=>validateStateReferences(base({assessments:[{...orientingAssessment,sourceAssessmentId:'missing'}]})),/Assessment\.sourceAssessmentId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({assessments:[{...sourceAssessment,followUpAssessmentId:'missing'}]})),/Assessment\.followUpAssessmentId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({assessments:[sourceAssessment,{...orientingAssessment,linkedInvestigationId:'missing'}]})),/Assessment\.linkedInvestigationId.*inexistente/i);
assert.throws(()=>validateStateReferences(base({investigations:[rootInvestigation],assessments:[{...orientingAssessment,sourceAssessmentId:'as-orient'}]})),/não pode apontar para si própria/i);
assert.throws(()=>validateStateReferences(base({
  assessments:[{...sourceAssessment,assistedEntityId:'a2'},orientingAssessment],investigations:[rootInvestigation]
})),/avaliação (?:de origem|de continuidade).*outro Assistido/i);
assert.throws(()=>validateStateReferences(base({
  sessions:[{id:'s1',currentAssistedEntityId:'a1'},{id:'s2',currentAssistedEntityId:'a1'}],
  assessments:[{...sourceAssessment,sessionId:'s2'},orientingAssessment],investigations:[rootInvestigation]
})),/avaliação (?:de origem|de continuidade).*outra sessão/i);
assert.throws(()=>validateStateReferences(base({
  assessments:[
    {id:'as-source',sessionId:'s1',assistedEntityId:'a1'},
    {id:'as-orient-1',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'as-source'},
    {id:'as-orient-2',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'as-source'}
  ]
})),/mais de uma avaliação de continuidade/i,'One source assessment must not be claimed by multiple follow-up assessments.');
assert.throws(()=>validateStateReferences(base({
  assessments:[
    {id:'as-source',sessionId:'s1',assistedEntityId:'a1',followUpAssessmentId:'as-orient-2'},
    {id:'as-orient-1',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'as-source'},
    {id:'as-orient-2',sessionId:'s1',assistedEntityId:'a1'}
  ]
})),/aponta para outra continuidade/i,'Contradictory source/follow-up handoff references must be rejected.');
assert.throws(()=>validateStateReferences(base({
  assessments:[
    {id:'as-source-1',sessionId:'s1',assistedEntityId:'a1',followUpAssessmentId:'as-orient'},
    {id:'as-source-2',sessionId:'s1',assistedEntityId:'a1'},
    {id:'as-orient',sessionId:'s1',assistedEntityId:'a1',sourceAssessmentId:'as-source-2'}
  ]
})),/aponta para outra origem/i,'Contradictory follow-up/source handoff references must be rejected.');
assert.throws(()=>validateStateReferences(base({
  investigations:[{...rootInvestigation,assistedEntityId:'a2'}],assessments:handoffAssessments
})),/investigação vinculada.*outro Assistido/i);
assert.throws(()=>validateStateReferences(base({
  sessions:[{id:'s1',currentAssistedEntityId:'a1'},{id:'s2',currentAssistedEntityId:'a1'}],
  investigations:[{...rootInvestigation,currentSessionId:'s2'}],assessments:handoffAssessments
})),/investigação vinculada.*outra sessão/i);
assert.throws(()=>validateStateReferences(base({
  investigations:[{...rootInvestigation,protocolId:'p2'}],assessments:handoffAssessments
})),/protocolo selecionado.*não corresponde/i);

console.log('storage-integrity.test.mjs: ok');
