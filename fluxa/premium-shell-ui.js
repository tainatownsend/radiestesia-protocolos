let enhancing=false;

function waveMark(className='fluxa-brand-mark'){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.classList.add(className);
  svg.innerHTML='<path d="M3 9c5-4 9-4 14 0s9 4 12 1"/><path d="M3 16c5-4 9-4 14 0s9 4 12 1"/><path d="M3 23c5-4 9-4 14 0s9 4 12 1"/>';
  return svg;
}
function brandMark(){
  const brand=document.querySelector('.brand');if(!brand)return;
  if(!brand.querySelector('.fluxa-brand-mark'))brand.prepend(waveMark());
  brand.setAttribute('aria-label','Fluxa · Hoje');
}
function navIcon(route){
  const paths={
    today:'<path d="M4 10.5 12 4l8 6.5V20H7v-7h10v7"/>',
    treatments:'<path d="M5 18.5c2.3-5.8 6.8-9.3 14-10.7-1.2 6.4-4.8 10.6-10.9 12"/><path d="M7.8 16.2c2.3-2.4 4.9-4.5 7.8-6.2"/>',
    assisted:'<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.4"/><path d="M3.8 19c.8-3.3 2.7-5 5.4-5s4.7 1.7 5.5 5M14.2 14.8c2.8-.7 5 .7 6 4.2"/>',
    library:'<path d="M4.5 5.5h6.7c1.2 0 2.2 1 2.2 2.2V20c0-1.4-1.1-2.5-2.5-2.5H4.5z"/><path d="M19.5 5.5h-6.7c-1.2 0-2.2 1-2.2 2.2V20c0-1.4 1.1-2.5 2.5-2.5h6.4z"/>'
  };
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('bottom-nav-icon');svg.innerHTML=paths[route]||'';return svg;
}
function enhanceNav(){
  document.querySelectorAll('.bottom-nav .nav-btn').forEach(button=>{
    if(button.querySelector('.bottom-nav-icon'))return;
    const route=button.dataset.route||'';const label=button.textContent.trim();button.textContent='';
    button.append(navIcon(route));
    const span=document.createElement('span');span.className='bottom-nav-label';span.textContent=label;button.append(span);
  });
}
function enhanceTopbar(){
  const topbar=document.querySelector('.topbar');if(!topbar)return;
  const open=!!topbar.querySelector('.session-indicator');
  topbar.classList.toggle('topbar-session-open',open);
  document.body.classList.toggle('fluxa-session-open',open);
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
function enhance(){if(enhancing)return;enhancing=true;try{brandMark();enhanceTopbar();enhanceNav();cleanHome();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
