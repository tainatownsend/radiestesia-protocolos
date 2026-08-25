import assert from 'node:assert/strict';
import { resumeBranchingInvestigation, answerBranchingInvestigation } from './protocol-engine.js';

function makeStore(){
  let seq=0;
  let state={
    sessions:[
      {id:'s1',status:'OPEN',currentAssistedEntityId:'a1'},
      {id:'s2',status:'OPEN',currentAssistedEntityId:'a1'}
    ],
    preparationRuns:[
      {id:'p1',sessionId:'s1',status:'COMPLETED'},
      {id:'p2',sessionId:'s2',status:'COMPLETED'}
    ],
    assistedEntities:[{id:'a1',displayName:'Assistido',archivedAt:null}],
    assessments:[{id:'h1',kind:'HAWKINS_FREQUENCY',phase:'BASELINE',sessionId:'s1',assistedEntityId:'a1',hertz:430,occurredAt:'2026-08-25T10:00:00.000Z'}],
    investigations:[{
      id:'inv1',kind:'BRANCHING',originSessionId:'s1',currentSessionId:'s1',assistedEntityId:'a1',
      protocolId:'investigacao_inicial',protocolVersionId:'investigacao_inicial_v1',
      protocolSnapshot:{name:'Investigação inicial',nodes:{q1:{id:'q1',type:'QUESTION',text:'Existe um tema?',yes:'end',no:'end'},end:{id:'end',type:'END',title:'Fim'}}},
      status:'IN_PROGRESS',currentNodeId:'q1',answers:[],path:['q1'],startedAt:'2026-08-25T10:00:00.000Z',updatedAt:'2026-08-25T10:00:00.000Z'
    }],
    findings:[],events:[]
  };
  return {
    getState:()=>state,
    setState(updater){state=typeof updater==='function'?updater(state):updater;return state;},
    makeId(prefix='id'){return `${prefix}_${++seq}`;},
    nowIso(){return '2026-08-25T12:00:00.000Z';}
  };
}

const store=makeStore();
assert.throws(
  ()=>resumeBranchingInvestigation(store,'inv1','s2'),
  /Hawkins|frequência vibracional/i,
  'Resuming an investigation in a later session must require that session\'s own Hawkins baseline.'
);
assert.equal(store.getState().investigations[0].currentSessionId,'s1');
assert.equal(store.getState().events.length,0,'A rejected resume must not write history.');

store.setState(state=>{
  const draft=structuredClone(state);
  draft.assessments.push({id:'h2',kind:'HAWKINS_FREQUENCY',phase:'BASELINE',sessionId:'s2',assistedEntityId:'a1',hertz:470,occurredAt:'2026-08-25T12:00:00.000Z'});
  return draft;
});
resumeBranchingInvestigation(store,'inv1','s2');
assert.equal(store.getState().investigations[0].currentSessionId,'s2');
const resumed=store.getState().events.find(event=>event.eventType==='INVESTIGATION_RESUMED');
assert.ok(resumed,'Successful cross-session resume must be recorded.');
assert.equal(resumed.sessionId,'s2');
assert.equal(resumed.assistedEntityId,'a1');
assert.equal(resumed.metadata.hawkinsBaselineAssessmentId,'h2');
assert.equal(resumed.metadata.hawkinsBaselineHertz,470);

store.setState(state=>{
  const draft=structuredClone(state);
  draft.assessments=draft.assessments.filter(item=>item.id!=='h2');
  return draft;
});
assert.throws(
  ()=>answerBranchingInvestigation(store,'inv1','YES'),
  /Hawkins|frequência vibracional/i,
  'Answering a resumed investigation must still enforce the active session baseline at the domain layer.'
);
assert.equal(store.getState().investigations[0].answers.length,0);

console.log('investigation-resume-hawkins-guard.test.mjs: ok');
