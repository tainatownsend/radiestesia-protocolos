(function(){
'use strict';
const $=id=>document.getElementById(id);
let busy=false;
function compactHome(){
 const home=$('homeView'),dash=$('v16Dashboard'),journey=$('v18PractitionerCompact');
 if(!home||home.classList.contains('hidden')||!dash)return;
 // Keep the compact practitioner block physically inside the dashboard flow.
 // This avoids legacy wrappers/margins creating a large empty gap between History and Journey.
 if(journey&&journey.parentElement!==dash){dash.appendChild(journey)}
 // Only the current dashboard should participate in layout on Home.
 Array.from(home.children).forEach(el=>{
   if(el!==dash){el.setAttribute('aria-hidden','true');el.style.display='none'}
 });
 // Remove duplicated footer brand line; attribution remains in the credit line.
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
