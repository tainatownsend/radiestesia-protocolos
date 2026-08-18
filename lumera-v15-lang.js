(function(){
'use strict';
function pulse(){['historyView','reportView'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.classList.toggle('v15LangPulse');requestAnimationFrame(()=>el.classList.toggle('v15LangPulse'))})}
const languageObserver=new MutationObserver(pulse);languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
function loadV16(){
 if(document.querySelector('script[data-lumera-v16]'))return;
 const css=document.createElement('link');css.rel='stylesheet';css.href='lumera-v16.css?v=20260818-16';css.dataset.lumeraV16='1';document.head.appendChild(css);
 const i18n=document.createElement('script');i18n.src='lumera-i18n-v16.js?v=20260818-16';i18n.dataset.lumeraI18nV16='1';i18n.onload=()=>{const js=document.createElement('script');js.src='lumera-v16.js?v=20260818-16';js.dataset.lumeraV16='1';document.body.appendChild(js)};document.body.appendChild(i18n);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadV16);else loadV16();
})();
