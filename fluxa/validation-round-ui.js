import { createStore } from './store.js';

const store = createStore();
let enhancing = false;

function esc(value='') {
  return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function modalities() {
  const raw = store.getState()?.settings?.therapeuticModalities || {};
  return new Set(Array.isArray(raw.enabled) ? raw.enabled : []);
}
function fmtDuration(graph) {
  if (!graph || graph.noDuration || !graph.durationValue) return 'Sem prazo definido';
  const labels = { MINUTE:'min', HOUR:'h', DAY:'dia(s)', WEEK:'semana(s)', MONTH:'mês(es)' };
  return `${graph.durationValue} ${labels[graph.durationUnit] || graph.durationUnit || ''}`.trim();
}
function graphApplications(component) {
  if (component?.semanticsVersion === 2 && Array.isArray(component.commands)) {
    return component.commands.flatMap((command) => (command.graphApplications || []).map((graph) => ({ ...graph, commandText:command.text })));
  }
  return [{
    id:`legacy_graph_${component?.id || 'item'}`,
    graphName:component?.toolSnapshot?.name || component?.name || 'Gráfico',
    durationValue:component?.durationValue ?? null,
    durationUnit:component?.durationUnit || 'DAY',
    noDuration:!component?.expectedEndAt,
    expectedEndAt:component?.expectedEndAt || null,
    startedAt:component?.startedAt || null,
    status:component?.status || 'IN_PROGRESS',
    commandText:component?.instructions || ''
  }];
}
function dedupeAssistedChoice() {
  const main = document.querySelector('#app > main:not([data-workspace-view])');
  if (!main) return;
  const buttons = [...main.querySelectorAll('[data-action="choose-assisted"]')].filter((button) => !button.closest('[hidden]'));
  if (buttons.length <= 1) return;
  const preferred = buttons.find((button) => button.closest('[data-fast-session-context]')) || buttons[0];
  buttons.forEach((button) => {
    if (button === preferred) return;
    const section = button.closest('section');
    if (section) section.hidden = true;
    else button.hidden = true;
  });
}
function ensureSettingsDataActions() {
  const sheet = document.querySelector('#workspace-settings-overlay .workspace-settings-sheet');
  if (!sheet || sheet.querySelector('[data-workspace-data-actions]')) return;
  const groups = [...sheet.querySelectorAll('.workspace-settings-group')];
  const group = groups.find((node) => /Dados e privacidade/i.test(node.textContent || ''));
  if (!group) return;
  const actions = document.createElement('div');
  actions.className = 'workspace-data-actions';
  actions.dataset.workspaceDataActions = 'true';
  actions.innerHTML = `<button type="button" class="btn secondary" data-trigger-backup-export>Exportar cópia local</button><button type="button" class="btn secondary" data-storage-import>Importar cópia local</button>`;
  group.appendChild(actions);
}
function hideDisabledReikiCloseMetric() {
  if (modalities().has('REIKI')) return;
  const sheets = [...document.querySelectorAll('.sheet')].filter((sheet) => /revis|encerr/i.test(sheet.textContent || ''));
  sheets.forEach((sheet) => {
    [...sheet.querySelectorAll('span,p,small,div')].filter((node) => node.children.length === 0 && node.textContent?.trim() === 'Reiki').forEach((label) => {
      const metric = label.closest('.session-close-item,.session-review-stat,.summary-stat,.metric') || label.parentElement;
      if (metric) metric.hidden = true;
    });
  });
}
function componentStatusLabel(value) {
  return ({ PLANNED:'Planejado', IN_PROGRESS:'Em andamento', COMPLETED:'Concluído', INTERRUPTED:'Interrompido', STOPPED:'Encerrado', REPLACED:'Substituído' })[value] || 'Registrado';
}
function graphStatusLabel(value) {
  return ({ STOPPED:'Encerrado', COMPLETED:'Concluído', REPLACED:'Substituído' })[value] || 'Em andamento';
}
function componentDialog(treatmentId) {
  const state = store.getState();
  const treatment = state.treatments.find((item) => item.id === treatmentId);
  if (!treatment) return;
  const components = state.treatmentComponents.filter((item) => item.treatmentId === treatmentId);
  let wrap = document.querySelector('#backlog-overlay');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'backlog-overlay';
    wrap.className = 'modal-backdrop';
    document.body.appendChild(wrap);
  }
  wrap.innerHTML = `<section class="sheet detail-sheet treatment-component-detail"><div class="sheet-head"><div><p class="eyebrow">Componentes do tratamento</p><h2>${esc(treatment.title || '')}</h2></div><button class="close-btn" type="button" data-backlog-close>×</button></div><p class="muted">Revise cada item e cada gráfico separadamente. Parar um gráfico preserva os demais componentes e todo o histórico do tratamento.</p><div class="stack">${components.map((component) => {
    const graphs = graphApplications(component);
    return `<article class="card treatment-component-card"><div class="section-head"><div><strong>${esc(component.itemLabel || component.name || 'Componente')}</strong><p class="muted">${esc(componentStatusLabel(component.status))}</p></div></div>${graphs.map((graph) => `<div class="treatment-component-graph"><div><strong>${esc(graph.graphName || 'Gráfico')}</strong>${graph.commandText ? `<p class="muted">${esc(graph.commandText)}</p>` : ''}<small>${esc(fmtDuration(graph))} · ${esc(graphStatusLabel(graph.status))}</small></div>${component.semanticsVersion === 2 && component.status === 'IN_PROGRESS' && !['STOPPED','COMPLETED','REPLACED'].includes(graph.status) ? `<button class="btn danger small" type="button" data-stop-treatment-graph="${esc(graph.id)}" data-component="${esc(component.id)}">Parar gráfico</button>` : ''}</div>`).join('')}${['IN_PROGRESS','INTERRUPTED'].includes(component.status) ? `<div class="button-row"><button class="btn secondary small" data-backlog-replace-component="${esc(component.id)}">Substituir item</button><button class="btn danger small" data-backlog-stop-component="${esc(component.id)}">Parar item inteiro</button></div>` : ''}</article>`;
  }).join('') || '<div class="empty">Nenhum componente.</div>'}</div>${treatment.status === 'IN_PROGRESS' ? `<section class="section"><button class="btn primary wide" data-backlog-add-component="${esc(treatmentId)}">Adicionar componente</button></section>` : ''}</section>`;
}
function stopGraph(componentId, graphId) {
  store.setState((state) => {
    const draft = structuredClone(state);
    const component = draft.treatmentComponents.find((item) => item.id === componentId);
    if (!component?.commands) return draft;
    let found = null;
    component.commands.forEach((command) => {
      const graph = (command.graphApplications || []).find((item) => item.id === graphId);
      if (graph) found = graph;
    });
    if (!found || ['STOPPED','COMPLETED','REPLACED'].includes(found.status)) return draft;
    found.status = 'STOPPED';
    found.stoppedAt = store.nowIso();
    found.updatedAt = store.nowIso();
    const active = component.commands.flatMap((command) => command.graphApplications || []).filter((graph) => !['STOPPED','COMPLETED','REPLACED'].includes(graph.status));
    const ends = active.map((graph) => new Date(graph.expectedEndAt || '').getTime()).filter(Number.isFinite);
    component.expectedEndAt = ends.length ? new Date(Math.max(...ends)).toISOString() : null;
    if (!active.length) {
      component.status = 'STOPPED';
      component.stoppedAt = store.nowIso();
    }
    component.updatedAt = store.nowIso();
    return draft;
  });
}
function consolidateClosedSessionDocuments(sheet) {
  const state=store.getState();
  [...sheet.querySelectorAll('[data-session-report][data-assisted]')].forEach((full)=>{
    if(full.closest('[data-assisted-document-actions]'))return;
    const assistedId=full.dataset.assisted;
    const parent=full.parentElement;
    const share=parent?.querySelector(`[data-client-report][data-assisted="${CSS.escape(assistedId)}"]`);
    if(!parent||!share)return;
    const assisted=state.assistedEntities.find((item)=>item.id===assistedId);
    const details=document.createElement('details');details.className='assisted-document-actions';details.dataset.assistedDocumentActions=assistedId;
    const summary=document.createElement('summary');summary.innerHTML=`<span>${esc(assisted?.displayName||'Assistido')}</span><small>Relatório e resumo para compartilhar</small>`;
    const actions=document.createElement('div');actions.className='assisted-document-buttons';
    full.textContent='Relatório completo';share.textContent='Resumo para WhatsApp ou email';
    parent.insertBefore(details,full);details.append(summary,actions);actions.append(full,share);
  });
}
function enhanceClosedSessionScreen() {
  const sheet = [...document.querySelectorAll('.sheet')].find((node) => /Sessão encerrada|Encerramento registrado com segurança/i.test(node.textContent || ''));
  if (!sheet) return;
  consolidateClosedSessionDocuments(sheet);
  if (sheet.dataset.validationRoundSimplified) return;
  sheet.dataset.validationRoundSimplified = 'true';
  const shareButtons = [...sheet.querySelectorAll('button')].filter((button) => /Resumo para compartilhar/i.test(button.textContent || ''));
  shareButtons.forEach((button) => { button.textContent = 'Resumo para WhatsApp ou email'; });
  const reportButtons = [...sheet.querySelectorAll('button')].filter((button) => /Relatório\s*·/i.test(button.textContent || ''));
  reportButtons.forEach((button) => { button.textContent = 'Relatório completo'; });
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    dedupeAssistedChoice();
    ensureSettingsDataActions();
    hideDisabledReikiCloseMetric();
    enhanceClosedSessionScreen();
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
store.subscribe(() => queueMicrotask(enhance));

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.backlogManageComponents) {
    queueMicrotask(() => componentDialog(button.dataset.backlogManageComponents));
    return;
  }
  if (button.dataset.stopTreatmentGraph) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm('Parar somente este gráfico e manter os demais componentes do tratamento em andamento?')) return;
    const component = store.getState().treatmentComponents.find((item) => item.id === button.dataset.component);
    const treatmentId = component?.treatmentId;
    stopGraph(button.dataset.component, button.dataset.stopTreatmentGraph);
    if (treatmentId) componentDialog(treatmentId);
  }
}, true);
