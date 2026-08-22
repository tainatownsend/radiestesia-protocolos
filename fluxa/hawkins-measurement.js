import { requirePreparedSessionState } from './session-rules.js';

export const HawkinsPhase=Object.freeze({BASELINE:'BASELINE',FINAL:'FINAL'});
export const HAWKINS_KIND='HAWKINS_FREQUENCY';
export const HAWKINS_SCALE='Hz';

function text(value=''){return String(value??'').trim();}
export function validateHawkinsHertz(value){
  const raw=text(value);const hertz=Number(raw);
  if(!raw||!Number.isFinite(hertz)||hertz<=0)throw new Error('Registre a frequência vibracional de Hawkins em Hz com um valor maior que zero.');
  return hertz;
}
function matchingAssistedSession(state,sessionId,assistedEntityId){
  const session=requirePreparedSessionState(state,sessionId,'Conclua a preparação da sessão antes de registrar a medição de Hawkins.');
  if(!assistedEntityId||session.currentAssistedEntityId!==assistedEntityId)throw new Error('Selecione o Assistido correto antes de registrar a medição de Hawkins.');
  if(!(state.assistedEntities||[]).some(item=>item.id===assistedEntityId&&!item.archivedAt))throw new Error('Assistido não encontrado para esta medição.');
  return session;
}
export function hawkinsBaseline(state,sessionId,assistedEntityId){
  return [...(state.assessments||[])].filter(item=>item.kind===HAWKINS_KIND&&item.phase===HawkinsPhase.BASELINE&&item.sessionId===sessionId&&item.assistedEntityId===assistedEntityId).sort((a,b)=>String(b.occurredAt||'').localeCompare(String(a.occurredAt||'')))[0]||null;
}
export function hawkinsFinalForTreatment(state,treatmentId){
  return [...(state.assessments||[])].filter(item=>item.kind===HAWKINS_KIND&&item.phase===HawkinsPhase.FINAL&&item.treatmentId===treatmentId).sort((a,b)=>String(b.occurredAt||'').localeCompare(String(a.occurredAt||'')))[0]||null;
}
export function recordHawkinsBaseline(store,input={}){
  const state=store.getState();matchingAssistedSession(state,input.sessionId,input.assistedEntityId);
  const existing=hawkinsBaseline(state,input.sessionId,input.assistedEntityId);if(existing)return existing;
  const hertz=validateHawkinsHertz(input.hertz),now=store.nowIso();
  const assessment={id:store.makeId('assess'),kind:HAWKINS_KIND,phase:HawkinsPhase.BASELINE,sessionId:input.sessionId,assistedEntityId:input.assistedEntityId,treatmentId:null,hertz,frequency:String(hertz),subject:'Frequência vibracional de Hawkins',result:String(hertz),scale:HAWKINS_SCALE,notes:text(input.notes)||null,occurredAt:now,createdAt:now,updatedAt:now};
  store.setState(current=>{const draft=structuredClone(current);draft.assessments=draft.assessments||[];draft.assessments.push(assessment);draft.events.push({id:store.makeId('evt'),eventType:'HAWKINS_BASELINE_RECORDED',entityType:'Assessment',entityId:assessment.id,sessionId:input.sessionId,assistedEntityId:input.assistedEntityId,occurredAt:now,createdAt:now,metadata:{hertz,scale:HAWKINS_SCALE,phase:HawkinsPhase.BASELINE}});return draft;});
  return assessment;
}
export function linkTreatmentHawkinsBaseline(store,treatmentId,assessmentId){
  const state=store.getState(),assessment=(state.assessments||[]).find(item=>item.id===assessmentId&&item.kind===HAWKINS_KIND&&item.phase===HawkinsPhase.BASELINE),treatment=(state.treatments||[]).find(item=>item.id===treatmentId);
  if(!assessment||!treatment)throw new Error('Não foi possível vincular a medição inicial ao tratamento.');
  if(assessment.assistedEntityId!==treatment.assistedEntityId)throw new Error('A medição inicial pertence a outro Assistido.');
  store.setState(current=>{const draft=structuredClone(current),target=draft.treatments.find(item=>item.id===treatmentId);target.hawkinsBaselineAssessmentId=assessment.id;target.hawkinsBaselineHertz=assessment.hertz;target.hawkinsBaselineRecordedAt=assessment.occurredAt;target.updatedAt=store.nowIso();return draft;});
}
export function enrichFinalHawkinsAssessment(store,assessmentId){
  const state=store.getState(),source=(state.assessments||[]).find(item=>item.id===assessmentId&&item.treatmentId);if(!source)throw new Error('Avaliação final não encontrada.');
  const hertz=validateHawkinsHertz(source.frequency??source.hertz);let result=null;
  store.setState(current=>{const draft=structuredClone(current),assessment=draft.assessments.find(item=>item.id===assessmentId),treatment=draft.treatments.find(item=>item.id===assessment.treatmentId);assessment.kind=HAWKINS_KIND;assessment.phase=HawkinsPhase.FINAL;assessment.hertz=hertz;assessment.scale=HAWKINS_SCALE;assessment.subject='Frequência vibracional de Hawkins';assessment.result=String(hertz);assessment.updatedAt=store.nowIso();if(treatment){treatment.hawkinsFinalAssessmentId=assessment.id;treatment.hawkinsFinalHertz=hertz;treatment.hawkinsFinalRecordedAt=assessment.occurredAt;treatment.updatedAt=store.nowIso();}result=structuredClone(assessment);return draft;});
  return result;
}
