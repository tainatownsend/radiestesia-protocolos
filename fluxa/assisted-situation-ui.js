import { createStore } from './store.js';
import { getOpenSession, selectAssistedForSession } from './domain.js';
import { createValidatedAssistedEntity, validateAssistedInput } from './backlog.js';
import { updateAssistedEntity } from './remaining.js';

const store = createStore();

function parseLegacyRelatedPerson(details='') {
  const match = String(details).match(/Pessoa envolvida\/solicitante:\s*(.+)/i);
  return match?.[1]?.trim() || '';
}

function ensureSituationEditField() {
  const form = document.querySelector('#edit-assisted-form[data-type="SITUATION"]');
  if (!form || form.querySelector('[name="relatedPerson"]')) return;
  const assisted = store.getState().assistedEntities.find((item) => item.id === form.dataset.assisted);
  if (!assisted) return;
  const identifier = form.querySelector('[name="identifier"]')?.closest('.field');
  if (!identifier) return;
  const field = document.createElement('div');
  field.className = 'field';
  field.innerHTML = `<label>Pessoa envolvida / solicitante</label><input name="relatedPerson" required>`;
  field.querySelector('input').value = assisted.relatedPerson || parseLegacyRelatedPerson(assisted.details);
  identifier.after(field);
}

new MutationObserver(ensureSituationEditField).observe(document.body,{childList:true,subtree:true});
queueMicrotask(ensureSituationEditField);

document.addEventListener('submit',(event)=>{
  const form = event.target;
  if (form.id === 'assisted-form') {
    const data = new FormData(form);
    if (data.get('type') !== 'SITUATION') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const input = {
        type:'SITUATION',
        displayName:data.get('displayName'),
        identifier:data.get('identifier'),
        relatedPerson:data.get('relatedPerson'),
        details:data.get('details') || null,
        members:[]
      };
      const entity = createValidatedAssistedEntity(store,input);
      const session = getOpenSession(store.getState());
      if (session) selectAssistedForSession(store,session.id,entity.id);
      location.reload();
    } catch(error){ alert(error.message); }
    return;
  }

  if (form.id === 'edit-assisted-form' && form.dataset.type === 'SITUATION') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = new FormData(form);
    try {
      const input = {
        type:'SITUATION',
        displayName:data.get('displayName'),
        identifier:data.get('identifier'),
        relatedPerson:data.get('relatedPerson'),
        details:data.get('details') || null,
        members:[]
      };
      validateAssistedInput(input);
      updateAssistedEntity(store,form.dataset.assisted,input);
      location.reload();
    } catch(error){ alert(error.message); }
  }
},true);
