import { createStore } from './store.js';
import { createTreatment, getOpenSession } from './domain.js';
import { addTreatmentComponent } from './backlog.js';

const store = createStore();
let enhancing = false;

function componentFields(index) {
  return `<section class="card treatment-component-draft" data-treatment-component-draft>
    <div class="section-head"><div><p class="eyebrow">Componente ${index}</p><h3>Gráfico, ferramenta ou recurso</h3></div>${index > 1 ? '<button class="btn ghost small" type="button" data-remove-treatment-component>Remover</button>' : ''}</div>
    <div class="form-grid">
      <div class="field"><label>Nome do componente</label><input name="componentName" required placeholder="Nome do recurso"></div>
      <div class="field"><label>Comando / orientação</label><textarea name="instructions" placeholder="Comando associado ao componente"></textarea></div>
      <div class="duration-grid"><div class="field"><label>Duração <span class="muted">(opcional)</span></label><input name="durationValue" type="number" min="1" inputmode="numeric" placeholder="Sem prazo"></div><div class="field"><label>Unidade</label><select name="durationUnit"><option value="MINUTE">minuto(s)</option><option value="HOUR">hora(s)</option><option value="DAY">dia(s)</option><option value="WEEK">semana(s)</option><option value="MONTH">mês(es)</option></select></div></div>
    </div>
  </section>`;
}

function renumber(form) {
  form.querySelectorAll('[data-treatment-component-draft]').forEach((section, index) => {
    const eyebrow = section.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = `Componente ${index + 1}`;
    const remove = section.querySelector('[data-remove-treatment-component]');
    if (index === 0 && remove) remove.remove();
  });
}

function linkComponentToTool(componentId, toolId) {
  if (!toolId) return;
  store.setState((state) => {
    const draft = structuredClone(state);
    const component = draft.treatmentComponents.find((item) => item.id === componentId);
    const tool = draft.tools.find((item) => item.id === toolId && !item.archivedAt);
    if (!component || !tool) return draft;
    component.toolId = tool.id;
    component.toolSnapshot = { id: tool.id, type: tool.type, name: tool.name };
    component.updatedAt = store.nowIso();
    return draft;
  });
}

function enhanceTreatmentForm() {
  const form = document.querySelector('#treatment-form');
  if (!form || form.dataset.multiComponentEnhanced) return;
  form.dataset.multiComponentEnhanced = 'true';

  const componentName = form.querySelector('[name="componentName"]');
  const instructions = form.querySelector('[name="instructions"]');
  const durationValue = form.querySelector('[name="durationValue"]');
  const durationUnit = form.querySelector('[name="durationUnit"]');
  if (!componentName || !instructions || !durationValue || !durationUnit) return;
  durationValue.required = false;
  durationValue.removeAttribute('required');
  durationValue.placeholder = 'Sem prazo';
  const durationLabel = durationValue.closest('.field')?.querySelector('label');
  if (durationLabel && !durationLabel.querySelector('.muted')) durationLabel.insertAdjacentHTML('beforeend',' <span class="muted">(opcional)</span>');

  const componentStart = componentName.closest('.field');
  const instructionsField = instructions.closest('.field');
  const durationGrid = durationValue.closest('.duration-grid');
  const submit = form.querySelector('button[type="submit"]');
  if (!componentStart || !instructionsField || !durationGrid || !submit) return;

  const first = document.createElement('section');
  first.className = 'card treatment-component-draft';
  first.dataset.treatmentComponentDraft = 'true';
  first.innerHTML = `<div class="section-head"><div><p class="eyebrow">Componente 1</p><h3>Gráfico, ferramenta ou recurso</h3></div></div><div class="form-grid"></div>`;
  const fields = first.querySelector('.form-grid');
  fields.append(componentStart, instructionsField, durationGrid);
  submit.before(first);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn secondary wide';
  add.dataset.addTreatmentComponentDraft = 'true';
  add.textContent = 'Adicionar outro componente';
  submit.before(add);
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try { enhanceTreatmentForm(); } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.querySelector('#app'), { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const review = event.target.closest('[data-review-treatment]');
  if (review) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const card = review.closest('.treatment-card');
    let manage = card?.querySelector('[data-backlog-manage-components]');
    let temporary = false;
    if (!manage && card) {
      manage = document.createElement('button');
      manage.type = 'button';
      manage.hidden = true;
      manage.dataset.backlogManageComponents = review.dataset.reviewTreatment;
      card.appendChild(manage);
      temporary = true;
    }
    manage?.click();
    if (temporary) manage.remove();
    return;
  }

  const add = event.target.closest('[data-add-treatment-component-draft]');
  if (add) {
    const form = add.closest('#treatment-form');
    const count = form.querySelectorAll('[data-treatment-component-draft]').length + 1;
    add.insertAdjacentHTML('beforebegin', componentFields(count));
    return;
  }
  const remove = event.target.closest('[data-remove-treatment-component]');
  if (remove) {
    const form = remove.closest('#treatment-form');
    remove.closest('[data-treatment-component-draft]')?.remove();
    renumber(form);
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id !== 'treatment-form' || !form.dataset.multiComponentEnhanced) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const data = new FormData(form);
    const session = getOpenSession(store.getState());
    if (!session?.currentAssistedEntityId) throw new Error('Selecione um assistido antes de criar o tratamento.');

    const names = data.getAll('componentName');
    const instructions = data.getAll('instructions');
    const durations = data.getAll('durationValue');
    const units = data.getAll('durationUnit');
    const toolIds = data.getAll('toolId');
    if (!names.length) throw new Error('Adicione pelo menos um componente.');

    const created = createTreatment(store, {
      sessionId: session.id,
      assistedEntityId: session.currentAssistedEntityId,
      findingIds: (form.dataset.findings || '').split(',').filter(Boolean),
      title: data.get('title'),
      componentName: names[0],
      instructions: instructions[0],
      durationValue: durations[0],
      durationUnit: units[0]
    });
    linkComponentToTool(created.component.id, toolIds[0]);

    for (let i = 1; i < names.length; i += 1) {
      const component = addTreatmentComponent(store, {
        sessionId: session.id,
        treatmentId: created.treatment.id,
        name: names[i],
        instructions: instructions[i],
        durationValue: durations[i],
        durationUnit: units[i]
      });
      linkComponentToTool(component.id, toolIds[i]);
    }

    document.querySelector('[data-action="dismiss-sheet"]')?.click();
  } catch (error) {
    alert(error.message);
  }
}, true);
