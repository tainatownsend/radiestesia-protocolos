import { inspectStorageHealth } from './storage-health.js';

function fmt(iso){return iso?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso)):'—';}
function ensure(){
  const main=document.querySelector('main');if(!main)return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Hoje')return;
  const health=inspectStorageHealth();
  let section=main.querySelector('[data-backup-reminder]');
  if(['READ_ERROR','WRITE_ERROR'].includes(health.status)){section?.remove();return;}
  const last=health.lastExportAt;
  const days=last?Math.floor((Date.now()-new Date(last).getTime())/86400000):null;
  if(days!==null&&days<7){section?.remove();return;}
  const signature=last?`old:${last}`:'never';
  if(section?.dataset.backupSignature===signature)return;
  if(!section){section=document.createElement('section');section.className='section notice-card';section.dataset.backupReminder='true';main.appendChild(section);}
  section.dataset.backupSignature=signature;
  section.innerHTML=`<div><p class="eyebrow">Segurança dos dados</p><h2>${last?'Sua última cópia local já tem alguns dias.':'Você ainda não exportou uma cópia local.'}</h2><p>${last?`Última exportação confirmada: ${fmt(last)}.`:'O histórico está somente neste dispositivo. Exporte uma cópia periodicamente.'}</p></div><button class="btn secondary" data-trigger-backup-export>Exportar agora</button>`;
}
new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});
queueMicrotask(ensure);
