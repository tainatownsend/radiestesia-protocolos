const UNIT_MS=Object.freeze({MINUTE:60_000,HOUR:3_600_000,DAY:86_400_000,WEEK:604_800_000,MONTH:2_592_000_000});

function id(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;}
function text(value=''){return String(value??'').trim();}
function positiveNumber(value){if(value===''||value==null)return null;const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function unit(value){const u=String(value||'DAY').toUpperCase();return UNIT_MS[u]?u:'DAY';}
function themeProvenance(input={}){
  const theme=text(input.theme),sourcePath=text(input.sourcePath),suggestionId=text(input.suggestionId);
  return theme||sourcePath||suggestionId?{theme:theme||null,sourcePath:sourcePath||null,suggestionId:suggestionId||null}:null;
}

export function graphExpectedEndAt(startedAt,durationValue,durationUnit){
  const value=positiveNumber(durationValue);if(!value)return null;
  const start=new Date(startedAt||Date.now()).getTime();if(!Number.isFinite(start))return null;
  return new Date(start+value*UNIT_MS[unit(durationUnit)]).toISOString();
}

export function buildGraphApplication(input={},tools=[],startedAt=new Date().toISOString()){
  const graphName=text(input.graphName);if(!graphName)throw new Error('Adicione pelo menos um gráfico para cada comando.');
  const match=tools.find(tool=>!tool.archivedAt&&text(tool.name).localeCompare(graphName,undefined,{sensitivity:'accent'})===0)
    ||tools.find(tool=>!tool.archivedAt&&text(tool.name).toLocaleLowerCase('pt-BR')===graphName.toLocaleLowerCase('pt-BR'));
  const durationValue=positiveNumber(input.durationValue),durationUnit=unit(input.durationUnit),noDuration=!durationValue;
  return {
    id:input.id||id('graphapp'),graphName,toolId:match?.id||null,
    toolSnapshot:match?{id:match.id,type:match.type,name:match.name}:null,manual:!match,
    durationValue,durationUnit,noDuration,startedAt,
    expectedEndAt:noDuration?null:graphExpectedEndAt(startedAt,durationValue,durationUnit)
  };
}

export function buildTreatmentItem(input={},tools=[],startedAt=new Date().toISOString()){
  const itemLabel=text(input.itemLabel||input.name);if(!itemLabel)throw new Error('Dê um nome ao item que será tratado.');
  const commands=(input.commands||[]).map(command=>{
    const commandText=text(command.text);if(!commandText)throw new Error(`Adicione um comando para “${itemLabel}”.`);
    const graphApplications=(command.graphApplications||[]).map(graph=>buildGraphApplication(graph,tools,startedAt));
    if(!graphApplications.length)throw new Error(`Adicione pelo menos um gráfico ao comando “${commandText}”.`);
    return {id:command.id||id('cmd'),text:commandText,graphApplications};
  });
  if(!commands.length)throw new Error(`Adicione pelo menos um comando para “${itemLabel}”.`);
  return {semanticsVersion:2,itemLabel,commands,themeProvenance:themeProvenance(input.themeProvenance)};
}

export function latestExpectedEndAt(item){
  const times=(item?.commands||[]).flatMap(command=>command.graphApplications||[]).map(graph=>new Date(graph.expectedEndAt||'').getTime()).filter(Number.isFinite);
  return times.length?new Date(Math.max(...times)).toISOString():null;
}

export function enrichComponentWithTreatmentItem(store,componentId,input){
  let enriched=null;
  store.setState(state=>{
    const draft=structuredClone(state),component=draft.treatmentComponents.find(row=>row.id===componentId);if(!component)return draft;
    const startedAt=component.startedAt||store.nowIso();const item=buildTreatmentItem(input,draft.tools||[],startedAt);
    component.semanticsVersion=2;component.itemLabel=item.itemLabel;component.name=item.itemLabel;component.commands=item.commands;
    component.themeProvenance=item.themeProvenance;component.instructions=item.commands.map(command=>command.text).join('\n');
    component.expectedEndAt=latestExpectedEndAt(item);component.durationValue=null;component.durationUnit=null;component.updatedAt=store.nowIso();
    enriched=structuredClone(component);return draft;
  });
  return enriched;
}

export function treatmentItemView(component){
  if(component?.semanticsVersion===2&&Array.isArray(component.commands))return {itemLabel:component.itemLabel||component.name,commands:component.commands,themeProvenance:component.themeProvenance||null,legacy:false};
  const graphName=text(component?.toolSnapshot?.name||component?.name||'Gráfico'),commandText=text(component?.instructions||'Aplicação registrada');
  return {itemLabel:component?.name||graphName,themeProvenance:null,legacy:true,commands:[{id:`legacy_${component?.id||'item'}`,text:commandText,graphApplications:[{id:`legacy_graph_${component?.id||'item'}`,graphName,toolId:component?.toolId||null,toolSnapshot:component?.toolSnapshot||null,manual:!component?.toolId,durationValue:component?.durationValue??null,durationUnit:component?.durationUnit||'DAY',noDuration:!component?.expectedEndAt,startedAt:component?.startedAt||null,expectedEndAt:component?.expectedEndAt||null}]}]};
}
