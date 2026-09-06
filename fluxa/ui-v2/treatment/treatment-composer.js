import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function graphRow(graph, itemIndex, commandIndex, graphIndex) {
  return `
    <div class="v2-treatment-graph" data-v2-treatment-graph>
      <label class="v2-field v2-field--grow">
        <span>Gráfico ${graphIndex + 1}</span>
        <input data-v2-treatment-draft="graphName" data-item-index="${itemIndex}" data-command-index="${commandIndex}" data-graph-index="${graphIndex}" list="v2-treatment-graphs" value="${esc(graph.graphName || '')}" placeholder="Selecione ou digite o nome">
      </label>
      <label class="v2-field v2-field--duration">
        <span>Tempo <small>(opcional)</small></span>
        <input data-v2-treatment-draft="durationValue" data-item-index="${itemIndex}" data-command-index="${commandIndex}" data-graph-index="${graphIndex}" type="number" min="1" inputmode="numeric" value="${esc(graph.durationValue || '')}" placeholder="—">
      </label>
      <label class="v2-field v2-field--unit">
        <span>Unidade</span>
        <select data-v2-treatment-draft="durationUnit" data-item-index="${itemIndex}" data-command-index="${commandIndex}" data-graph-index="${graphIndex}">
          ${[['MINUTE','min'],['HOUR','hora(s)'],['DAY','dia(s)'],['WEEK','semana(s)'],['MONTH','mês(es)']].map(([value,label]) => `<option value="${value}" ${graph.durationUnit === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      ${graphIndex ? `<button class="v2-mini-action" type="button" data-v2-remove-graph data-item-index="${itemIndex}" data-command-index="${commandIndex}" data-graph-index="${graphIndex}" aria-label="Remover gráfico ${graphIndex + 1}">×</button>` : ''}
    </div>
  `;
}

function commandBlock(command, itemIndex, commandIndex) {
  return `
    <div class="v2-treatment-command">
      <div class="v2-treatment-subhead">
        <div><span class="v2-step-label">Comando ${commandIndex + 1}</span><strong>O que será feito</strong></div>
        ${commandIndex ? `<button class="v2-link-action" type="button" data-v2-remove-command data-item-index="${itemIndex}" data-command-index="${commandIndex}">Remover</button>` : ''}
      </div>
      <label class="v2-field">
        <span>Comando / orientação</span>
        <textarea data-v2-treatment-draft="commandText" data-item-index="${itemIndex}" data-command-index="${commandIndex}" rows="2" placeholder="Ex.: neutralizar, harmonizar, fortalecer…">${esc(command.text || '')}</textarea>
      </label>
      <div class="v2-treatment-graphs">
        ${(command.graphApplications || []).map((graph, graphIndex) => graphRow(graph, itemIndex, commandIndex, graphIndex)).join('')}
      </div>
      <button class="v2-btn v2-btn--quiet" type="button" data-v2-add-graph data-item-index="${itemIndex}" data-command-index="${commandIndex}">+ Gráfico</button>
    </div>
  `;
}

function itemBlock(item, itemIndex) {
  const commandCount = item.commands?.length || 0;
  const graphCount = (item.commands || []).reduce((sum, command) => sum + (command.graphApplications?.length || 0), 0);
  return `
    <details class="v2-treatment-item" open>
      <summary>
        <span><strong>${esc(item.itemLabel || `Item ${itemIndex + 1}`)}</strong><small>${commandCount} comando${commandCount === 1 ? '' : 's'} · ${graphCount} gráfico${graphCount === 1 ? '' : 's'}</small></span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div class="v2-treatment-item__body">
        <div class="v2-treatment-subhead">
          <span class="v2-step-label">Item ${itemIndex + 1}</span>
          ${itemIndex ? `<button class="v2-link-action" type="button" data-v2-remove-item data-item-index="${itemIndex}">Remover item</button>` : ''}
        </div>
        <label class="v2-field">
          <span>Item a tratar</span>
          <input data-v2-treatment-draft="itemLabel" data-item-index="${itemIndex}" value="${esc(item.itemLabel || '')}" placeholder="Ex.: crença de escassez">
        </label>
        ${(item.commands || []).map((command, commandIndex) => commandBlock(command, itemIndex, commandIndex)).join('')}
        <button class="v2-btn v2-btn--quiet" type="button" data-v2-add-command data-item-index="${itemIndex}">+ Comando</button>
      </div>
    </details>
  `;
}

export function treatmentComposer(model, ui) {
  const draft = ui.treatmentDraft;
  const selectedModalities = new Set(draft.modalities || []);
  const optionalModalities = (model.modalityOptions || []).filter((item) => !item.base);
  const graphOptions = (model.graphOptions || []).map((name) => `<option value="${esc(name)}"></option>`).join('');
  const linkedFindings = (model.treatmentFindings || []).filter((finding) => (draft.findingIds || []).includes(finding.id));

  const body = `
    <form class="v2-treatment-composer" data-v2-treatment-form>
      <section class="v2-composer-section">
        <div class="v2-section-number">1</div>
        <div class="v2-composer-section__content">
          <p class="v2-eyebrow">Contexto</p>
          <label class="v2-field">
            <span>Nome do tratamento</span>
            <input data-v2-treatment-draft="title" value="${esc(draft.title || '')}" placeholder="Ex.: Equilíbrio emocional">
          </label>
          <label class="v2-field">
            <span>Objetivo <small>(opcional)</small></span>
            <textarea data-v2-treatment-draft="objective" rows="2" placeholder="O que este tratamento busca apoiar?">${esc(draft.objective || '')}</textarea>
          </label>
          ${linkedFindings.length ? `<div class="v2-context-note"><strong>Achados vinculados</strong>${linkedFindings.map((finding) => `<span>${esc(finding.title)}</span>`).join('')}</div>` : ''}
        </div>
      </section>

      <section class="v2-composer-section">
        <div class="v2-section-number">2</div>
        <div class="v2-composer-section__content">
          <p class="v2-eyebrow">Composição</p>
          <div class="v2-modality-base"><strong>Radiestesia</strong><span>Base do tratamento · sempre incluída</span></div>
          ${optionalModalities.length ? `<fieldset class="v2-check-group"><legend>Terapias complementares</legend>${optionalModalities.map((item) => `
            <label class="v2-check-row">
              <input type="checkbox" data-v2-treatment-modality value="${esc(item.id)}" data-label="${esc(item.label)}" ${selectedModalities.has(item.id) ? 'checked' : ''}>
              <span><strong>${esc(item.label)}</strong><small>Incluir na composição</small></span>
            </label>
          `).join('')}</fieldset>` : '<p class="v2-helper">Nenhuma terapia complementar está ativa nas preferências.</p>'}
        </div>
      </section>

      <section class="v2-composer-section">
        <div class="v2-section-number">3</div>
        <div class="v2-composer-section__content">
          <div class="v2-treatment-subhead"><div><p class="v2-eyebrow">Itens</p><strong>O que será tratado</strong></div></div>
          <p class="v2-helper">Cada item tem um ou mais comandos; cada comando usa pelo menos um gráfico.</p>
          <datalist id="v2-treatment-graphs">${graphOptions}</datalist>
          <div class="v2-treatment-items">${(draft.items || []).map(itemBlock).join('')}</div>
          <button class="v2-btn v2-btn--quiet" type="button" data-v2-add-item>+ Adicionar item</button>
        </div>
      </section>

      <section class="v2-composer-review">
        <div class="v2-section-number">4</div>
        <div><p class="v2-eyebrow">Revisão</p><strong>${draft.items?.length || 0} item${draft.items?.length === 1 ? '' : 's'} · ${selectedModalities.size + 1} modalidade${selectedModalities.size ? 's' : ''}</strong><p class="v2-helper">Planejado guarda a composição sem iniciar os prazos. Iniciar ancora os prazos no momento real de início.</p></div>
      </section>
    </form>
  `;

  return mobileSheet({
    eyebrow: model.assistedName || 'Tratamento',
    title: 'Novo tratamento',
    body,
    error: ui.error,
    footerHtml: `
      <button class="v2-btn v2-btn--ghost" type="button" data-v2-treatment-submit="planned">Salvar como planejado</button>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-treatment-submit="start">Iniciar tratamento</button>
    `,
  });
}
