let enhancing=false;
function brandMark(){
  const brand=document.querySelector('.brand');if(!brand||brand.querySelector('.fluxa-brand-mark'))return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.classList.add('fluxa-brand-mark');
  svg.innerHTML='<path d="M3 9c5-4 9-4 14 0s9 4 12 1"/><path d="M3 16c5-4 9-4 14 0s9 4 12 1"/><path d="M3 23c5-4 9-4 14 0s9 4 12 1"/>';
  brand.prepend(svg);
}
function sessionHome(main){return main?.querySelector(':scope > .eyebrow')?.textContent?.trim()==='Sessão em andamento';}
function cleanHome(){
  const main=document.querySelector('main');if(!main||!sessionHome(main)||!document.body.classList.contains('fluxa-home-refreshed'))return;
  const cockpit=main.querySelector('[data-home-cockpit]');if(!cockpit)return;
  for(const section of main.querySelectorAll(':scope > .section')){
    if(section.classList.contains('home-support-section')||section.classList.contains('home-collapsible-section'))continue;
    const heading=section.querySelector('h2')?.textContent?.trim()||'';
    const grid=section.querySelector('.action-grid');
    if(grid||heading==='O que você deseja fazer agora?'||heading==='Novo trabalho')section.hidden=true;
  }
  main.querySelectorAll(':scope > .action-grid').forEach(grid=>{if(!grid.closest('[data-home-cockpit]'))grid.hidden=true;});
}
function enhance(){if(enhancing)return;enhancing=true;try{brandMark();cleanHome();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
