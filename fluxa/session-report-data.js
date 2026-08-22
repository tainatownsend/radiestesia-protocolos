function asArray(value){return Array.isArray(value)?value:[];}
function sessionOf(state,sessionId){return asArray(state.sessions).find((item)=>item.id===sessionId)||null;}
function eventIds(state,sessionId,entityType){return new Set(asArray(state.events).filter((event)=>event.sessionId===sessionId&&event.entityType===entityType).map((event)=>event.entityId).filter(Boolean));}
function withinSession(session,iso){
  if(!session||!iso)return false;
  const time=new Date(iso).getTime();const start=new Date(session.startedAt||'').getTime();const end=session.endedAt?new Date(session.endedAt).getTime():Infinity;
  return Number.isFinite(time)&&Number.isFinite(start)&&time>=start&&time<=end;
}

export function sessionInvestigations(state,sessionId){
  const ids=eventIds(state,sessionId,'Investigation');
  return asArray(state.investigations).filter((item)=>item.originSessionId===sessionId||ids.has(item.id));
}

export function sessionFindings(state,sessionId,investigations=sessionInvestigations(state,sessionId)){
  const session=sessionOf(state,sessionId);const ids=eventIds(state,sessionId,'Finding');const investigationIds=new Set(investigations.map((item)=>item.id));
  return asArray(state.findings).filter((item)=>investigationIds.has(item.investigationId)&&(ids.has(item.id)||(!ids.size&&withinSession(session,item.createdAt))));
}

export function sessionTreatments(state,sessionId){
  const ids=eventIds(state,sessionId,'Treatment');
  asArray(state.events).filter((event)=>event.sessionId===sessionId&&event.metadata?.treatmentId).forEach((event)=>ids.add(event.metadata.treatmentId));
  return asArray(state.treatments).filter((item)=>item.originSessionId===sessionId||ids.has(item.id));
}

export function sessionComponents(state,sessionId,treatmentId){
  const session=sessionOf(state,sessionId);const ids=eventIds(state,sessionId,'TreatmentComponent');
  return asArray(state.treatmentComponents).filter((item)=>item.treatmentId===treatmentId&&(ids.has(item.id)||(!ids.size&&withinSession(session,item.startedAt||item.createdAt))));
}

export function sessionAssistedIds(state,sessionId){
  const ids=new Set();
  asArray(state.events).filter((event)=>event.sessionId===sessionId&&event.assistedEntityId).forEach((event)=>ids.add(event.assistedEntityId));
  sessionInvestigations(state,sessionId).forEach((item)=>item.assistedEntityId&&ids.add(item.assistedEntityId));
  sessionTreatments(state,sessionId).forEach((item)=>item.assistedEntityId&&ids.add(item.assistedEntityId));
  asArray(state.assessments).filter((item)=>item.sessionId===sessionId).forEach((item)=>item.assistedEntityId&&ids.add(item.assistedEntityId));
  asArray(state.reikiApplications).filter((item)=>item.sessionId===sessionId).forEach((item)=>item.assistedEntityId&&ids.add(item.assistedEntityId));
  return [...ids];
}
