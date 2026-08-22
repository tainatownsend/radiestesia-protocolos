document.addEventListener('change',(event)=>{
  const input=event.target.closest?.('#orienting-assessment-form input[name="focusArea"]');
  if(!input||!input.checked)return;
  const form=input.form;if(!form)return;
  const all=[...form.querySelectorAll('input[name="focusArea"]')];
  if(input.value==='unclear'){
    for(const other of all)if(other!==input)other.checked=false;
    return;
  }
  const unclear=all.find(item=>item.value==='unclear');
  if(unclear)unclear.checked=false;
},true);
