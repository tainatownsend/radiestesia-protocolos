import { createStore } from './store.js';
import { getOpenSession, TreatmentStatus } from './domain.js';
import { treatmentComponentResolution } from './remaining.js';
import { createPlannedTreatment } from './treatment-planning.js';
import { enrichComponentWithTreatmentItem } from './treatment-item-graphs.js';

const store = createStore();
let scheduled = false;

const EVENT_LABELS = Object.freeze({
  SESSION_STARTED:'Sessão iniciada', PREPARATION_STARTED:'Preparação iniciada', PREPARATION_COMPLETED:'Preparação concluída',
  SESSION_ASSISTED_SELECTED:'Assistido selecionado', INVESTIGATION_STARTED:'Investigação iniciada', INVESTIGATION_RESUMED:'Investigação retomada',
  INVESTIGATION_COMPLETED:'Investigação concluída', FINDING_IDENTIFIED:'Achado registrado', TREATMENT_CREATED:'Tratamento criado',
  TREATMENT_STARTED:'Tratamento iniciado', TREATMENT_REVIEWED:'Tratamento revisado', TREATMENT_COMPLETED:'Tratamento concluído',
  TREATMENT_INTERRUPTED:'Tratamento interrompido', TREATMENT_RESUMED:'Tratamento retomado', COMPONENT_STARTED:'Componente iniciado',
  COMPONENT_COMPLETED:'Componente concluído', COMPONENT_REVIEWED:'Componente revisado', COMPONENT_DISMANTLED:'Componente desmontado',
  COMPONENT_ADDED:'Componente adicionado', COMPONENT_STOPPED:'Componente interrompido', COMPONENT_REPLACED:'Componente substituído',
  COMPONENT_RESCHEDULED:'Prazo ajustado', TREATMENT_FINAL_ASSESSMENT:'Avaliação final registrada', NOTE_CREATED:'Anotação',
  REIKI_STARTED:'Reiki iniciado', REIKI_PAUSED:'Reiki pausado', REIKI_RESUMED:'Reiki retomado', REIKI_COMPLETED:'Reiki concluído'
});

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function safeTime(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : 0;
}
function formatTime(value) {
  if (!safeTime(value)) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour:'2-digit', minute:'2-digit' }).format(new Date(value));
}
function assistedName(state, id) {
  return (state.assistedEntities || []).find((item) => item.id === id)?.displayName || 'Assistido';
}
function treatmentById(state, id) {
  return (state.treatments || []).find((item) => item.id === id) || null;
}
function componentById(state, id) {
  return (state.treatmentComponents || []).find((item) => item.id === id) || null;
}

