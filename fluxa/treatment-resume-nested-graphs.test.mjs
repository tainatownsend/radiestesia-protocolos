import assert from 'node:assert/strict';
import { resumeTreatmentPreservingDuration } from './backlog.js';

function makeStore(){
  let state={
    sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],
    preparationRuns:[{id:'p1',sessionId:'s1',status:'COMPLETED'}],
    assessments:[{id:'h1',kind:'HAWKINS_FREQUENCY',phase:'BASELINE',sessionId:'s1',assistedEntityId:'a1',hertz:495,occurredAt:'2026-08-22T13:55:00.000Z'}],
    treatments:[{id:'t1',assistedEntityId:'a1',status:'INTERRUPTED',interruptedAt:'2026-08-22T12:00:00.000Z'}],
    treatmentComponents:[{
      id:'c1',treatmentId:'t1',status:'INTERRUPTED',expectedEndAt:'2026-08-23T12:00:00.000Z',
      semanticsVersion:2,
      commands:[{id:'cmd1',text:'Harmonizar',graphApplications:[
        {id:'g1',graphName:'Prosperador',noDuration:false,expectedEndAt:'2026-08-22T18:00:00.000Z'},
        {id:'g2',graphName:'Sem prazo',noDuration:true,expectedEndAt:null}
      ]}]
    }],
    events:[]
  };
  return {
    getState:()=>state,
    setState(updater){state=typeof updater==='function'?updater(state):updater;return state;},
    makeId(prefix){return `${prefix}_${state.events.length+1}`;},
    nowIso(){return '2026-08-22T14:00:00.000Z';}
  };
}

const store=makeStore();
resumeTreatmentPreservingDuration(store,'t1',{preserveRemainingDuration:true});
const state=store.getState();
const treatment=state.treatments.find(item=>item.id==='t1');
const component=state.treatmentComponents.find(item=>item.id==='c1');
assert.equal(treatment.status,'IN_PROGRESS');
assert.equal(component.status,'IN_PROGRESS');
assert.equal(component.expectedEndAt,'2026-08-23T14:00:00.000Z','component review deadline must exclude the interruption interval');
assert.equal(component.commands[0].graphApplications[0].expectedEndAt,'2026-08-22T20:00:00.000Z','current item → command → graph deadline must exclude the interruption interval');
assert.equal(component.commands[0].graphApplications[1].expectedEndAt,null,'no-deadline graphs must remain without a deadline');
const rescheduled=state.events.find(event=>event.eventType==='COMPONENT_RESCHEDULED');
assert.equal(rescheduled.metadata.pauseMs,2*60*60*1000);
assert.equal(rescheduled.metadata.graphDeadlinesShifted,1,'reschedule history must record the shifted nested graph count');
const resumed=state.events.find(event=>event.eventType==='TREATMENT_RESUMED');
assert.equal(resumed.metadata.hawkinsBaselineAssessmentId,'h1');
assert.equal(resumed.metadata.hawkinsBaselineHertz,495);

console.log('treatment-resume-nested-graphs.test.mjs: ok');
