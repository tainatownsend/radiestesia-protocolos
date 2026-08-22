import { createStore } from './store.js';
import { resumeTreatmentPreservingDuration } from './backlog.js';

const store=createStore();

document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-resume-treatment]');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try{
    resumeTreatmentPreservingDuration(store,button.dataset.resumeTreatment,{preserveRemainingDuration:true});
    location.reload();
  }catch(error){
    alert(error?.message||'Não foi possível retomar o tratamento neste contexto.');
  }
},true);
