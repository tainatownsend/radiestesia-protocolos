import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { AssistedType, PREPARATION_STEPS, createAssistedEntity, selectAssistedForSession, startSession, startPreparation, togglePreparationStep, completePreparation } from './domain.js';
import { ActivityLibraryEventType, ToolType, activeTools, archiveTool, createTool, updateTool, recordGeneralAssessment } from './activity-library.js';

class MemoryStorage { constructor(){this.map=new Map();} getItem(key){return this.map.has(key)?this.map.get(key):null;} setItem(key,value){this.map.set(key,String(value));} removeItem(key){this.map.delete(key);} }
globalThis.localStorage=new MemoryStorage();
function prepare(store,sessionId){const run=startPreparation(store,sessionId);for(const step of PREPARATION_STEPS)togglePreparationStep(store,run.id,step.key);completePreparation(store,run.id);}

{
  const store=createStore(),session=startSession(store),assisted=createAssistedEntity(store,{type:AssistedType.PERSON,displayName:'Pessoa teste',birthDate:'1990-01-01'});selectAssistedForSession(store,session.id,assisted.id);
  assert.throws(()=>recordGeneralAssessment(store,{sessionId:session.id,assistedEntityId:assisted.id,subject:'Frequência vibracional',result:'8500'}),/preparação/);
  prepare(store,session.id);
  const assessment=recordGeneralAssessment(store,{sessionId:session.id,assistedEntityId:assisted.id,subject:'Frequência vibracional',result:'8500',scale:'escala teste'});
  assert.equal(assessment.kind,'GENERAL');assert.equal(store.getState().assessments.length,1);assert.equal(store.getState().events.at(-1).eventType,ActivityLibraryEventType.ASSESSMENT_RECORDED);
}

{
  localStorage.map.clear();const store=createStore();
  const graph=createTool(store,{type:ToolType.GRAPH,name:'Gráfico teste',purpose:'Teste',tags:'Proteção, limpeza, proteção'});
  const meter=createTool(store,{type:ToolType.BIOMETER,name:'Biômetro teste'});
  assert.deepEqual(graph.tags,['Proteção','limpeza']);
  assert.deepEqual(activeTools(store.getState()).map((item)=>item.id).sort(),[graph.id,meter.id].sort());
  const updated=updateTool(store,graph.id,{type:ToolType.GRAPH,name:'Gráfico atualizado',purpose:'Nova finalidade',tags:['Emocional','emocional','Prioridade'],notes:'Preservar snapshots antigos'});
  assert.equal(updated.name,'Gráfico atualizado');assert.deepEqual(updated.tags,['Emocional','Prioridade']);
  assert.equal(store.getState().events.at(-1).eventType,ActivityLibraryEventType.TOOL_UPDATED);
  assert.deepEqual(store.getState().events.at(-1).metadata.before.tags,['Proteção','limpeza']);
  assert.deepEqual(store.getState().events.at(-1).metadata.after.tags,['Emocional','Prioridade']);
  archiveTool(store,graph.id);assert.deepEqual(activeTools(store.getState()).map((item)=>item.id),[meter.id]);assert.ok(store.getState().tools.find((item)=>item.id===graph.id).archivedAt);
}

console.log('activity-library.test.mjs: ok');
