import { createStore } from './store.js';
import { getOpenSession, latestPreparation, selectAssistedForSession } from './domain.js';

const store=createStore();

document.addEventListener('click',(event)=>{
  const button=event.target.closest?.('[data-backlog-final-assessment]');
  if(!button)return;
  const state=store.getState();
  const session=getOpenSession(state);
  const treatment=state.treatments.find((item)=>item.id===button.dataset.backlogFinalAssessment);
  if(!session||!treatment||latestPreparation(state,session.id)?.status!=='COMPLETED')return;
  if(session.currentAssistedEntityId!==treatment.assistedEntityId){
    selectAssistedForSession(store,session.id,treatment.assistedEntityId);
  }
},true);
