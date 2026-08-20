let registrationAttempted=false;
const hadController=Boolean(navigator.serviceWorker?.controller);
let updateAvailable=false;

function showUpdateBanner(){
  if(!updateAvailable||document.querySelector('[data-app-update-banner]'))return;
  const banner=document.createElement('div');
  banner.className='app-update-banner';banner.dataset.appUpdateBanner='true';banner.setAttribute('role','status');
  banner.innerHTML='<span>Nova versão do Fluxa disponível.</span><button type="button" class="btn primary small" data-apply-app-update>Atualizar</button>';
  document.body.appendChild(banner);
}

async function registerOfflineSupport(){
  if(registrationAttempted||!('serviceWorker' in navigator))return;
  registrationAttempted=true;
  try{
    const registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
    registration.update().catch(()=>{});
  }catch(_){
    // Offline support is an enhancement; Fluxa remains usable without registration.
  }
}

function updateOfflineState(){
  document.body.classList.toggle('fluxa-offline',!navigator.onLine);
  let banner=document.querySelector('[data-offline-banner]');
  if(navigator.onLine){banner?.remove();return;}
  if(banner)return;
  banner=document.createElement('div');banner.className='offline-banner';banner.dataset.offlineBanner='true';banner.setAttribute('role','status');
  banner.textContent='Sem conexão · trabalhando com a cópia local do Fluxa';document.body.appendChild(banner);
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hadController)return;
    updateAvailable=true;
    showUpdateBanner();
  });
}

window.addEventListener('online',updateOfflineState);
window.addEventListener('offline',updateOfflineState);
document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-apply-app-update]');if(!button)return;
  button.disabled=true;button.textContent='Atualizando…';window.location.reload();
},true);
queueMicrotask(()=>{updateOfflineState();registerOfflineSupport();});
