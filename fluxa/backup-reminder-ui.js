import { inspectStorageHealth } from './storage-health.js';

function timestamp(value){const time=new Date(value||'').getTime();return Number.isFinite(time)?time:null;}
function fmt(iso){const time=timestamp(iso);return time==null?'—':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(time));}
function ensure(){
  const main=document.querySelector('main');if(!main)return;
  if(main.querySelector('.eyebrow')?.textContent?.trim()!=='Hoje')return;
  const health=inspectStorageHealth();
  let section=main.querySelector('[data-backup-reminder]');
  if(['READ_ERROR','WRITE_ERROR'].includes(health.status)){section?.remove();return;}
  const rawLast=health.lastExportAt;
  const lastTime=timestamp(rawLast);
  const last=lastTime==null?null:rawLast;
  const days=lastTime==null?null:Math.max(0,Math.floor((Date.now()-lastTime)/86400000));
  if(days!==null&&days<7){section?.remove();return;}
  const signature=last?`old:${last}`:'never';
  if(section?.dataset.backupSignature===signature)return;
  if(!section){section=document.createElement('section');section.className='section notice-card';section.dataset.backupReminder='true';main.appendChild(section);}
  section.dataset.backupSignature=signature;
  section.innerHTML=`<div><p class="eyebrow">Segurança dos dados</p><h2>${last?'Sua última cópia local já tem alguns dias.':'Você ainda não exportou uma cópia local.'}</h2><p>${last?`Última exportação confirmada: ${fmt(last)}.`:'O histórico está somente neste dispositivo. Exporte uma cópia periodicamente.'}</p></div><button class="btn secondary" data-trigger-backup-export>Exportar agora</button>`;
}
new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});
queueMicrotask(ensure);
