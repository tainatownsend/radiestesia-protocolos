import { createStore } from './store.js';
import { EventType, getOpenSession } from './domain.js';
import { requirePreparedSessionState } from './session-rules.js';

const store=createStore();
const SOURCES=[
  {path:'../app.js',group:'Temas essenciais'},
  {path:'../protocols-v11-core.js',group:'Investigações profundas'},
  {path:'../protocols-v11-expansion.js',group:'Investigações profundas'},
  {path:'../protocols-v11-quick.js',group:'Protocolos rápidos'}
];
const catalog=[];
let loadingPromise=null;

function decode(value=''){
  return String(value).replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"').replace(/\\\\/g,'\\');
}
function slug(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function matchingBracket(text,openIndex,open='[',close=']'){
  let depth=0,quote=null,escape=false;
  for(let i=openIndex;i<text.length;i++){
    const ch=text[i];
    if(quote){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue;}
    if(ch===open)depth++;
    if(ch===close){depth--;if(depth===0)return i;}
  }
  return -1;
}
function parsePlans(source){
  const plans={};
  const re=/([A-Za-z0-9_]+)\s*:\s*(?:C|P)\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*\)/g;
  for(const m of source.matchAll(re))plans[m[1]]={title:decode(m[2]),command:decode(m[3])};
  return plans;
}
function isDescendant(questionId,ancestorId,byId){
  let current=byId.get(questionId),guard=0;
  while(current?.parent&&guard++<100){if(current.parent===ancestorId)return true;current=byId.get(current.parent);}
  return false;
}
function buildNodes(questions,plans){
  const nodes={},byId=new Map(questions.map(q=>[q.id,q]));
  questions.forEach((q,index)=>{
    const next=questions[index+1]?.id||'end_complete';
    let noTarget=next;
    for(let j=index+1;j<questions.length;j++){
      if(!isDescendant(questions[j].id,q.id,byId)){noTarget=questions[j].id;break;}
      if(j===questions.length-1)noTarget='end_complete';
    }
    const plan=q.tag?plans[q.tag]:null;
    nodes[q.id]={id:q.id,type:'QUESTION',text:q.text,section:q.section,parent:q.parent||null,yes:next,no:noTarget,legacyPlanTag:q.tag||null,legacyPlanTitle:plan?.title||null,legacyPlanCommand:plan?.command||null};
  });
  nodes.end_complete={id:'end_complete',type:'END',title:'Investigação concluída',summary:'Revise as respostas positivas e confirme somente os achados que devem orientar o trabalho.'};
  return nodes;
}
function categoryFor(sourceMeta,title,rawId){
  if(sourceMeta.path.includes('quick'))return 'Protocolos rápidos';
  if(/mestre|causa raiz/i.test(title)&&/master/i.test(rawId))return 'Protocolo Mestre';
  return sourceMeta.group;
}
function parseProtocols(source,sourceMeta){
  const plans=parsePlans(source),found=[];
  const startRe=/(?:DATA\.)?([A-Za-z0-9_]+)\s*(?:=|:)\s*\{\s*title\s*:\s*'((?:\\.|[^'])*)'[\s\S]*?questions\s*:\s*\[/g;
  const seen=new Set();
  for(const match of source.matchAll(startRe)){
    const rawId=match[1];if(seen.has(rawId))continue;seen.add(rawId);
    const open=match.index+match[0].lastIndexOf('['),close=matchingBracket(source,open);if(close<0)continue;
    const prefix=source.slice(match.index,open),body=source.slice(open+1,close);
    const copyMatch=prefix.match(/copy\s*:\s*'((?:\\.|[^'])*)'/);
    const questions=[];
    const qRe=/[Qq]\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'(?:\s*,\s*'((?:\\.|[^'])*)')?(?:\s*,\s*'((?:\\.|[^'])*)')?\s*\)/g;
    for(const q of body.matchAll(qRe))questions.push({id:decode(q[1]),section:decode(q[2]),text:decode(q[3]),tag:q[4]?decode(q[4]):null,parent:q[5]?decode(q[5]):null});
    if(!questions.length)continue;
    const name=decode(match[2]),id=`root_${rawId}`;
    found.push({id,versionId:`${id}_v1`,version:1,name,category:categoryFor(sourceMeta,name,rawId),description:copyMatch?decode(copyMatch[1]):'Protocolo migrado da biblioteca terapêutica original.',startNodeId:questions[0].id,nodes:buildNodes(questions,plans),origin:'ROOT_LIBRARY',sourcePath:sourceMeta.path,legacyId:rawId,tags:[name,...questions.map(q=>q.section)].join(' ').toLowerCase()});
  }
  return found;
}
async function loadSource(meta){
  const response=await fetch(new URL(meta.path,import.meta.url),{cache:'no-cache'});if(!response.ok)throw new Error(`Falha ao carregar ${meta.path}`);return parseProtocols(await response.text(),meta);
}
export async function ensureRootProtocolCatalog(){
  if(loadingPromise)return loadingPromise;
  loadingPromise=(async()=>{
    const all=[];
    for(const source of SOURCES){try{all.push(...await loadSource(source));}catch(error){console.warn('Fluxa: catálogo da raiz indisponível',source.path,error);}}
    const unique=[];const ids=new Set();for(const item of all){if(ids.has(item.id))continue;ids.add(item.id);unique.push(item);}
    catalog.splice(0,catalog.length,...unique);
    window.dispatchEvent(new CustomEvent('fluxa:root-protocols-ready',{detail:{count:catalog.length}}));
    return catalog;
  })();
  return loadingPromise;
}
export function rootProtocolCatalog(){return catalog;}
export function rootProtocolById(id){return catalog.find(p=>p.id===id)||null;}
export function currentRootNode(inv){return inv?.protocolSnapshot?.nodes?.[inv.currentNodeId]||null;}
function addEvent(draft,input){draft.events.push({id:store.makeId('evt'),eventType:input.eventType,entityType:input.entityType,entityId:input.entityId,sessionId:input.sessionId||null,assistedEntityId:input.assistedEntityId||null,occurredAt:store.nowIso(),createdAt:store.nowIso(),metadata:input.metadata||{}});}
export function activeRootProtocol(protocolId,assistedEntityId){return store.getState().investigations.find(i=>i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS'&&i.assistedEntityId===assistedEntityId&&i.protocolId===protocolId)||null;}
export function startRootProtocol(protocolId){
  const state=store.getState(),session=getOpenSession(state);if(!session)throw new Error('Abra uma sessão antes de investigar.');requirePreparedSessionState(state,session.id,'Conclua a preparação da sessão antes de iniciar uma investigação.');if(!session.currentAssistedEntityId)throw new Error('Escolha o Assistido antes de iniciar.');
  const protocol=rootProtocolById(protocolId);if(!protocol)throw new Error('Protocolo não encontrado.');
  const inv={id:store.makeId('inv'),kind:'ROOT_PROTOCOL',originSessionId:session.id,currentSessionId:session.id,assistedEntityId:session.currentAssistedEntityId,protocolId:protocol.id,protocolVersionId:protocol.versionId,protocolSnapshot:structuredClone(protocol),status:'IN_PROGRESS',currentNodeId:protocol.startNodeId,answers:[],path:[protocol.startNodeId],startedAt:store.nowIso(),completedAt:null,endNodeId:null,updatedAt:store.nowIso()};
  store.setState(current=>{const draft=structuredClone(current);draft.investigations.push(inv);addEvent(draft,{eventType:EventType.INVESTIGATION_STARTED,entityType:'Investigation',entityId:inv.id,sessionId:session.id,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:protocol.name,protocolVersionId:protocol.versionId,rootLibrary:true}});return draft;});return inv;
}
export function resumeRootProtocol(investigationId){
  const state=store.getState(),session=getOpenSession(state);if(!session)throw new Error('Abra uma sessão antes de retomar.');requirePreparedSessionState(state,session.id,'Conclua a preparação da sessão antes de retomar a investigação.');
  const inv=state.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS');if(!inv)throw new Error('Investigação não disponível para retomada.');
  store.setState(current=>{const draft=structuredClone(current),target=draft.investigations.find(i=>i.id===investigationId);if(target.currentSessionId!==session.id){target.currentSessionId=session.id;target.updatedAt=store.nowIso();addEvent(draft,{eventType:EventType.INVESTIGATION_RESUMED,entityType:'Investigation',entityId:target.id,sessionId:session.id,assistedEntityId:target.assistedEntityId,metadata:{originSessionId:target.originSessionId,rootLibrary:true}});}const s=draft.sessions.find(x=>x.id===session.id);if(s)s.currentAssistedEntityId=target.assistedEntityId;return draft;});return investigationId;
}
export function answerRootProtocol(investigationId,answer){
  if(!['YES','NO'].includes(answer))throw new Error('Resposta inválida.');
  store.setState(current=>{const draft=structuredClone(current),inv=draft.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='IN_PROGRESS');if(!inv)return draft;requirePreparedSessionState(draft,inv.currentSessionId,'Conclua a preparação da sessão antes de continuar.');const node=currentRootNode(inv);if(!node||node.type!=='QUESTION')return draft;const payload={nodeId:node.id,questionTextSnapshot:node.text,answer,answeredAt:store.nowIso(),sectionSnapshot:node.section||'',legacyPlanTag:node.legacyPlanTag||null,legacyPlanTitle:node.legacyPlanTitle||null,legacyPlanCommand:node.legacyPlanCommand||null};const existing=inv.answers.find(a=>a.nodeId===node.id);if(existing)Object.assign(existing,payload);else inv.answers.push(payload);const nextId=answer==='YES'?node.yes:node.no;inv.currentNodeId=nextId;inv.path.push(nextId);const next=currentRootNode(inv);if(!next)throw new Error('O protocolo contém um caminho inválido.');if(next.type==='END'){inv.status='COMPLETED';inv.completedAt=store.nowIso();inv.endNodeId=next.id;addEvent(draft,{eventType:EventType.INVESTIGATION_COMPLETED,entityType:'Investigation',entityId:inv.id,sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId,metadata:{protocolName:inv.protocolSnapshot.name,rootLibrary:true}});}inv.updatedAt=store.nowIso();return draft;});
}
export function confirmRootFindings(investigationId,selections){
  const allowed=new Set(['CAUSE','MAINTAINER','CONSEQUENCE','ASSOCIATION','FACTOR_RELEVANT','DEEPEN']);const created=[];
  store.setState(current=>{const draft=structuredClone(current),inv=draft.investigations.find(i=>i.id===investigationId&&i.kind==='ROOT_PROTOCOL'&&i.status==='COMPLETED');if(!inv)return draft;requirePreparedSessionState(draft,inv.currentSessionId,'Conclua a preparação da sessão antes de consolidar achados.');for(const selection of selections){if(!allowed.has(selection.classification))continue;const answer=inv.answers.find(a=>a.nodeId===selection.nodeId&&a.answer==='YES');if(!answer)continue;let finding=draft.findings.find(f=>f.investigationId===inv.id&&f.sourceQuestionId===selection.nodeId&&f.status!=='DISMISSED');if(!finding){finding={id:store.makeId('find'),assistedEntityId:inv.assistedEntityId,investigationId:inv.id,sourceQuestionId:selection.nodeId,classification:selection.classification,title:answer.legacyPlanTitle||answer.questionTextSnapshot,status:'IDENTIFIED',suggestedTreatmentTitle:answer.legacyPlanTitle||null,suggestedTreatmentCommand:answer.legacyPlanCommand||null,sourceSection:answer.sectionSnapshot||null,createdAt:store.nowIso()};draft.findings.push(finding);addEvent(draft,{eventType:EventType.FINDING_IDENTIFIED,entityType:'Finding',entityId:finding.id,sessionId:inv.currentSessionId,assistedEntityId:inv.assistedEntityId,metadata:{title:finding.title,classification:finding.classification,suggestedTreatmentTitle:finding.suggestedTreatmentTitle,rootLibrary:true}});}created.push(finding);}return draft;});return created;
}

queueMicrotask(()=>ensureRootProtocolCatalog());
