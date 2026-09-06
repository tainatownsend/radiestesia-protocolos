// Preview refresh marker: mobile validation round 4.
const STYLE='validation-round-4.css';
function ensureStyle(){if(document.querySelector(`link[href="${STYLE}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=STYLE;document.head.appendChild(l);}
function normalizeText(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}
function hideIdleRecentHistory(){
  const noSession=!document.querySelector('.session-indicator');
  if(!noSession)return;
  document.querySelectorAll('main .section').forEach((section)=>{
    const heading=[...section.querySelectorAll('h1,h2,h3,strong')].find((node)=>normalizeText(node)==='Atividade recente');
    if(heading)section.classList.add('home-recent-history-hidden');
  });
  document.querySelectorAll('main .section-head').forEach((head)=>{
    if(normalizeText(head).includes('Atividade recente'))head.closest('.section')?.classList.add('home-recent-history-hidden');
  });
}
function reconcilePreparation(){
  document.querySelectorAll('.sheet').forEach((sheet)=>{
    if(!sheet.querySelector('[data-prep-structured]'))return;
    sheet.classList.add('prep-mobile-reconciled');
    const intro=[...sheet.querySelectorAll(':scope>p.muted')].find((p)=>normalizeText(p).startsWith('Marque cada etapa conforme concluir'));
    if(intro)intro.textContent='Conclua os quatro checkpoints e registre sua preparação. O progresso é salvo automaticamente.';
  });
}
function enhance(){ensureStyle();hideIdleRecentHistory();reconcilePreparation();}
new MutationObserver(()=>queueMicrotask(enhance)).observe(document.body,{childList:true,subtree:true});
queueMicrotask(enhance);
window.addEventListener('fluxa:state-changed',()=>queueMicrotask(enhance));
