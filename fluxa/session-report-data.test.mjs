import assert from 'node:assert/strict';
import { sessionInvestigations, sessionFindings, sessionTreatments, sessionComponents, sessionHawkinsMeasurements, sessionAssistedIds } from './session-report-data.js';

const state={
  sessions:[
    {id:'s1',startedAt:'2026-08-20T10:00:00.000Z',endedAt:'2026-08-20T11:00:00.000Z'},
    {id:'s2',startedAt:'2026-08-21T10:00:00.000Z',endedAt:'2026-08-21T11:00:00.000Z'}
  ],
  assistedEntities:[{id:'a1'},{id:'a2'}],
  investigations:[{id:'i1',originSessionId:'s1',currentSessionId:'s2',assistedEntityId:'a1'}],
  findings:[
    {id:'f1',investigationId:'i1',assistedEntityId:'a1',createdAt:'2026-08-20T10:30:00.000Z'},
    {id:'f2',investigationId:'i1',assistedEntityId:'a1',createdAt:'2026-08-21T10:30:00.000Z'}
  ],
  treatments:[{id:'t1',originSessionId:'s1',assistedEntityId:'a1'},{id:'t2',originSessionId:'s2',assistedEntityId:'a2'}],
  treatmentComponents:[
    {id:'c1',treatmentId:'t1',startedAt:'2026-08-20T10:40:00.000Z'},
    {id:'c2',treatmentId:'t1',startedAt:'2026-08-21T10:40:00.000Z'}
  ],
  assessments:[
    {id:'h1',kind:'HAWKINS_FREQUENCY',phase:'BASELINE',sessionId:'s1',assistedEntityId:'a1',hertz:520,occurredAt:'2026-08-20T10:10:00.000Z'},
    {id:'h2',kind:'HAWKINS_FREQUENCY',phase:'FINAL',sessionId:'s2',assistedEntityId:'a1',treatmentId:'t1',hertz:700,occurredAt:'2026-08-21T10:50:00.000Z'},
    {id:'h3',kind:'HAWKINS_FREQUENCY',phase:'BASELINE',sessionId:'s2',assistedEntityId:'a2',hertz:450,occurredAt:'2026-08-21T10:05:00.000Z'}
  ],reikiApplications:[],
  events:[
    {eventType:'INVESTIGATION_STARTED',entityType:'Investigation',entityId:'i1',sessionId:'s1',assistedEntityId:'a1'},
    {eventType:'FINDING_IDENTIFIED',entityType:'Finding',entityId:'f1',sessionId:'s1',assistedEntityId:'a1'},
    {eventType:'INVESTIGATION_RESUMED',entityType:'Investigation',entityId:'i1',sessionId:'s2',assistedEntityId:'a1'},
    {eventType:'FINDING_IDENTIFIED',entityType:'Finding',entityId:'f2',sessionId:'s2',assistedEntityId:'a1'},
    {eventType:'TREATMENT_CREATED',entityType:'Treatment',entityId:'t1',sessionId:'s1',assistedEntityId:'a1'},
    {eventType:'COMPONENT_STARTED',entityType:'TreatmentComponent',entityId:'c1',sessionId:'s1',assistedEntityId:'a1',metadata:{treatmentId:'t1'}},
    {eventType:'COMPONENT_ADDED',entityType:'TreatmentComponent',entityId:'c2',sessionId:'s2',assistedEntityId:'a1',metadata:{treatmentId:'t1'}},
    {eventType:'TREATMENT_CREATED',entityType:'Treatment',entityId:'t2',sessionId:'s2',assistedEntityId:'a2'}
  ]
};

assert.deepEqual(sessionInvestigations(state,'s1').map((item)=>item.id),['i1']);
assert.deepEqual(sessionInvestigations(state,'s2').map((item)=>item.id),['i1']);
assert.deepEqual(sessionFindings(state,'s1').map((item)=>item.id),['f1'],'old session report must not gain findings confirmed later');
assert.deepEqual(sessionFindings(state,'s2').map((item)=>item.id),['f2']);
assert.deepEqual(sessionTreatments(state,'s1').map((item)=>item.id),['t1']);
assert.deepEqual(sessionTreatments(state,'s2').map((item)=>item.id).sort(),['t1','t2'],'a later component event may legitimately touch an earlier longitudinal treatment');
assert.deepEqual(sessionComponents(state,'s1','t1').map((item)=>item.id),['c1'],'old session report must not gain components added later');
assert.deepEqual(sessionComponents(state,'s2','t1').map((item)=>item.id),['c2']);
assert.deepEqual(sessionHawkinsMeasurements(state,'s1','a1').map((item)=>item.id),['h1'],'old session report must not gain a final Hawkins measurement from a later session');
assert.deepEqual(sessionHawkinsMeasurements(state,'s2','a1').map((item)=>item.id),['h2']);
assert.deepEqual(sessionHawkinsMeasurements(state,'s2','a2').map((item)=>item.id),['h3']);
assert.deepEqual(sessionAssistedIds(state,'s1'),['a1']);
assert.deepEqual(new Set(sessionAssistedIds(state,'s2')),new Set(['a1','a2']));

const legacy={...state,events:[]};
assert.deepEqual(sessionFindings(legacy,'s1').map((item)=>item.id),['f1'],'legacy fallback must use the session time window');
assert.deepEqual(sessionComponents(legacy,'s1','t1').map((item)=>item.id),['c1'],'legacy component fallback must not leak later records');

console.log('session-report-data.test.mjs: ok');