function markSheets() {
  const overlays = [...document.querySelectorAll('.modal-backdrop')];
  document.body.classList.toggle('fluxa-mobile-sheet-open', overlays.length > 0);
  for (const overlay of overlays) {
    overlay.classList.add('mx3-modal-backdrop');
    const sheet = overlay.querySelector(':scope > .sheet');
    if (!sheet) continue;
    sheet.classList.add('mx3-mobile-sheet');
    sheet.setAttribute('role', sheet.getAttribute('role') || 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.querySelector(':scope > .sheet-head')?.classList.add('mx3-sheet-header');

    const form = sheet.querySelector('form');
    const submit = form?.querySelector('button[type="submit"]');
    if (submit) submit.classList.add('mx3-sticky-cta');

    const preparation = sheet.querySelector('[data-action="complete-preparation"]');
    preparation?.closest('.section')?.classList.add('mx3-sticky-footer');

    const binary = sheet.querySelector(':scope > .binary-actions');
    if (binary) {
      sheet.classList.add('mx3-question-sheet');
      binary.classList.add('mx3-binary-footer');
      sheet.querySelector(':scope > .save-state')?.classList.add('mx3-question-save-state');
    }

    if (form?.matches('#findings-form,#branch-findings-form')) sheet.classList.add('mx3-findings-sheet');
    if (form?.matches('#final-assessment-form,#final-cycle-form')) sheet.classList.add('mx3-final-sheet');
    if (form?.id === 'treatment-form') sheet.classList.add('mx3-treatment-sheet');
    if (sheet.querySelector('[data-hawkins-baseline-form]')) sheet.classList.add('mx3-hawkins-sheet');
  }
}

function sectionMarker(step, title, detail = '') {
  const node = document.createElement('div');
  node.className = 'mx3-composer-step';
  node.innerHTML = `<span>${esc(step)}</span><div><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
  return node;
}
function compactTreatmentComposer() {
  const form = document.querySelector('#treatment-form');
  if (!form) return;
  form.classList.add('mx3-treatment-composer');
  const sheet = form.closest('.sheet');
  sheet?.classList.add('mx3-treatment-sheet');

  const title = form.querySelector('[name="title"]')?.closest('.field');
  title?.classList.add('mx3-treatment-title-field');
  const objective = form.querySelector('[data-treatment-objective-field]');
  objective?.classList.add('mx3-treatment-objective-field');

  const baseline = form.querySelector('[data-hawkins-baseline-card]');
  if (baseline) baseline.classList.add('mx3-baseline-context');

  const modality = form.querySelector('[data-treatment-modality-picker]');
  if (modality && !form.querySelector('[data-mx3-composition-marker]')) {
    const marker = sectionMarker('1', 'Composição', 'Radiestesia é a base; outras terapias são opcionais.');
    marker.dataset.mx3CompositionMarker = 'true';
    modality.before(marker);
  }

  const items = form.querySelector('[data-treatment-items]');
  if (items && !form.querySelector('[data-mx3-items-marker]')) {
    const marker = sectionMarker('2', 'Itens', 'Adicione somente o que precisa ser trabalhado agora.');
    marker.dataset.mx3ItemsMarker = 'true';
    const note = form.querySelector('.treatment-model-note');
    (note || items).before(marker);
  }
  form.querySelector('.treatment-model-note')?.classList.add('mx3-compact-helper');
  form.querySelectorAll('[data-treatment-item]').forEach((item) => item.classList.add('mx3-treatment-item'));
  form.querySelectorAll('[data-treatment-command]').forEach((item) => item.classList.add('mx3-treatment-command'));
  form.querySelectorAll('[data-treatment-graph]').forEach((item) => item.classList.add('mx3-treatment-graph'));

  const submit = form.querySelector('button[type="submit"]');
  if (submit) {
    submit.textContent = 'Iniciar tratamento';
    submit.classList.add('mx3-sticky-cta', 'mx3-start-treatment');
  }
  if (submit && !form.querySelector('[data-mx3-save-planned]')) {
    const planned = document.createElement('button');
    planned.type = 'button';
    planned.className = 'btn secondary wide mx3-save-planned';
    planned.dataset.mx3SavePlanned = 'true';
    planned.textContent = 'Salvar como planejado';
    submit.before(planned);
  }
}

function readGraph(row) {
  return {
    graphName: row.querySelector('[name="graphName"]')?.value || '',
    durationValue: row.querySelector('[name="graphDurationValue"]')?.value || '',
    durationUnit: row.querySelector('[name="graphDurationUnit"]')?.value || 'DAY'
  };
}
function readCommand(node) {
  return {
    text: node.querySelector('[name="commandText"]')?.value || '',
    graphApplications: [...node.querySelectorAll('[data-treatment-graph]')].map(readGraph)
  };
}
function readTreatmentItem(node) {
  return {
    itemLabel: node.querySelector('[name="itemLabel"]')?.value || '',
    commands: [...node.querySelectorAll(':scope > [data-treatment-commands] > [data-treatment-command]')].map(readCommand)
  };
}
function preservePlannedContext(treatmentId, form, objective) {
  const findingIds = String(form.dataset.findings || '').split(',').filter(Boolean);
  const modalities = [...form.querySelectorAll('input[name="treatmentModality"]:checked')].map((input) => ({
    id:String(input.value), label:String(input.dataset.modalityLabel || input.value)
  }));
  store.setState((state) => {
    const draft = structuredClone(state);
    const target = draft.treatments.find((item) => item.id === treatmentId);
    if (!target) return draft;
    target.findingIds = [...new Set([...(target.findingIds || []), ...findingIds])];
    if (objective) target.objective = objective;
    target.modalities = ['RADIESTHESIA', ...modalities.map((item) => item.id)];
    target.modalitySnapshots = [{ id:'RADIESTHESIA', label:'Radiestesia' }, ...modalities];
    const theme = String(form.dataset.treatmentTheme || '').trim();
    const source = String(form.dataset.treatmentThemeSource || '').trim();
    const suggestion = String(form.dataset.treatmentThemeSuggestion || '').trim();
    if (theme || source || suggestion) {
      target.treatmentTheme = theme || null;
      target.treatmentThemeSource = source || null;
      target.treatmentThemeSuggestionId = suggestion || null;
    }
    target.updatedAt = store.nowIso();
    return draft;
  });
}
function saveComposerAsPlanned(form) {
  const state = store.getState();
  const session = getOpenSession(state);
  if (!session?.currentAssistedEntityId) throw new Error('Selecione um Assistido antes de planejar o tratamento.');
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const objective = String(data.get('therapeuticObjective') || '').trim();
  const items = [...form.querySelectorAll('[data-treatment-items] > [data-treatment-item]')].map(readTreatmentItem);
  if (!items.length || items.some((item) => !item.itemLabel.trim())) throw new Error('Adicione pelo menos um item com nome antes de salvar o planejamento.');
  for (const item of items) {
    if (!item.commands.length || item.commands.some((command) => !command.text.trim())) throw new Error('Cada item precisa de ao menos um comando antes de salvar o planejamento.');
    if (item.commands.some((command) => !command.graphApplications.length || command.graphApplications.some((graph) => !graph.graphName.trim()))) {
      throw new Error('Cada comando precisa de ao menos um gráfico antes de salvar o planejamento.');
    }
  }
  const planned = createPlannedTreatment(store, {
    assistedEntityId: session.currentAssistedEntityId,
    title,
    notes: objective || null,
    components: items.map((item) => ({
      name:item.itemLabel,
      instructions:item.commands.map((command) => command.text).filter(Boolean).join('\n'),
      durationValue:null,
      durationUnit:null
    }))
  });
  const components = store.getState().treatmentComponents.filter((item) => item.treatmentId === planned.id);
  components.forEach((component, index) => {
    if (items[index]) enrichComponentWithTreatmentItem(store, component.id, items[index]);
  });
  preservePlannedContext(planned.id, form, objective);
  form.closest('.modal-backdrop')?.remove();
  document.body.classList.remove('fluxa-mobile-sheet-open');
}

function hardenTreatmentActions() {
  for (const card of document.querySelectorAll('.treatment-card[data-treatment-id]')) {
    const row = card.querySelector('.button-row');
    if (!row) continue;
    row.classList.add('mx3-treatment-actions');
    const finalAction = row.querySelector('[data-final-cycle],[data-backlog-final-assessment]');
    const review = row.querySelector('[data-review-treatment]');
    const components = row.querySelector('[data-backlog-manage-components]');
    const history = row.querySelector('[data-treatment-history]');
    const more = row.querySelector('[data-oc-more-actions]');

    if (finalAction) finalAction.classList.add('mx3-action-primary');
    if (review) {
      review.classList.add('mx3-action-primary');
      review.textContent = 'Revisar';
    }
    if (components) {
      components.classList.add('mx3-action-secondary');
      components.textContent = 'Ver componentes';
    }
    if (history) history.classList.add('mx3-action-tertiary');
    if (more) {
      more.classList.add('mx3-action-overflow');
      const summary = more.querySelector('summary');
      if (summary) {
        summary.textContent = '•••';
        summary.setAttribute('aria-label', 'Mais opções');
        summary.title = 'Mais opções';
      }
    }
    [finalAction, review, components, history, more].filter(Boolean).forEach((node) => row.appendChild(node));
  }
}

function treatmentIdForEvent(state, event) {
  if (event.metadata?.treatmentId) return event.metadata.treatmentId;
  if (event.entityType === 'Treatment') return event.entityId;
  if (event.entityType === 'TreatmentComponent') return componentById(state, event.entityId)?.treatmentId || null;
  if (event.entityType === 'Assessment') return (state.assessments || []).find((item) => item.id === event.entityId)?.treatmentId || null;
  return null;
}
function investigationIdForEvent(state, event) {
  if (event.entityType === 'Investigation') return event.entityId;
  if (event.eventType === 'FINDING_IDENTIFIED') return (state.findings || []).find((item) => item.id === event.entityId)?.investigationId || null;
  return event.metadata?.investigationId || null;
}
function auditDetail(event, state) {
  const treatmentId = treatmentIdForEvent(state, event);
  const treatment = treatmentId ? treatmentById(state, treatmentId) : null;
  const component = componentById(state, event.entityId);
  return event.metadata?.title || event.metadata?.protocolName || event.metadata?.componentName || event.metadata?.name || event.metadata?.body || component?.name || treatment?.title || assistedName(state, event.assistedEntityId);
}
function timelineGroups(state, sessionId) {
  const events = (state.events || []).filter((event) => event.sessionId === sessionId).sort((a, b) => safeTime(b.occurredAt) - safeTime(a.occurredAt));
  const buckets = new Map();
  for (const event of events) {
    const treatmentId = treatmentIdForEvent(state, event);
    const investigationId = investigationIdForEvent(state, event);
    let key;
    if (treatmentId) key = `treatment:${treatmentId}`;
    else if (investigationId) key = `investigation:${investigationId}`;
    else if (event.eventType === 'SESSION_ASSISTED_SELECTED') key = `assisted:${event.assistedEntityId || event.id}`;
    else if (['SESSION_STARTED','PREPARATION_STARTED','PREPARATION_COMPLETED'].includes(event.eventType)) key = 'session:start';
    else key = `event:${event.id}`;
    const list = buckets.get(key) || [];
    list.push(event);
    buckets.set(key, list);
  }
  return [...buckets.entries()].map(([key, bucket]) => ({ key, events:bucket.sort((a,b)=>safeTime(b.occurredAt)-safeTime(a.occurredAt)) }))
    .sort((a,b)=>safeTime(b.events[0]?.occurredAt)-safeTime(a.events[0]?.occurredAt));
}
function groupSummary(state, group) {
  const events = group.events;
  const first = events[0];
  const treatmentId = treatmentIdForEvent(state, first);
  if (treatmentId) {
    const treatment = treatmentById(state, treatmentId);
    const components = (state.treatmentComponents || []).filter((item) => item.treatmentId === treatmentId);
    const completed = components.filter((item) => ['COMPLETED','STOPPED','REPLACED'].includes(item.status)).length;
    const eventTypes = new Set(events.map((event) => event.eventType));
    if (eventTypes.has('TREATMENT_COMPLETED')) return { icon:'✓', title:`Tratamento ${treatment?.title || ''} concluído`.trim(), detail:`${completed} ${completed === 1 ? 'componente finalizado' : 'componentes finalizados'}` };
    if (eventTypes.has('TREATMENT_REVIEWED')) return { icon:'↻', title:`Tratamento ${treatment?.title || ''} revisado`.trim(), detail:`${completed} de ${components.length} componentes resolvidos` };
    if (eventTypes.has('TREATMENT_STARTED')) return { icon:'◉', title:`Tratamento ${treatment?.title || ''} iniciado`.trim(), detail:`${components.length} ${components.length === 1 ? 'componente' : 'componentes'}` };
    if (eventTypes.has('TREATMENT_INTERRUPTED')) return { icon:'—', title:`Tratamento ${treatment?.title || ''} interrompido`.trim(), detail:'Histórico preservado' };
    return { icon:'•', title:treatment?.title || 'Tratamento', detail:'Atividade do tratamento' };
  }
  const investigationId = investigationIdForEvent(state, first);
  if (investigationId) {
    const investigation = (state.investigations || []).find((item) => item.id === investigationId);
    const name = investigation?.protocolSnapshot?.name || investigation?.protocolName || 'Investigação';
    const findingCount = (state.findings || []).filter((item) => item.investigationId === investigationId).length;
    const completed = events.some((event) => event.eventType === 'INVESTIGATION_COMPLETED');
    return { icon:completed ? '◆' : '◌', title:`${name} ${completed ? 'concluída' : 'em andamento'}`, detail:findingCount ? `${findingCount} ${findingCount === 1 ? 'achado registrado' : 'achados registrados'}` : 'Sem achados confirmados' };
  }
  if (group.key === 'session:start') {
    const prepared = events.some((event) => event.eventType === 'PREPARATION_COMPLETED');
    return { icon:'●', title:'Sessão iniciada', detail:prepared ? 'Preparação concluída' : 'Preparação em andamento' };
  }
  if (first.eventType === 'SESSION_ASSISTED_SELECTED') return { icon:'●', title:'Assistido selecionado', detail:assistedName(state, first.assistedEntityId) };
  if (first.eventType === 'NOTE_CREATED') return { icon:'✎', title:'Anotação', detail:first.metadata?.body || 'Registro da sessão' };
  if (first.eventType === 'REIKI_COMPLETED') return { icon:'✓', title:'Reiki concluído', detail:assistedName(state, first.assistedEntityId) };
  return { icon:'•', title:EVENT_LABELS[first.eventType] || 'Atividade registrada', detail:auditDetail(first, state) };
}
function groupAuditHtml(group, state) {
  if (group.events.length <= 1) return '';
  return `<details class="mx3-related-activity"><summary>+ ${group.events.length - 1} ${group.events.length === 2 ? 'atividade relacionada' : 'atividades relacionadas'}</summary><div>${group.events.slice(1).map((event) => `<p><span>${esc(formatTime(event.occurredAt))}</span><strong>${esc(EVENT_LABELS[event.eventType] || 'Atividade registrada')}</strong><small>${esc(auditDetail(event, state))}</small></p>`).join('')}</div></details>`;
}
function summarizeTimeline() {
  const state = store.getState();
  const session = getOpenSession(state);
  const main = document.querySelector('main');
  if (!session || !main || main.querySelector(':scope > .eyebrow')?.textContent?.trim() !== 'Sessão em andamento') return;
  const section = [...main.querySelectorAll('.section')].find((node) => node.querySelector('h2')?.textContent?.trim() === 'Timeline da sessão');
  const original = section?.querySelector('.timeline:not(.mx3-summary-timeline)');
  if (!section || !original) return;
  let summary = section.querySelector('.mx3-summary-timeline');
  const groups = timelineGroups(state, session.id);
  const signature = groups.map((group) => `${group.key}:${group.events.length}:${group.events[0]?.occurredAt}`).join('|');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'timeline mx3-summary-timeline';
    original.before(summary);
  }
  if (summary.dataset.signature !== signature) {
    summary.dataset.signature = signature;
    summary.innerHTML = groups.length ? groups.map((group) => {
      const info = groupSummary(state, group);
      return `<article class="mx3-timeline-row"><time>${esc(formatTime(group.events[0]?.occurredAt))}</time><span class="mx3-timeline-icon" aria-hidden="true">${esc(info.icon)}</span><div><strong>${esc(info.title)}</strong><span>${esc(info.detail)}</span>${groupAuditHtml(group, state)}</div></article>`;
    }).join('') : '<div class="empty">Nenhuma atividade registrada ainda.</div>';
  }
  if (!summary.dataset.mx3Initialized) {
    summary.hidden = original.hidden;
    summary.dataset.mx3Initialized = 'true';
  }
  original.hidden = true;
  original.classList.add('mx3-audit-timeline');
}

function sessionActivityCounts(state, session) {
  const sessionId = session.id;
  const assistedId = session.currentAssistedEntityId;
  const investigations = (state.investigations || []).filter((item) => item.originSessionId === sessionId || item.currentSessionId === sessionId || item.sessionId === sessionId).length;
  const treatmentIds = new Set((state.events || []).filter((event) => event.sessionId === sessionId && (event.entityType === 'Treatment' || event.metadata?.treatmentId)).map((event) => event.entityType === 'Treatment' ? event.entityId : event.metadata?.treatmentId));
  (state.treatments || []).filter((item) => item.originSessionId === sessionId).forEach((item) => treatmentIds.add(item.id));
  const notes = (state.events || []).filter((event) => event.sessionId === sessionId && event.eventType === 'NOTE_CREATED').length;
  const hawkins = [...(state.assessments || [])].filter((item) => item.sessionId === sessionId && item.assistedEntityId === assistedId && (item.kind === 'HAWKINS_FREQUENCY' || item.hertz != null)).sort((a,b)=>safeTime(b.occurredAt)-safeTime(a.occurredAt))[0];
  return { investigations, treatments:treatmentIds.size, notes, hawkins:hawkins?.hertz ?? hawkins?.frequency ?? null };
}
function hardenSessionHome() {
  const state = store.getState();
  const session = getOpenSession(state);
  const cockpit = document.querySelector('[data-home-cockpit]');
  if (!session || !cockpit) return;
  const counts = sessionActivityCounts(state, session);
  let summary = cockpit.querySelector('[data-mx3-session-summary]');
  if (!summary) {
    summary = document.createElement('section');
    summary.className = 'mx3-session-summary';
    summary.dataset.mx3SessionSummary = 'true';
    cockpit.querySelector('.home-primary-actions')?.before(summary);
  }
  const signature = JSON.stringify(counts);
  if (summary.dataset.signature !== signature) {
    summary.dataset.signature = signature;
    summary.innerHTML = `<p class="eyebrow">Sessão</p><div class="mx3-session-metrics"><span><strong>${counts.investigations}</strong> ${counts.investigations === 1 ? 'investigação' : 'investigações'}</span><span><strong>${counts.treatments}</strong> ${counts.treatments === 1 ? 'tratamento' : 'tratamentos'}</span><span><strong>${counts.notes}</strong> ${counts.notes === 1 ? 'anotação' : 'anotações'}</span><span><strong>${counts.hawkins != null ? esc(counts.hawkins) : '—'}</strong> Hawkins${counts.hawkins != null ? ' Hz' : ''}</span></div>`;
  }
  document.querySelector('[data-session-dashboard]')?.setAttribute('hidden', '');
}

function enhanceFinalAssessment() {
  const form = document.querySelector('#final-assessment-form,#final-cycle-form');
  if (!form) return;
  form.classList.add('mx3-final-assessment');
  form.closest('.sheet')?.classList.add('mx3-final-sheet');
  form.querySelector('[data-oc-final-baseline]')?.classList.add('mx3-final-block');
  form.querySelector('[data-oc-current-heading]')?.classList.add('mx3-final-block-heading');
  form.querySelector('[data-oc-decision-heading]')?.classList.add('mx3-final-block-heading');
  form.querySelector('button[type="submit"]')?.classList.add('mx3-sticky-cta');
}

function enhanceAll() {
  markSheets();
  compactTreatmentComposer();
  hardenTreatmentActions();
  hardenSessionHome();
  summarizeTimeline();
  enhanceFinalAssessment();
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhanceAll();
  });
}
new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
window.addEventListener('fluxa:state-changed', schedule);
store.subscribe(schedule);
queueMicrotask(schedule);

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-mx3-save-planned]');
  if (!button) return;
  event.preventDefault();
  try {
    saveComposerAsPlanned(button.closest('#treatment-form'));
  } catch (error) {
    alert(error.message);
  }
}, true);
