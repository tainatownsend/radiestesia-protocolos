import { validateCustomProtocolGraph } from './custom-protocol-rules.js';

document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=='custom-protocol-form')return;
  try{
    const data=new FormData(form);
    validateCustomProtocolGraph({
      texts:data.getAll('questionText'),
      yesTargets:data.getAll('yesTarget'),
      noTargets:data.getAll('noTarget')
    });
  }catch(error){
    event.preventDefault();
    event.stopImmediatePropagation();
    alert(error.message);
  }
},true);
