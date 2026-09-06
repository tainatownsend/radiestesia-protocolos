function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function norm(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function dateLabel(value = '') {
  if (!value) return '';
  const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`;
  try {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }).format(parsed);
  } catch {
    return String(value);
  }
}

function heading(title, copy) {
  return `
    <div class="v2-library-heading">
      <button class="v2-btn v2-btn--ghost v2-library-back" type="button" data-v2-library-back>← Acervo</button>
      <p class="v2-eyebrow">Acervo</p>
      <h1 class="v2-title">${esc(title)}</h1>
      <p class="v2-copy">${esc(copy)}</p>
    </div>
  `;
}

function search(placeholder) {
  return `
    <style>
      .v2-library-search-empty { display: none; }
      .v2-library-list:has([data-v2-library-search-text]):not(:has([data-v2-library-search-text]:not([hidden]))) .v2-library-search-empty { display: block; }
    </style>
    <label class="v2-field v2-library-search"><span class="sr-only">Buscar</span><input type="search" data-v2-library-search placeholder="${esc(placeholder)}" autocomplete="off"></label>
  `;
}

function filteredEmpty(hasItems) {
  return hasItems ? `
    <div class="v2-card v2-card--soft v2-library-search-empty" role="status" aria-live="polite">
      <strong>Nenhum resultado encontrado</strong>
      <p class="v2-copy">Revise os termos da busca.</p>
    </div>
  ` : '';
}

function home(model) {
  const counts = model.library?.counts || {};
  return `
    <div class="v2-stack">
      <section class="v2-section">
        <p class="v2-eyebrow">Acervo</p>
        <h1 class="v2-title">Seu material de trabalho, organizado.</h1>
        <p class="v2-copy">Assistidos, protocolos, gráficos, recursos e terapias ficam aqui. Configurações do app permanecem separadas.</p>
      </section>
      <section class="v2-library-grid" aria-label="Categorias do Acervo">
        <button class="v2-library-category" type="button" data-v2-library-section="assisteds"><span><strong>Assistidos</strong><small>Cadastros e continuidade longitudinal.</small></span><b>${counts.assisteds || 0}</b></button>
        <button class="v2-library-category" type="button" data-v2-library-section="protocols"><span><strong>Protocolos</strong><small>Métodos disponíveis para investigação.</small></span><b>${counts.protocols || 0}</b></button>
        <button class="v2-library-category" type="button" data-v2-library-section="resources"><span><strong>Gráficos & Recursos</strong><small>Biblioteca operacional do tratamento.</small></span><b>${counts.resources || 0}</b></button>
        <button class="v2-library-category" type="button" data-v2-library-section="therapies"><span><strong>Terapias</strong><small>Modalidades disponíveis na prática.</small></span><b>${counts.therapies || 0}</b></button>
      </section>
    </div>
  `;
}

function assisteds(model) {
  const items = model.library?.assisteds || [];
  return `
    <div class="v2-stack">
      ${heading('Assistidos', 'Consulte rapidamente quem já está cadastrado. O contexto do atendimento continua sendo definido dentro da sessão.')}
      ${search('Buscar assistido')}
      <button class="v2-btn v2-btn--primary" type="button" data-v2-library-new-assisted>Adicionar pessoa</button>
      <section class="v2-library-list" data-v2-library-list>
        ${items.length ? items.map((item) => `
          <article class="v2-library-row" data-v2-library-search-text="${esc(norm(`${item.name} ${item.typeLabel} ${item.details || ''}`))}">
            <span><strong>${esc(item.name)}</strong><small>${item.birthDate ? `Nascimento · ${esc(dateLabel(item.birthDate))}` : 'Sem data de nascimento registrada'}</small></span>
            <span class="v2-library-kind">${esc(item.typeLabel)}</span>
          </article>
        `).join('') : '<div class="v2-card v2-card--soft">Nenhum Assistido cadastrado.</div>'}
        ${filteredEmpty(items.length > 0)}
      </section>
    </div>
  `;
}

function protocols(model) {
  const items = model.library?.protocols || [];
  return `
    <div class="v2-stack">
      ${heading('Protocolos', 'Consulte os métodos disponíveis por nome, finalidade ou categoria.')}
      ${search('Buscar protocolo ou tema')}
      <section class="v2-library-list" data-v2-library-list>
        ${items.length ? items.map((item) => `
          <article class="v2-library-row" data-v2-library-search-text="${esc(norm(`${item.name} ${item.category} ${item.description} ${item.source}`))}">
            <span><strong>${esc(item.name)}</strong><small>${esc(item.category)}${item.description ? ` · ${esc(item.description)}` : ''}</small></span>
            <span class="v2-library-kind">${esc(item.source)}</span>
          </article>
        `).join('') : '<div class="v2-card v2-card--soft">Nenhum protocolo disponível.</div>'}
        ${filteredEmpty(items.length > 0)}
      </section>
    </div>
  `;
}

function resources(model) {
  const items = model.library?.resources || [];
  return `
    <div class="v2-stack">
      ${heading('Gráficos & Recursos', 'Uma lista densa e pesquisável para localizar recursos sem navegar por dezenas de cards.')}
      ${search('Buscar por nome, finalidade ou tag')}
      <section class="v2-library-list" data-v2-library-list>
        ${items.length ? items.map((item) => `
          <article class="v2-library-row" data-v2-library-search-text="${esc(norm(`${item.name} ${item.typeLabel} ${item.purpose} ${(item.tags || []).join(' ')}`))}">
            <span><strong>${esc(item.name)}</strong><small>${esc(item.purpose || ((item.tags || []).slice(0, 3).join(' · ')) || 'Recurso da biblioteca')}</small></span>
            <span class="v2-library-kind">${esc(item.typeLabel)}</span>
          </article>
        `).join('') : '<div class="v2-card v2-card--soft">Nenhum recurso cadastrado.</div>'}
        ${filteredEmpty(items.length > 0)}
      </section>
    </div>
  `;
}

function therapies(model) {
  const items = model.library?.therapies || [];
  return `
    <div class="v2-stack">
      ${heading('Terapias', 'Veja as modalidades disponíveis. Alterações pertencem às Configurações, não ao conteúdo do Acervo.')}
      <section class="v2-library-list">
        ${items.map((item) => `
          <article class="v2-library-row">
            <span><strong>${esc(item.label)}</strong><small>${item.base ? 'Base permanente do Fluxa' : 'Terapia complementar ativa'}</small></span>
            <span class="v2-library-kind">${item.base ? 'BASE' : 'ATIVA'}</span>
          </article>
        `).join('')}
      </section>
      <button class="v2-btn" type="button" data-v2-open-settings>Configurar terapias da prática</button>
    </div>
  `;
}

export function libraryPage(model, ui) {
  const section = ui.librarySection || 'home';
  if (section === 'assisteds') return assisteds(model);
  if (section === 'protocols') return protocols(model);
  if (section === 'resources') return resources(model);
  if (section === 'therapies') return therapies(model);
  return home(model);
}
