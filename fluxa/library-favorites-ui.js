const FAVORITES_KEY='fluxa.toolFavorites';
let favoritesOnly=false;
let enhancing=false;

function favoriteIds(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'));}catch(_){return new Set();}}
function save(ids){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...ids]));}catch(_){} }
function ensureFilter(){
  const controls=document.querySelector('[data-library-filters]');if(!controls||controls.querySelector('[data-library-favorites-only]'))return;
  const wrap=document.createElement('div');wrap.className='field library-favorite-filter';wrap.innerHTML='<label>Atalhos</label><button type="button" class="btn secondary wide" data-library-favorites-only>★ Somente favoritos</button>';controls.appendChild(wrap);
}
function decorateCards(){
  const favorites=favoriteIds();
  document.querySelectorAll('[data-library-tool-id]').forEach((card)=>{
    const id=card.dataset.libraryToolId;const isFavorite=favorites.has(id);card.dataset.favoriteTool=isFavorite?'true':'false';
    let button=card.querySelector('[data-library-toggle-favorite]');
    if(!button){button=document.createElement('button');button.type='button';button.className='library-card-favorite';button.dataset.libraryToggleFavorite=id;button.setAttribute('aria-label','Adicionar aos favoritos');button.textContent='★';const head=card.querySelector('.section-head');head?.prepend(button);}
    if(button){button.classList.toggle('active',isFavorite);button.setAttribute('aria-label',isFavorite?'Remover dos favoritos':'Adicionar aos favoritos');}
  });
}
function applyFavoriteFilter(){
  document.querySelectorAll('[data-library-tool-id]').forEach((card)=>{
    const favoriteVisible=!favoritesOnly||card.dataset.favoriteTool==='true';
    card.classList.toggle('favorite-filter-hidden',!favoriteVisible);
  });
  const button=document.querySelector('[data-library-favorites-only]');if(button){button.classList.toggle('primary',favoritesOnly);button.classList.toggle('secondary',!favoritesOnly);button.textContent=favoritesOnly?'★ Mostrando favoritos':'★ Somente favoritos';}
}
function promoteFavorites(){
  const stack=document.querySelector('[data-basic-tool-library] .stack');if(!stack)return;
  const cards=[...stack.children].filter((node)=>node.matches?.('[data-library-tool-id]'));
  const desired=[...cards].sort((a,b)=>Number(b.dataset.favoriteTool==='true')-Number(a.dataset.favoriteTool==='true'));
  if(cards.every((card,index)=>card===desired[index]))return;
  const fragment=document.createDocumentFragment();desired.forEach((card)=>fragment.appendChild(card));stack.appendChild(fragment);
}
function enhance(){if(enhancing)return;enhancing=true;try{ensureFilter();decorateCards();applyFavoriteFilter();promoteFavorites();}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);

document.addEventListener('click',(event)=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.libraryFavoritesOnly!==undefined){favoritesOnly=!favoritesOnly;applyFavoriteFilter();return;}
  if(button.dataset.libraryToggleFavorite){const ids=favoriteIds(),id=button.dataset.libraryToggleFavorite;ids.has(id)?ids.delete(id):ids.add(id);save(ids);decorateCards();applyFavoriteFilter();promoteFavorites();}
},true);
