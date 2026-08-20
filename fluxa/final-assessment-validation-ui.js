import { validateFinalAssessmentInput } from './final-assessment-rules.js';

function enhance(){
  for(const form of document.querySelectorAll('#final-assessment-form,#final-cycle-form')){
    const frequency=form.querySelector('[name="frequency"]');
    const imbalance=form.querySelector('[name="imbalancePercent"]');
    if(frequency){ frequency.required=true; frequency.setAttribute('aria-required','true'); }
    if(imbalance){ imbalance.required=true; imbalance.setAttribute('aria-required','true'); }
  }
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(!['final-assessment-form','final-cycle-form'].includes(form.id))return;
  const data=new FormData(form);
  try{
    validateFinalAssessmentInput({frequency:data.get('frequency'),imbalancePercent:data.get('imbalancePercent')});
  }catch(error){
    event.preventDefault();
    event.stopImmediatePropagation();
    alert(error.message);
  }
},true);
