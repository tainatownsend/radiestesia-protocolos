import { createStore } from './store.js';
import { EventType, getOpenSession } from './domain.js';
import { requirePreparedSessionState, requirePreparedAssistedSessionState } from './session-rules.js';
import { requireHawkinsBaseline } from './hawkins-measurement.js';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';

const store=createStore();
export const ROOT_PROTOCOL_SOURCES=Object.freeze([
  Object.freeze({path:'../app.js',group:'Temas essenciais'}),
  Object.freeze({path:'../marriage.js',group:'Temas essenciais'}),
  Object.freeze({path:'../protocols-v11-core.js',group:'Investigações profundas'}),
  Object.freeze({path:'../protocols-v11-expansion.js',group:'Investigações profundas'}),
  Object.freeze({path:'../protocols-v11-quick.js',group:'Protocolos rápidos'})
]);
export const ROOT_PROTOCOL_MUTATIONS=Object.freeze([
  Object.freeze({path:'../deep-tree.js'}),
  Object.freeze({path:'../deep-tree-2.js'})
]);
const catalog=[];
let loadingPromise=null;
let failedPaths=[];

async function sourceText(path){
  const response=await fetch(new URL(path,import.meta.url),{cache:'no-cache'});
  if(!response.ok)throw new Error(`Falha ao carregar ${path}`);return response.text();
}

