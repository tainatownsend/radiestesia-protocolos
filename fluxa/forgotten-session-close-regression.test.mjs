import assert from 'node:assert/strict';
import { EventType } from './domain.js';
import { BacklogEventType, correctForgottenSessionClose } from './backlog.js';

function iso(ms) { return new Date(ms).toISOString(); }
function buildState(startedAt) {
  return {
    sessions:[{ id:'ses_1', status:'OPEN', startedAt, endedAt:null, closedRecordedAt:null, updatedAt:startedAt }],
    reikiApplications:[], closingRuns:[], events:[]
  };
}
function makeStore(initialState, recordedAt) {
  let state=structuredClone(initialState); let sequence=0;
  return {
    getState:()=>state,
    setState:(updater)=>{ state=updater(state); },
    makeId:(prefix)=>`${prefix}_${++sequence}`,
    nowIso:()=>recordedAt
  };
}

const now=Date.now();
const startedAt=iso(now-2*60*60*1000);
const validEndedAt=iso(now-60*60*1000);
const recordedAt=iso(now-30*60*1000);

let store=makeStore(buildState(startedAt),recordedAt);
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',startedAt),
  /posterior ao início/i,
  'corrected close must reject a timestamp equal to session start'
);
assert.equal(store.getState().sessions[0].status,'OPEN','rejected correction must leave the session open');
assert.equal(store.getState().events.length,0,'rejected correction must not create history');

store=makeStore(buildState(startedAt),recordedAt);
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',iso(now-3*60*60*1000)),
  /posterior ao início/i,
  'corrected close must reject a timestamp before session start'
);
assert.equal(store.getState().closingRuns.length,0,'invalid historical timestamp must not create a closing run');

store=makeStore(buildState(startedAt),recordedAt);
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',iso(now+60*60*1000)),
  /não pode estar no futuro/i,
  'corrected close must reject future timestamps'
);

store=makeStore({
  ...buildState(startedAt),
  reikiApplications:[{ id:'rk_1', sessionId:'ses_1', status:'PAUSED' }]
},recordedAt);
assert.throws(
  ()=>correctForgottenSessionClose(store,'ses_1',validEndedAt),
  /Conclua a aplicação de Reiki/i,
  'active or paused Reiki must block forgotten-session correction'
);
assert.equal(store.getState().sessions[0].status,'OPEN','Reiki-blocked correction must preserve the open session');

store=makeStore(buildState(startedAt),recordedAt);
correctForgottenSessionClose(store,'ses_1',validEndedAt,'Correção confirmada no retorno');
const state=store.getState();
const session=state.sessions[0];
assert.equal(session.status,'CLOSED');
assert.equal(session.endedAt,validEndedAt,'actual historical end must remain distinct from recording time');
assert.equal(session.closedRecordedAt,recordedAt,'later recording time must remain auditable');
assert.equal(state.closingRuns.length,1);
assert.equal(state.closingRuns[0].actualEndedAt,validEndedAt);
assert.equal(state.closingRuns[0].recordedAt,recordedAt);
assert.equal(state.closingRuns[0].confirmationSnapshot,'Correção confirmada no retorno');

const closedEvent=state.events.find((event)=>event.eventType===EventType.SESSION_CLOSED);
assert.ok(closedEvent,'corrected closure must remain visible in session history');
assert.equal(closedEvent.occurredAt,validEndedAt,'SESSION_CLOSED must reflect the actual end time');
assert.equal(closedEvent.metadata.recordedAt,recordedAt,'SESSION_CLOSED must retain later correction time');
const correctedEvent=state.events.find((event)=>event.eventType===BacklogEventType.SESSION_CLOSE_CORRECTED);
assert.ok(correctedEvent,'a dedicated correction event must preserve auditability');
assert.equal(correctedEvent.occurredAt,recordedAt,'correction event itself must be timestamped when recorded');
assert.equal(correctedEvent.metadata.actualEndedAt,validEndedAt);

console.log('forgotten-session-close-regression.test.mjs: ok');
