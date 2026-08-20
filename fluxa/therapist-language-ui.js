function polishTherapistLanguage() {
  const main=document.querySelector('main');
  if(!main)return;

  const choose=main.querySelector('[data-action="choose-assisted"]');
  if(choose){
    const heading=choose.closest('.card')?.querySelector('h2')?.textContent?.trim();
    choose.textContent=heading==='Escolha um assistido'?'Escolher quem será atendido':'Trocar assistido';
  }

  const grid=main.querySelector('.action-grid');
  if(grid){
    const heading=grid.closest('.section')?.querySelector('.section-head h2');
    if(heading)heading.textContent='O que você deseja fazer agora?';
  }

  const close=main.querySelector('[data-action="close-session"]');
  if(close)close.textContent='Revisar e encerrar';

  const resume=main.querySelector('[data-action="resume-latest-investigation"]');
  if(resume)resume.textContent='Retomar investigação';

  document.querySelectorAll('[data-general-assessment] strong').forEach((node)=>node.textContent='Avaliar');
}

new MutationObserver(polishTherapistLanguage).observe(document.body,{childList:true,subtree:true});
queueMicrotask(polishTherapistLanguage);
