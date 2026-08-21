import { requirePreparedSessionState } from './session-rules.js';

export const ToolType = Object.freeze({ GRAPH:'GRAPH', BIOMETER:'BIOMETER', OTHER:'OTHER' });
export const ActivityLibraryEventType = Object.freeze({ ASSESSMENT_RECORDED:'ASSESSMENT_RECORDED', TOOL_CREATED:'TOOL_CREATED', TOOL_UPDATED:'TOOL_UPDATED', TOOL_ARCHIVED:'TOOL_ARCHIVED' });

function addEvent(store,draft,input){const event={id:store.makeId('evt'),eventType:input.eventType,entityType:input.entityType,entityId:input.entityId,sessionId:input.sessionId||null,assistedEntityId:input.assistedEntityId||null,occurredAt:input.occurredAt||store.nowIso(),createdAt:store.nowIso(),metadata:input.metadata||{}};draft.events.push(event);return event;}
function requireAssisted(state,id){const assisted=state.assistedEntities.find((item)=>item.id===id&&!item.archivedAt);if(!assisted)throw new Error('Selecione um assistido válido.');return assisted;}
export function normalizeToolTags(value){
  const raw=Array.isArray(value)?value:String(value||'').split(/[,;\n]/);
  const seen=new Set();const tags=[];
  for(const item of raw){const tag=String(item||'').trim();const key=tag.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(!tag||seen.has(key))continue;seen.add(key);tags.push(tag);}
  return tags.slice(0,20);
}

export function recordGeneralAssessment(store,input){
  const state=store.getState();const session=requirePreparedSessionState(state,input.sessionId,'Conclua a preparação da sessão antes de registrar uma avaliação.');
  const assistedId=input.assistedEntityId||session.currentAssistedEntityId;requireAssisted(state,assistedId);
  const subject=input.subject?.trim(),result=input.result?.trim();if(!subject)throw new Error('Informe o que está sendo avaliado.');if(!result)throw new Error('Informe o resultado da avaliação.');
  const now=store.nowIso();const assessment={id:store.makeId('assess'),kind:'GENERAL',sessionId:session.id,assistedEntityId:assistedId,subject,result,scale:input.scale?.trim()||null,notes:input.notes?.trim()||null,occurredAt:input.occurredAt||now,createdAt:now,updatedAt:now};
  store.setState((current)=>{const draft=structuredClone(current);if(!Array.isArray(draft.assessments))draft.assessments=[];draft.assessments.push(assessment);addEvent(store,draft,{eventType:ActivityLibraryEventType.ASSESSMENT_RECORDED,entityType:'Assessment',entityId:assessment.id,sessionId:session.id,assistedEntityId:assistedId,occurredAt:assessment.occurredAt,metadata:{subject,result,scale:assessment.scale}});return draft;});return assessment;
}

export function createTool(store,input){
  const name=input.name?.trim();if(!name)throw new Error('Nome do recurso é obrigatório.');const type=Object.values(ToolType).includes(input.type)?input.type:ToolType.OTHER;const now=store.nowIso();
  const tool={id:store.makeId('tool'),type,name,purpose:input.purpose?.trim()||null,notes:input.notes?.trim()||null,tags:normalizeToolTags(input.tags),createdAt:now,updatedAt:now,archivedAt:null};
  store.setState((state)=>{const draft=structuredClone(state);if(!Array.isArray(draft.tools))draft.tools=[];draft.tools.push(tool);addEvent(store,draft,{eventType:ActivityLibraryEventType.TOOL_CREATED,entityType:'Tool',entityId:tool.id,metadata:{name:tool.name,type:tool.type,tags:tool.tags}});return draft;});return tool;
}

export function updateTool(store,toolId,input){
  const state=store.getState();const existing=(state.tools||[]).find((item)=>item.id===toolId&&!item.archivedAt);if(!existing)throw new Error('Recurso não encontrado.');const name=input.name?.trim();if(!name)throw new Error('Nome do recurso é obrigatório.');const type=Object.values(ToolType).includes(input.type)?input.type:existing.type;
  const before={type:existing.type,name:existing.name,purpose:existing.purpose,notes:existing.notes,tags:normalizeToolTags(existing.tags)};let updated;
  store.setState((current)=>{const draft=structuredClone(current);const tool=draft.tools.find((item)=>item.id===toolId);tool.type=type;tool.name=name;tool.purpose=input.purpose?.trim()||null;tool.notes=input.notes?.trim()||null;tool.tags=normalizeToolTags(input.tags);tool.updatedAt=store.nowIso();updated=structuredClone(tool);addEvent(store,draft,{eventType:ActivityLibraryEventType.TOOL_UPDATED,entityType:'Tool',entityId:tool.id,metadata:{before,after:{type:tool.type,name:tool.name,purpose:tool.purpose,notes:tool.notes,tags:tool.tags}}});return draft;});return updated;
}

export function archiveTool(store,toolId){const state=store.getState();const existing=(state.tools||[]).find((item)=>item.id===toolId&&!item.archivedAt);if(!existing)throw new Error('Recurso não encontrado.');store.setState((current)=>{const draft=structuredClone(current);const tool=draft.tools.find((item)=>item.id===toolId);tool.archivedAt=store.nowIso();tool.updatedAt=tool.archivedAt;addEvent(store,draft,{eventType:ActivityLibraryEventType.TOOL_ARCHIVED,entityType:'Tool',entityId:tool.id,metadata:{name:tool.name,type:tool.type}});return draft;});}
export function activeTools(state){return(state.tools||[]).filter((item)=>!item.archivedAt).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
