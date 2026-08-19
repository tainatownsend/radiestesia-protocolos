(function(){
'use strict';
const $=id=>document.getElementById(id);
const LANG='lumera_language_v13';
const t=(pt,en)=>localStorage.getItem(LANG)==='en'?en:pt;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

const CATEGORIES={
 all:{pt:'Todos',en:'All',modes:null},
 start:{pt:'Não sei por onde começar',en:'Not sure where to start',modes:['master']},
 deep:{pt:'Investigações profundas',en:'Deep investigations',modes:['finance','prosperity','career','creativity','marriage','family','social','parenting','selfworth','bodyrelation','purpose','repeating','homeenv','master']},
 relations:{pt:'Relacionamentos',en:'Relationships',modes:['marriage','family','social','parenting']},
 work:{pt:'Vida financeira e profissional',en:'Money & career',modes:['finance','prosperity','career','creativity']},
 self:{pt:'Autoconhecimento',en:'Self & wellbeing',modes:['selfworth','bodyrelation','purpose','repeating','homeenv']},
 quick:{pt:'Sessões rápidas',en:'Quick sessions',modes:['quick_balance','quick_hardday','quick_decision','quick_cycle','quick_conflict']}
};

const SEARCH_ALIASES={
 master:'causa raiz root cause origem padrão pattern não sei começar unsure',
 finance:'financeiro finanças dinheiro dívida renda financial money debt income',
 prosperity:'prosperidade abundância receber expansão prosperity abundance receiving growth',
 career:'carreira profissão trabalho liderança emprego career professional work leadership job',
 creativity:'criatividade projetos bloqueio execução creativity projects block execution',
 marriage:'casamento relacionamento casal amor comunicação marriage relationship couple love communication',
 family:'família familiar ancestral transgeracional family ancestry transgenerational',
 social:'social pertencimento amizade rejeição belonging friendship rejection',
 parenting:'parentalidade filhos criança culpa parenting children guilt',
 selfworth:'autoestima amor próprio merecimento autovalor self esteem self love worthiness',
 bodyrelation:'corpo autoimagem vergonha comparação body image shame comparison',
 purpose:'propósito missão caminho direção purpose mission path direction',
 repeating:'padrões repetitivos ciclos gatilhos repeating patterns cycles triggers',
 homeenv:'casa ambiente organização segurança home environment organization safety',
 quick_balance:'limpeza equilíbrio reequilíbrio cleansing balance rebalancing',
 quick_hardday:'dia difícil estresse cansaço hard day stress exhaustion',
 quick_decision:'decisão clareza escolha decision clarity choice',
 quick_cycle:'encerramento ciclo fechamento transição closure cycle transition',
 quick_conflict:'conflito discussão impacto conflict argument impact'
};

let filter='all',query='';
function allModes(){return [...document.querySelectorAll('.tab[data-mode]')].map(x=>x.dataset.mode)}
function title(mode){return window.DATA?.[mode]?.title||document.querySelector(`[data-open-mode="${CSS.escape(mode)}"] strong`)?.textContent||mode}
function copy(mode){return document.querySelector(`[data-open-mode="${CSS.escape(mode)}"] small`)?.textContent||''}
function categoryFor(mode){if(mode==='master')return'start';if(mode.startsWith('quick_'))return'quick';if(CATEGORIES.relations.modes.includes(mode))return'relations';if(CATEGORIES.work.modes.includes(mode))return'work';return'self'}
function iconFor(mode){if(mode==='master')return'◎';if(mode.startsWith('quick_'))return'◌';if(categoryFor(mode)==='relations')return'♡';if(categoryFor(mode)==='work')return'↗';return'✦'}
function openMode(mode){
 close();
 const source=document.querySelector(`[data-open-mode="${CSS.escape(mode)}"]`);
 if(source){source.click();return}
 const tab=document.querySelector(`.tab[data-mode="${CSS.escape(mode)}"]`);
 if(tab){tab.click();setTimeout(()=>document.querySelector(`[data-open-mode="${CSS.escape(mode)}"]`)?.click(),20)}
}
function ensure(){let o=$('v22Library');if(o)return o;o=document.createElement('div');o.id='v22Library';o.className='v22Overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','v22LibraryTitle');document.body.appendChild(o);return o}
function categoryLabel(k){const c=CATEGORIES[k];return localStorage.getItem(LANG)==='en'?c.en:c.pt}
function renderShell(initial='all'){
 filter=initial;query='';
 const o=ensure();
 o.innerHTML=`<div class="v22Sheet"><div class="v22Head"><div><span class="v22Eyebrow">Lumera</span><h2 id="v22LibraryTitle">${t('Biblioteca de protocolos','Protocol library')}</h2><p>${t('Busque pelo tema ou escolha uma categoria.','Search by topic or choose a category.')}</p></div><button type="button" class="v22Close" aria-label="${t('Fechar','Close')}">×</button></div><label class="v22Search"><span>${t('Buscar protocolo','Search protocols')}</span><input id="v22Search" type="search" placeholder="${t('Ex.: dinheiro, relacionamento, ansiedade, propósito…','E.g. money, relationship, anxiety, purpose…')}" autocomplete="off" enterkeyhint="search"></label><div class="v22Filters" role="group" aria-label="${t('Categorias de protocolos','Protocol categories')}">${Object.keys(CATEGORIES).map(k=>`<button type="button" data-v22-filter="${k}" class="${k===filter?'active':''}" aria-pressed="${k===filter}">${esc(categoryLabel(k))}</button>`).join('')}</div><div class="v22ResultsHead"><strong id="v22ResultTitle"></strong><span id="v22ResultCount"></span></div><div id="v22List" class="v22List"></div></div>`;
 o.classList.add('open');document.body.classList.add('v22ModalOpen');
 o.querySelector('.v22Close').onclick=close;
 o.onclick=e=>{if(e.target===o)close()};
 $('v22Search').oninput=e=>{query=e.target.value;paint()};
 o.querySelectorAll('[data-v22-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.v22Filter;o.querySelectorAll('[data-v22-filter]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))});paint()});
 paint();
 requestAnimationFrame(()=>$('v22Search')?.focus({preventScroll:true}));
}
function match(mode){
 if(filter!=='all'&&!CATEGORIES[filter].modes?.includes(mode))return false;
 const q=query.trim().toLocaleLowerCase();if(!q)return true;
 const hay=`${title(mode)} ${copy(mode)} ${SEARCH_ALIASES[mode]||''}`.toLocaleLowerCase();
 return q.split(/\s+/).every(term=>hay.includes(term));
}
function paint(){
 const list=$('v22List');if(!list)return;
 const modes=allModes().filter(match);
 const heading=query.trim()?t('Resultados da busca','Search results'):categoryLabel(filter);
 $('v22ResultTitle').textContent=heading;
 $('v22ResultCount').textContent=`${modes.length} ${modes.length===1?t('protocolo','protocol'):t('protocolos','protocols')}`;
 list.innerHTML=modes.length?modes.map(mode=>`<button type="button" class="v22Protocol" data-v22-mode="${esc(mode)}"><span class="v22Icon" aria-hidden="true">${iconFor(mode)}</span><span class="v22ProtocolText"><strong>${esc(title(mode))}</strong>${copy(mode)?`<small>${esc(copy(mode))}</small>`:''}<em>${esc(categoryLabel(categoryFor(mode)))}</em></span><span class="v22Chevron" aria-hidden="true">›</span></button>`).join(''):`<div class="v22Empty"><b>${t('Nenhum protocolo encontrado','No protocols found')}</b><p>${t('Tente outra palavra ou escolha “Todos”.','Try another keyword or choose “All”.')}</p><button type="button" id="v22Clear">${t('Limpar busca','Clear search')}</button></div>`;
 list.querySelectorAll('[data-v22-mode]').forEach(b=>b.onclick=()=>openMode(b.dataset.v22Mode));
 $('v22Clear')?.addEventListener('click',()=>{query='';filter='all';renderShell('all')});
}
function close(){const o=$('v22Library');if(o)o.classList.remove('open');document.body.classList.remove('v22ModalOpen')}
function cleanHome(){
 const home=$('homeView');if(!home)return;
 home.classList.add('v22CleanHome');
 const dash=$('v16Dashboard');if(dash)dash.setAttribute('aria-label',t('Ações principais','Main actions'));
}
function install(){
 cleanHome();
 window.addEventListener('click',e=>{
   const action=e.target.closest?.('[data-v16-action]');
   if(action&&['library','quick'].includes(action.dataset.v16Action)){
     e.preventDefault();e.stopImmediatePropagation();
     renderShell(action.dataset.v16Action==='quick'?'quick':'all');
   }
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('v22Library')?.classList.contains('open'))close()});
 window.addEventListener('lumera:languagechange',()=>{cleanHome();if($('v22Library')?.classList.contains('open'))renderShell(filter)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
