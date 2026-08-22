function asArray(value){return Array.isArray(value)?value:[];}

function componentGraphUses(component,toolId){
  const commands=Array.isArray(component?.commands)?component.commands:asArray(component?.treatmentItem?.commands);
  let count=0;
  for(const command of commands){
    for(const graph of asArray(command?.graphApplications))if(String(graph?.toolId||'')===String(toolId))count+=1;
  }
  return count;
}

export function toolUsageCount(state={},toolId){
  if(!toolId)return 0;
  let count=0;
  for(const component of asArray(state.treatmentComponents)){
    if(String(component?.toolId||'')===String(toolId))count+=1;
    count+=componentGraphUses(component,toolId);
  }
  for(const preparation of asArray(state.preparationRuns)){
    count+=asArray(preparation?.protection?.toolIds).filter(id=>String(id)===String(toolId)).length;
  }
  for(const protocol of asArray(state.customProtocols)){
    count+=asArray(protocol?.toolIds).filter(id=>String(id)===String(toolId)).length;
  }
  return count;
}
