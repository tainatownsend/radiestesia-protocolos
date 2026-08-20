import { createStore } from './store.js';
import { treatmentComponentResolution } from './remaining.js';

const store=createStore();
let enhancing=false;

function treatmentIdForCard(card){
  if(card.dataset.treatmentId)return card.dataset.treatmentId;
  const candidates=[
    ['reviewTreatment','[data-review-treatment]'],
    ['interruptTreatment','[data-interrupt-treatment]'],
    ['resumeTreatment','[data-resume-treatment]'],
    ['treatmentHistory','[data-treatment-history]'],
    ['backlogManageComponents','[data-backlog-manage-components]'],
    ['startPlannedTreatment','[data-start-planned-treatment]'],
    ['administrativeComplete','[data-administrative-complete]']
  ];
  for(const [key,selector] of candidates){const node=card.querySelector(selector);if(node?.dataset?.[key])return node.dataset[key];}
  return null;
}
function ensureIdentity(card){
  const id=treatmentIdForCard(card);if(!id)return;
  card.dataset.treatmentId=id;
  const state=store.getState();const treatment=state.treatments.find((t)=>t.id===id);if(!treatment)return;
  const wrong=card.querySelector('[data-final-cycle]');
  if(wrong&&wrong.dataset.finalCycle!==id)wrong.remove();
  if(treatment.status!=='IN_PROGRESS')return;
  const resolution=treatmentComponentResolution(state,id);
  if(!resolution.readyForFinalAssessment)return;
  if(card.querySelector(`[data-final-cycle="${CSS.escape(id)}"]`))return;
  const row=card.querySelector('.button-row')||card.appendChild(Object.assign(document.createElement('div'),{className:'button-row'}));
  const button=document.createElement('button');button.className='btn primary small';button.dataset.finalCycle=id;button.textContent='Avaliação final';row.prepend(button);
}
function enhance(){if(enhancing)return;enhancing=true;try{document.querySelectorAll('.treatment-card').forEach(ensureIdentity);}finally{enhancing=false;}}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});queueMicrotask(enhance);
