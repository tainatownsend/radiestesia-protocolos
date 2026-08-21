import { createStore } from './store.js';

const store=createStore();
const milestoneCopy={
  PREPARATION_COMPLETED:'Sessão preparada',
  INVESTIGATION_COMPLETED:'Investigação concluída',
  TREATMENT_STARTED:'Tratamento iniciado',
  TREATMENT_CREATED:'Tratamento registrado',
  REIKI_COMPLETED:'Reiki concluído',
  TREATMENT_FINAL_ASSESSMENT:'Avaliação final registrada',
  TREATMENT_COMPLETED:'Tratamento concluído'
};
let seen=new Set((store.getState().events||[]).map((event)=>event.id));
let timer=null;

function show(message){
  document.querySelector('[data-ux-milestone]')?.remove();
  const node=document.createElement('div');node.className='ux-milestone-toast';node.dataset.uxMilestone='true';node.setAttribute('role','status');node.textContent=`✓ ${message}`;document.body.appendChild(node);
  clearTimeout(timer);timer=setTimeout(()=>node.remove(),1800);
}

store.subscribe((state)=>{
  const fresh=(state.events||[]).filter((event)=>!seen.has(event.id));
  fresh.forEach((event)=>seen.add(event.id));
  if(!fresh.length)return;
  const findings=fresh.filter((event)=>event.eventType==='FINDING_IDENTIFIED');
  if(findings.length){show(`${findings.length} ${findings.length===1?'achado registrado':'achados registrados'}`);return;}
  const last=[...fresh].reverse().find((event)=>milestoneCopy[event.eventType]);
  if(last)show(milestoneCopy[last.eventType]);
});
