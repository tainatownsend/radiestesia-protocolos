let enhancing=false;
const presets=[
  {label:'30 min',value:'30',unit:'MINUTE'},
  {label:'1 h',value:'1',unit:'HOUR'},
  {label:'1 dia',value:'1',unit:'DAY'},
  {label:'7 dias',value:'7',unit:'DAY'},
  {label:'Sem prazo',value:'',unit:''}
];

function enhanceDurationGrid(grid){
  if(grid.dataset.quickDurationEnhanced)return;
  const value=grid.querySelector('input[name="durationValue"],input[name="duration"]');
  const unit=grid.querySelector('select[name="durationUnit"],select[name="unit"]');
  if(!value||!unit)return;
  grid.dataset.quickDurationEnhanced='true';
  value.required=false;
  value.removeAttribute('required');
  if(!value.placeholder)value.placeholder='Sem prazo';
  const label=value.closest('.field')?.querySelector('label');
  if(label&&!label.querySelector('.muted'))label.insertAdjacentHTML('beforeend',' <span class="muted">(opcional)</span>');
  const wrap=document.createElement('div');wrap.className='quick-duration-presets';wrap.dataset.quickDurationPresets='true';
  wrap.innerHTML=presets.map((p)=>`<button type="button" class="quick-duration-chip" data-duration-value="${p.value}" data-duration-unit="${p.unit}">${p.label}</button>`).join('');
  grid.after(wrap);
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('.duration-grid').forEach(enhanceDurationGrid);}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

function setUnit(select,unit){
  if(!unit){select.value='';return;}
  const exact=[...select.options].find((option)=>option.value===unit);
  const compatible=exact||[...select.options].find((option)=>option.value.replace(/S$/,'')===unit.replace(/S$/,''));
  if(compatible)select.value=compatible.value;
}

document.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-duration-value]');if(!button)return;
  const wrap=button.closest('[data-quick-duration-presets]');const grid=wrap?.previousElementSibling?.classList.contains('duration-grid')?wrap.previousElementSibling:null;if(!grid)return;
  const value=grid.querySelector('input[name="durationValue"],input[name="duration"]');
  const unit=grid.querySelector('select[name="durationUnit"],select[name="unit"]');
  if(!value||!unit)return;
  value.value=button.dataset.durationValue;
  setUnit(unit,button.dataset.durationUnit);
  value.removeAttribute('required');
  value.dispatchEvent(new Event('input',{bubbles:true}));
  if(button.dataset.durationValue)unit.dispatchEvent(new Event('change',{bubbles:true}));
  wrap.querySelectorAll('.quick-duration-chip').forEach((chip)=>chip.classList.toggle('active',chip===button));
},true);
