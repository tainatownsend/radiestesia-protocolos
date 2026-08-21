import { createStore } from './store.js';

const store=createStore();
let enhancing=false;

function componentScope(node){return node.closest('[data-treatment-component-draft],[data-planned-component],#component-form');}
function selectedToolId(scope){return scope?.querySelector('select[name="toolId"]')?.value||null;}
function componentName(scope){return String(scope?.querySelector('input[name="componentName"],input[name="name"]')?.value||'').trim();}
function recentMatch(scope){
  const state=store.getState();const toolId=selectedToolId(scope);const name=componentName(scope).toLocaleLowerCase('pt-BR');
  return [...(state.treatmentComponents||[])].filter((c)=>{
    if(toolId)return c.toolId===toolId;
    return name&&String(c.name||'').trim().toLocaleLowerCase('pt-BR')===name;
  }).sort((a,b)=>(b.createdAt||b.startedAt||'').localeCompare(a.createdAt||a.startedAt||''))[0]||null;
}
function updateSuggestion(scope){
  if(!scope)return;let holder=scope.querySelector('[data-repeat-component]');const match=recentMatch(scope);
  if(!match){holder?.remove();return;}
  if(!holder){holder=document.createElement('div');holder.className='repeat-component-box';holder.dataset.repeatComponent='true';const target=scope.querySelector('textarea[name="instructions"]')?.closest('.field')||scope.querySelector('.duration-grid');target?.before(holder);}
  if(!holder)return;holder.dataset.sourceComponent=match.id;
  const bits=[];if(match.instructions)bits.push('comando');if(match.durationValue)bits.push(`${match.durationValue} ${match.durationUnit||''}`.trim());
  holder.innerHTML=`<div><span class="muted">Usado anteriormente</span><strong>${bits.length?bits.join(' · '):'Configuração anterior disponível'}</strong></div><button type="button" class="btn ghost small" data-repeat-component-config="${match.id}">Repetir configuração</button>`;
}
function enhanceScope(scope){if(!scope||scope.dataset.repeatComponentEnhanced)return;scope.dataset.repeatComponentEnhanced='true';updateSuggestion(scope);}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('[data-treatment-component-draft],[data-planned-component],#component-form').forEach(enhanceScope);}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('change',(event)=>{if(event.target.matches('select[name="toolId"]'))updateSuggestion(componentScope(event.target));},true);
document.addEventListener('blur',(event)=>{if(event.target.matches('input[name="componentName"],input[name="name"]'))updateSuggestion(componentScope(event.target));},true);
document.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-repeat-component-config]');if(!button)return;const source=store.getState().treatmentComponents.find((c)=>c.id===button.dataset.repeatComponentConfig);const scope=componentScope(button);if(!source||!scope)return;
  const instructions=scope.querySelector('textarea[name="instructions"]');if(instructions&&source.instructions){instructions.value=source.instructions;instructions.dispatchEvent(new Event('input',{bubbles:true}));}
  const duration=scope.querySelector('input[name="durationValue"],input[name="duration"]');const unit=scope.querySelector('select[name="durationUnit"],select[name="unit"]');
  if(duration){duration.value=source.durationValue||'';duration.dispatchEvent(new Event('input',{bubbles:true}));}
  if(unit&&source.durationUnit){const compatible=[...unit.options].find((o)=>o.value===source.durationUnit||o.value.replace(/S$/,'')===String(source.durationUnit).replace(/S$/,''));if(compatible){unit.value=compatible.value;unit.dispatchEvent(new Event('change',{bubbles:true}));}}
  button.textContent='Configuração aplicada';setTimeout(()=>{if(button.isConnected)button.textContent='Repetir configuração';},1200);
},true);
