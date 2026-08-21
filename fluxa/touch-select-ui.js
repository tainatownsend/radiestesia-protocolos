let enhancing=false;
let counter=0;

function enhanceSelect(select){
  if(select.dataset.touchSelect)return;
  const isClassification=select.name==='classification'||select.name?.startsWith('classification_');
  const isReiki=select.matches('[data-session-reiki-mode-select],select[name="reikiMode"]');
  if(!isClassification&&!isReiki)return;
  select.dataset.touchSelect=String(++counter);select.classList.add('native-chip-select');
  const group=document.createElement('div');group.className=`touch-chip-group ${isClassification?'classification-chip-group':'reiki-chip-group'}`;group.dataset.touchGroup=select.dataset.touchSelect;group.setAttribute('role','group');
  const label=select.closest('.field')?.querySelector('label')?.textContent?.trim();if(label)group.setAttribute('aria-label',label);
  group.innerHTML=[...select.options].filter((o)=>o.value).map((option)=>`<button type="button" class="touch-chip ${option.selected?'active':''}" data-touch-value="${option.value}">${option.textContent}</button>`).join('');
  select.after(group);
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('select').forEach(enhanceSelect);}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const chip=event.target.closest('[data-touch-value]');if(!chip)return;
  const group=chip.closest('[data-touch-group]');const select=document.querySelector(`select[data-touch-select="${CSS.escape(group?.dataset.touchGroup||'')}"]`);if(!select)return;
  select.value=chip.dataset.touchValue;select.dispatchEvent(new Event('change',{bubbles:true}));
  group.querySelectorAll('.touch-chip').forEach((item)=>item.classList.toggle('active',item===chip));
},true);
