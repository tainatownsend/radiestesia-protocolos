function enhanceGuidedPreparation(){
  const sheet=document.querySelector('.sheet [data-action="complete-preparation"]')?.closest('.sheet');
  if(!sheet)return;
  const rows=[...sheet.querySelectorAll('[data-prep-step]')].map((input)=>input.closest('.check-row')).filter(Boolean);
  if(!rows.length)return;
  const firstIncomplete=rows.findIndex((row)=>!row.querySelector('input')?.checked);
  rows.forEach((row,index)=>{row.hidden=firstIncomplete>=0?index!==firstIncomplete:true;});

  let progress=sheet.querySelector('[data-prep-guided-progress]');
  if(!progress){progress=document.createElement('div');progress.className='notice';progress.dataset.prepGuidedProgress='true';rows[0].parentElement?.before(progress);}
  progress.setAttribute('role','status');

  const structured=sheet.querySelector('[data-prep-structured]');
  if(firstIncomplete>=0){
    progress.textContent=`Etapa ${firstIncomplete+1} de ${rows.length} · conclua esta etapa para avançar.`;
    if(structured)structured.hidden=true;
  }else{
    progress.textContent=`Etapa final · registre frequência, proteção e permissão para concluir a preparação.`;
    if(structured)structured.hidden=false;
  }
}
new MutationObserver(enhanceGuidedPreparation).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['checked']});
queueMicrotask(enhanceGuidedPreparation);
