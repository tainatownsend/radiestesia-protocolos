function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
function polishTherapistLanguage() {
  const main=document.querySelector('main');
  if(!main)return;

  const choose=main.querySelector('[data-action="choose-assisted"]');
  if(choose){
    const heading=choose.closest('.card')?.querySelector('h2')?.textContent?.trim();
    setText(choose,heading==='Escolha um assistido'?'Escolher quem será atendido':'Trocar assistido');
  }

  const grid=main.querySelector('.action-grid');
  if(grid){
    const heading=grid.closest('.section')?.querySelector('.section-head h2');
    setText(heading,'O que você deseja fazer agora?');
  }

  setText(main.querySelector('[data-action="close-session"]'),'Revisar e encerrar');
  setText(main.querySelector('[data-action="resume-latest-investigation"]'),'Retomar investigação');
  document.querySelectorAll('[data-general-assessment] strong').forEach((node)=>setText(node,'Avaliar'));
}

new MutationObserver(polishTherapistLanguage).observe(document.body,{childList:true,subtree:true});
queueMicrotask(polishTherapistLanguage);
