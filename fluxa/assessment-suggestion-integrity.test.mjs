import assert from 'node:assert/strict';
import { validateStateReferences } from './storage-integrity.js';

function base(assessmentOverrides={},investigationOverrides={}){
  return {
    sessions:[{id:'s1',currentAssistedEntityId:'a1'},{id:'s2',currentAssistedEntityId:'a1'}],
    assistedEntities:[{id:'a1'}],
    events:[],preparationRuns:[],closingRuns:[],findings:[],treatments:[],treatmentComponents:[],treatmentReviews:[],reikiApplications:[],tools:[],customProtocols:[],
    investigations:[{id:'i1',kind:'ROOT_PROTOCOL',protocolId:'p1',originSessionId:'s1',currentSessionId:'s1',assistedEntityId:'a1',...investigationOverrides}],
    assessments:[{
      id:'as1',kind:'ORIENTING',sessionId:'s1',assistedEntityId:'a1',
      protocolSuggestions:[{protocolId:'p1',protocolName:'Vida Financeira'},{protocolId:'p2',protocolName:'Prosperidade e Abundância'}],
      selectedProtocolId:'p1',selectedProtocolName:'Vida Financeira',linkedInvestigationId:'i1',
      ...assessmentOverrides
    }]
  };
}

assert.equal(validateStateReferences(base()),true,'A current assessment handoff matching its recorded suggestion snapshot must remain valid.');

assert.equal(validateStateReferences(base({}, {currentSessionId:'s2'})),true,'A historical assessment handoff must remain valid after its linked investigation is resumed in a later session.');

assert.throws(()=>validateStateReferences(base({
  protocolSuggestions:[{protocolId:'p2',protocolName:'Prosperidade e Abundância'}]
})),/não pertence às sugestões registradas/i,'A backup must not inject a protocol selection that was never suggested by the assessment.');

assert.throws(()=>validateStateReferences(base({
  protocolSuggestions:[]
})),/protocolo selecionado sem sugestões registradas/i,'An explicitly empty current-format suggestion snapshot must not be treated as a legacy handoff.');

assert.throws(()=>validateStateReferences(base({
  selectedProtocolName:'Nome adulterado'
})),/nome do protocolo selecionado.*não corresponde à sugestão registrada/i,'A backup must not rewrite the selected protocol name independently from the recorded suggestion snapshot.');

assert.throws(()=>validateStateReferences(base({
  selectedProtocolName:''
})),/nome do protocolo selecionado.*não corresponde à sugestão registrada/i,'Current-format handoffs must keep the selected protocol name recorded.');

assert.throws(()=>validateStateReferences(base({
  protocolSuggestions:[{protocolId:'p1',protocolName:''},{protocolId:'p2',protocolName:'Prosperidade e Abundância'}]
})),/nome do protocolo selecionado.*não corresponde à sugestão registrada/i,'Current-format handoffs must keep the selected suggestion name recorded.');

assert.equal(validateStateReferences(base({
  protocolSuggestions:undefined,
  selectedProtocolName:undefined
})),true,'Legacy handoffs without a suggestion snapshot must remain import-compatible when their existing investigation link is otherwise consistent.');

console.log('assessment-suggestion-integrity.test.mjs: ok');
