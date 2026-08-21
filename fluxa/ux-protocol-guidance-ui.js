const guidance={
  investigacao_inicial:'Use quando já existe um tema e você quer definir a direção do trabalho.',
  investigacao_completa:'Use quando precisa mapear origem, manutenção, contexto e consequências.',
  protocolo_especifico:'Use quando o tema já está claro e pede um aprofundamento específico.',
  causa_raiz:'Use quando é apropriado aprofundar a origem do tema.'
};
let enhancing=false;
function enhance(){
  if(enhancing)return;enhancing=true;
  try{
    const chooser=document.querySelector('#investigation-chooser-overlay');if(!chooser)return;
    const quick=chooser.querySelector('[data-start-quick-investigation]')?.closest('article.card');
    if(quick&&!quick.querySelector('[data-ux-protocol-intent]')){const p=document.createElement('p');p.className='ux-protocol-intent';p.dataset.uxProtocolIntent='true';p.textContent='Use quando quer saber rapidamente se há algo prioritário e se vale aprofundar.';quick.querySelector('.muted')?.after(p);}
    chooser.querySelectorAll('[data-start-branching]').forEach((button)=>{
      const card=button.closest('article.card'),copy=guidance[button.dataset.startBranching];if(!card||!copy||card.querySelector('[data-ux-protocol-intent]'))return;
      const p=document.createElement('p');p.className='ux-protocol-intent';p.dataset.uxProtocolIntent='true';p.textContent=copy;card.querySelector('.muted')?.after(p);
    });
  }finally{enhancing=false;}
}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
