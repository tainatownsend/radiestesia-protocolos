import assert from 'node:assert/strict';
import { validateStateReferences } from './storage-integrity.js';

function state(overrides={}){
  return {
    sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],
    assistedEntities:[{id:'a1',displayName:'Maria'}],
    events:[],preparationRuns:[],closingRuns:[],findings:[],treatmentComponents:[],treatmentReviews:[],reikiApplications:[],tools:[],customProtocols:[],
    investigations:[{id:'i1',kind:'ROOT_PROTOCOL',protocolId:'p1',originSessionId:'s1',currentSessionId:'s1',assistedEntityId:'a1'}],
    treatments:[
      {
        id:'t1',originSessionId:'s1',assistedEntityId:'a1',status:'COMPLETED',
        treatmentTheme:'Financeiro',treatmentThemeSource:'../app.js',treatmentThemeSuggestionId:'../app.js:financialLimitingBeliefs'
      },
      {
        id:'t2',originSessionId:'s1',assistedEntityId:'a1',status:'IN_PROGRESS',
        previousTreatmentId:'t1',recommendedByAssessmentId:'as2'
      }
    ],
    assessments:[
      {id:'as1',kind:'GENERAL',sessionId:'s1',assistedEntityId:'a1',treatmentId:'t1',followUpAssessmentId:'as2'},
      {
        id:'as2',kind:'ORIENTING',sessionId:'s1',assistedEntityId:'a1',treatmentId:'t1',sourceAssessmentId:'as1',
        protocolSuggestions:[{protocolId:'p1',protocolName:'Vida Financeira'}],
        selectedProtocolId:'p1',selectedProtocolName:'Vida Financeira',linkedInvestigationId:'i1'
      }
    ],
    ...overrides
  };
}

assert.equal(
  validateStateReferences(state()),
  true,
  'Theme discovery, assessment handoff, and the recommended next treatment must coexist as one valid local-first provenance chain.'
);

const wrongPrevious=state();
wrongPrevious.treatments.splice(1,0,{id:'t-other',originSessionId:'s1',assistedEntityId:'a1'});
wrongPrevious.treatments.find((item)=>item.id==='t2').previousTreatmentId='t-other';
assert.throws(
  ()=>validateStateReferences(wrongPrevious),
  /não pertence ao ciclo anterior informado/i,
  'The next cycle must not detach its recommending assessment from the actual previous treatment.'
);

const wrongProtocol=state();
wrongProtocol.assessments.find((item)=>item.id==='as2').selectedProtocolId='p2';
assert.throws(
  ()=>validateStateReferences(wrongProtocol),
  /não pertence às sugestões registradas|não corresponde à investigação vinculada/i,
  'The assessment-to-protocol handoff must not be rewritten independently from its recorded suggestion and investigation.'
);

const duplicateNext=state();
duplicateNext.treatments.push({
  id:'t3',originSessionId:'s1',assistedEntityId:'a1',previousTreatmentId:'t1',recommendedByAssessmentId:'as2'
});
assert.throws(
  ()=>validateStateReferences(duplicateNext),
  /recomenda mais de um próximo ciclo/i,
  'One final assessment must remain the provenance source for at most one next treatment cycle.'
);

console.log('treatment-continuity-provenance.test.mjs: ok');
