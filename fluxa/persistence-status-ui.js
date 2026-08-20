import { createStore } from './store.js';

const store=createStore();

function showPersistenceWarning(){
  if(document.querySelector('[data-persistence-warning]'))return;
  const banner=document.createElement('div');
  banner.className='persistence-warning-banner';banner.dataset.persistenceWarning='true';banner.setAttribute('role','alert');
  banner.innerHTML='<div><strong>Não foi possível acessar o armazenamento local.</strong><span>O Fluxa não consegue garantir que novos registros serão salvos neste dispositivo. Verifique as permissões/armazenamento do navegador antes de continuar o atendimento.</span></div><button type="button" class="btn primary small" data-retry-persistence>Recarregar</button>';
  document.body.appendChild(banner);
}

window.addEventListener('fluxa:persistence-error',showPersistenceWarning);
document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-retry-persistence]');if(!button)return;
  button.disabled=true;button.textContent='Recarregando…';window.location.reload();
},true);
queueMicrotask(()=>{if(store.getState().meta?.lastPersistenceError)showPersistenceWarning();});
