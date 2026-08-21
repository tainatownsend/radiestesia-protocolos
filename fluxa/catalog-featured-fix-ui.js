import './root-treatment-prefill-ui.js';

function bindFeatured(){
  const button=document.querySelector('#investigation-chooser-overlay [data-start-root-by-title]');if(!button)return;
  button.removeAttribute('data-start-root-by-title');button.dataset.startRootProtocol='root_master';
}
new MutationObserver(bindFeatured).observe(document.body,{childList:true,subtree:true});queueMicrotask(bindFeatured);
