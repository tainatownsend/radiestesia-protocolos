(function(){
'use strict';
const $=id=>document.getElementById(id);
let busy=false;
function compactHome(){
 const home=$('homeView'),dash=$('v16Dashboard'),journey=$('v18PractitionerCompact');
 if(!home||home.classList.contains('hidden')||!dash)return;
 if(journey&&journey.parentElement!==dash){dash.appendChild(journey)}
 Array.from(home.children).forEach(el=>{
   if(el!==dash){el.setAttribute('aria-hidden','true');el.style.display='none'}
 });
 document.querySelectorAll('footer .lumeraFooterMark, footer .v16Credit').forEach(x=>x.remove());
}
function state(){
 document.body.classList.toggle('v19DivorceOpen',!!($('divorceView')&&!$('divorceView').classList.contains('hidden')));
}
function run(){if(busy)return;busy=true;requestAnimationFrame(()=>{compactHome();state();busy=false})}
function install(){
 run();
 const o=new MutationObserver(run);o.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('lumera:languagechange',run);
 window.addEventListener('storage',run);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

(function loadLumeraV20QA(){
 if(document.querySelector('script[data-lumera-v20-qa]'))return;
 const css=document.createElement('link');css.rel='stylesheet';css.href='lumera-v20-qa.css?v=20260818-20b';css.dataset.lumeraV20Qa='1';document.head.appendChild(css);
 const js=document.createElement('script');js.src='lumera-v20-qa2.js?v=20260818-20b';js.dataset.lumeraV20Qa='1';js.defer=true;document.body.appendChild(js);
})();
