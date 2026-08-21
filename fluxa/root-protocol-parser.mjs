export function decodeRootLiteral(value=''){
  return String(value).replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"').replace(/\\\\/g,'\\');
}

function matchingBracket(text,openIndex,open='[',close=']'){
  let depth=0,quote=null,escape=false;
  for(let i=openIndex;i<text.length;i++){
    const ch=text[i];
    if(quote){
      if(escape){escape=false;continue;}
      if(ch==='\\'){escape=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue;}
    if(ch===open)depth++;
    if(ch===close){depth--;if(depth===0)return i;}
  }
  return -1;
}

function parsePlans(source){
  const plans={};
  const callRe=/([A-Za-z0-9_]+)\s*:\s*(?:C|P)\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*\)/g;
  for(const m of source.matchAll(callRe))plans[m[1]]={title:decodeRootLiteral(m[2]),command:decodeRootLiteral(m[3])};
  const objectRe=/([A-Za-z0-9_]+)\s*:\s*\{\s*label\s*:\s*'((?:\\.|[^'])*)'\s*,\s*command\s*:\s*'((?:\\.|[^'])*)'\s*\}/g;
  for(const m of source.matchAll(objectRe))plans[m[1]]={title:decodeRootLiteral(m[2]),command:decodeRootLiteral(m[3])};
  return plans;
}

function parseQuestionCalls(body){
  const questions=[];
  const qRe=/[Qq]\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'(?:\s*,\s*'((?:\\.|[^'])*)')?(?:\s*,\s*'((?:\\.|[^'])*)')?\s*\)/g;
  for(const q of body.matchAll(qRe))questions.push({
    id:decodeRootLiteral(q[1]),section:decodeRootLiteral(q[2]),text:decodeRootLiteral(q[3]),
    tag:q[4]?decodeRootLiteral(q[4]):null,parent:q[5]?decodeRootLiteral(q[5]):null
  });
  return questions;
}

function isDescendant(questionId,ancestorId,byId){
  let current=byId.get(questionId),guard=0;
  while(current?.parent&&guard++<100){
    if(current.parent===ancestorId)return true;
    current=byId.get(current.parent);
  }
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
    nodes[q.id]={
      id:q.id,type:'QUESTION',text:q.text,section:q.section,parent:q.parent||null,
      yes:next,no:noTarget,legacyPlanTag:q.tag||null,
      legacyPlanTitle:plan?.title||null,legacyPlanCommand:plan?.command||null
    };
  });
  nodes.end_complete={id:'end_complete',type:'END',title:'Investigação concluída',summary:'Revise as respostas positivas e confirme somente os achados que devem orientar o trabalho.'};
  return nodes;
}

function categoryFor(sourceMeta,title,rawId){
  if(sourceMeta.path.includes('quick'))return 'Protocolos rápidos';
  if(/mestre|causa raiz/i.test(title)&&/master/i.test(rawId))return 'Protocolo Mestre';
  return sourceMeta.group;
}

function rebuild(protocol){
  protocol.startNodeId=protocol.__questions[0]?.id||protocol.startNodeId;
  protocol.nodes=buildNodes(protocol.__questions,protocol.__plans);
  protocol.tags=[protocol.name,...protocol.__questions.map(q=>q.section)].join(' ').toLowerCase();
  return protocol;
}

export function parseRootProtocols(source,sourceMeta){
  const plans=parsePlans(source),found=[];
  const startRe=/(?:DATA\.)?([A-Za-z0-9_]+)\s*(?:=|:)\s*\{\s*title\s*:\s*'((?:\\.|[^'])*)'[\s\S]*?questions\s*:\s*\[/g;
  const seen=new Set();
  for(const match of source.matchAll(startRe)){
    const rawId=match[1];
    if(seen.has(rawId))continue;
    seen.add(rawId);
    const open=match.index+match[0].lastIndexOf('['),close=matchingBracket(source,open);
    if(close<0)continue;
    const prefix=source.slice(match.index,open),body=source.slice(open+1,close);
    const copyMatch=prefix.match(/copy\s*:\s*'((?:\\.|[^'])*)'/);
    const questions=parseQuestionCalls(body);
    if(!questions.length)continue;
    const name=decodeRootLiteral(match[2]),id=`root_${rawId}`;
    found.push(rebuild({
      id,versionId:`${id}_v1`,version:1,name,
      category:categoryFor(sourceMeta,name,rawId),
      description:copyMatch?decodeRootLiteral(copyMatch[1]):'Protocolo migrado da biblioteca terapêutica original.',
      startNodeId:questions[0].id,nodes:{},origin:'ROOT_LIBRARY',sourcePath:sourceMeta.path,legacyId:rawId,
      tags:'',__questions:questions,__plans:{...plans}
    }));
  }
  return found;
}

export function applyRootProtocolMutations(protocols,source){
  const plans=parsePlans(source);
  const mutationRe=/(?:insertAfter|after)\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*\[/g;
  for(const match of source.matchAll(mutationRe)){
    const mode=decodeRootLiteral(match[1]),parentId=decodeRootLiteral(match[2]);
    const open=match.index+match[0].lastIndexOf('['),close=matchingBracket(source,open);
    if(close<0)continue;
    const inserted=parseQuestionCalls(source.slice(open+1,close));
    if(!inserted.length)continue;
    const protocol=protocols.find(item=>item.legacyId===mode);
    if(!protocol?.__questions)continue;
    Object.assign(protocol.__plans,plans);
    const parentIndex=protocol.__questions.findIndex(q=>q.id===parentId);
    if(parentIndex<0)continue;
    const existing=new Set(protocol.__questions.map(q=>q.id));
    const unique=inserted.filter(q=>!existing.has(q.id));
    protocol.__questions.splice(parentIndex+1,0,...unique);
    rebuild(protocol);
  }
  return protocols;
}

export function finalizeRootProtocols(protocols){
  return protocols.map(protocol=>{
    rebuild(protocol);
    const {__questions,__plans,...clean}=protocol;
    return clean;
  });
}