export async function ensureRootProtocolCatalog(){
  if(loadingPromise)return loadingPromise;
  if(catalog.length&&failedPaths.length===0)return catalog;
  loadingPromise=(async()=>{
    const all=[];const failures=[];
    for(const source of ROOT_PROTOCOL_SOURCES){try{all.push(...parseRootProtocols(await sourceText(source.path),source));}catch(error){failures.push(source.path);console.warn('Fluxa: catálogo da raiz indisponível',source.path,error);}}
    const unique=[];const ids=new Set();for(const item of all){if(ids.has(item.id))continue;ids.add(item.id);unique.push(item);}
    for(const mutation of ROOT_PROTOCOL_MUTATIONS){try{applyRootProtocolMutations(unique,await sourceText(mutation.path));}catch(error){failures.push(mutation.path);console.warn('Fluxa: expansão terapêutica da raiz indisponível',mutation.path,error);}}
    catalog.splice(0,catalog.length,...finalizeRootProtocols(unique));failedPaths=[...new Set(failures)];
    window.dispatchEvent(new CustomEvent('fluxa:root-protocols-ready',{detail:{count:catalog.length,complete:failedPaths.length===0,failedPaths:[...failedPaths]}}));return catalog;
  })();
  try{return await loadingPromise;}finally{loadingPromise=null;}
}
export function rootProtocolCatalog(){return catalog;}
export function rootProtocolCatalogStatus(){return {count:catalog.length,complete:catalog.length>0&&failedPaths.length===0,failedPaths:[...failedPaths]};}
export function rootProtocolById(id){return catalog.find(p=>p.id===id)||null;}
export function currentRootNode(inv){return inv?.protocolSnapshot?.nodes?.[inv.currentNodeId]||null;}
function addEvent(draft,input){draft.events.push({id:store.makeId('evt'),eventType:input.eventType,entityType:input.entityType,entityId:input.entityId,sessionId:input.sessionId||null,assistedEntityId:input.assistedEntityId||null,occurredAt:store.nowIso(),createdAt:store.nowIso(),metadata:input.metadata||{}});}
export function activeRootProtocol(protocolId,assistedEntityId){return store.getState().investigations.find(i=>i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS'&&i.assistedEntityId===assistedEntityId&&i.protocolId===protocolId)||null;}

export function startRootProtocol(protocolId){
  const state=store.getState(),session=getOpenSession(state);if(!session)throw new Error('Abra uma sessão antes de investigar.');
  requirePreparedSessionState(state,session.id,'Conclua a preparação da sessão antes de iniciar uma investigação.');if(!session.currentAssistedEntityId)throw new Error('Escolha o Assistido antes de iniciar.');
  const baseline=requireHawkinsBaseline(state,{sessionId:session.id,assistedEntityId:session.currentAssistedEntityId});
  const protocol=rootProtocolById(protocolId);if(!protocol)throw new Error('Protocolo não encontrado.');
  const inv={id:store.makeId('inv'),kind:'ROOT_PROTOCOL',originSessionId:session.id,currentSessionId:session.id,assistedEntityId:session.currentAssistedEntityId,protocolId:protocol.id,protocolVersionId:protocol.versionId,protocolSnapshot:structuredClone(protocol),status:'IN_PROGRESS',currentNodeId:protocol.startNodeId,answers:[],path:[protocol.startNodeId],hawkinsBaselineAssessmentId:baseline.id,hawkinsBaselineHertz:baseline.hertz,startedAt:store.nowIso(),completedAt:null,endNodeId:null,updatedAt:store.nowIso()};
  store.setState(current=>{const draft=structuredClone(current);draft.investigations.push(inv);addEvent(draft,{eventType:EventType.INVESTIGATION_STARTED,entityType:'Investigation',entityId:inv.id,sessionId:session.id,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:protocol.name,protocolVersionId:protocol.versionId,rootLibrary:true,hawkinsBaselineAssessmentId:baseline.id,hawkinsBaselineHertz:baseline.hertz}});return draft;});return inv;
}
export function resumeRootProtocol(investigationId){
  const state=store.getState(),session=getOpenSession(state);if(!session)throw new Error('Abra uma sessão antes de retomar.');requirePreparedSessionState(state,session.id,'Conclua a preparação da sessão antes de retomar a investigação.');
  const inv=state.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS');if(!inv)throw new Error('Investigação não disponível para retomada.');
  requirePreparedAssistedSessionState(state,session.id,inv.assistedEntityId,'Volte para o Assistido desta investigação antes de retomar.');
  const baseline=requireHawkinsBaseline(state,{sessionId:session.id,assistedEntityId:inv.assistedEntityId});
  store.setState(current=>{const draft=structuredClone(current),target=draft.investigations.find(i=>i.id===investigationId);if(target.currentSessionId!==session.id){target.currentSessionId=session.id;target.updatedAt=store.nowIso();addEvent(draft,{eventType:EventType.INVESTIGATION_RESUMED,entityType:'Investigation',entityId:target.id,sessionId:session.id,assistedEntityId:target.assistedEntityId,metadata:{originSessionId:target.originSessionId,rootLibrary:true,hawkinsBaselineAssessmentId:baseline.id,hawkinsBaselineHertz:baseline.hertz}});}return draft;});return investigationId;
}
export function answerRootProtocol(investigationId,answer){
  if(!['YES','NO'].includes(answer))throw new Error('Resposta inválida.');
  store.setState(current=>{const draft=structuredClone(current),inv=draft.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS');if(!inv)return draft;
    requirePreparedAssistedSessionState(draft,inv.currentSessionId,inv.assistedEntityId,'Volte para o Assistido desta investigação antes de continuar.');
    requireHawkinsBaseline(draft,{sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId});
    const node=currentRootNode(inv);if(!node||node.type!=='QUESTION')return draft;const payload={nodeId:node.id,questionTextSnapshot:node.text,answer,answeredAt:store.nowIso(),sectionSnapshot:node.section||'',legacyPlanTag:node.legacyPlanTag||null,legacyPlanTitle:node.legacyPlanTitle||null,legacyPlanCommand:node.legacyPlanCommand||null};
    const existing=inv.answers.find(a=>a.nodeId===node.id);if(existing)Object.assign(existing,payload);else inv.answers.push(payload);const nextId=answer==='YES'?node.yes:node.no;inv.currentNodeId=nextId;inv.path.push(nextId);const next=currentRootNode(inv);if(!next)throw new Error('O protocolo contém um caminho inválido.');
    if(next.type==='END'){inv.status='COMPLETED';inv.completedAt=store.nowIso();inv.endNodeId=next.id;addEvent(draft,{eventType:EventType.INVESTIGATION_COMPLETED,entityType:'Investigation',entityId:inv.id,sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:inv.protocolSnapshot.name,rootLibrary:true}});}inv.updatedAt=store.nowIso();return draft;});
}
export function confirmRootFindings(investigationId,selections){
  const allowed=new Set(['CAUSE','MAINTAINER','CONSEQUENCE','ASSOCIATION','FACTOR_RELEVANT','DEEPEN']);const created=[];
  store.setState(current=>{const draft=structuredClone(current),inv=draft.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='COMPLETED');if(!inv)return draft;
    requirePreparedAssistedSessionState(draft,inv.currentSessionId,inv.assistedEntityId,'Volte para o Assistido desta investigação antes de consolidar achados.');
    for(const selection of selections){if(!allowed.has(selection.classification))continue;const answer=inv.answers.find(a=>a.nodeId===selection.nodeId&&a.answer==='YES');if(!answer)continue;let finding=draft.findings.find(f=>f.investigationId===inv.id&&f.sourceQuestionId===selection.nodeId&&f.status!=='DISMISSED');
      if(!finding){finding={id:store.makeId('find'),assistedEntityId:inv.assistedEntityId,investigationId:inv.id,sourceQuestionId:selection.nodeId,classification:selection.classification,title:answer.legacyPlanTitle||answer.questionTextSnapshot,status:'IDENTIFIED',suggestedTreatmentTitle:answer.legacyPlanTitle||null,suggestedTreatmentCommand:answer.legacyPlanCommand||null,sourceSection:answer.sectionSnapshot||null,createdAt:store.nowIso()};draft.findings.push(finding);addEvent(draft,{eventType:EventType.FINDING_IDENTIFIED,entityType:'Finding',entityId:finding.id,sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId,metadata:{title:finding.title,classification:finding.classification,suggestedTreatmentTitle:finding.suggestedTreatmentTitle,rootLibrary:true}});}created.push(finding);}return draft;});return created;
}
queueMicrotask(()=>ensureRootProtocolCatalog());