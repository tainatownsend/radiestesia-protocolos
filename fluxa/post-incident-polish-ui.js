const classificationLabels=Object.freeze({
  FACTOR_RELEVANT:'Fator relevante',CAUSE:'Causa',MAINTAINER:'Mantenedor',CONSEQUENCE:'Consequência',ASSOCIATION:'Associação',DEEPEN:'Item a aprofundar'
});
let enhancing=false;

function replaceClassificationEnums(){
  document.querySelectorAll('[data-treatment-trace]').forEach((node)=>{
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
    for(const text of texts){
      let value=text.nodeValue||'';
      for(const [key,label] of Object.entries(classificationLabels))value=value.replaceAll(key,label);
      if(text.nodeValue!==value)text.nodeValue=value;
    }
  });
}
function removeDuplicateCurrentContext(){
  const main=document.querySelector('main');if(!main||!main.querySelector('[data-fast-session-context]'))return;
  const source=[...main.querySelectorAll('.card.soft.section')].find((node)=>node.querySelector('.eyebrow')?.textContent?.trim()==='Contexto atual');
  if(source&&!source.hidden){source.hidden=true;source.dataset.replacedByFastContext='true';}
}
function enhance(){if(enhancing)return;enhancing=true;try{replaceClassificationEnums();removeDuplicateCurrentContext();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
