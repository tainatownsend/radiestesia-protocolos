import { mobileSheet } from '../components/mobile-sheet.js';

const ASSISTED_TYPE_LABELS = Object.freeze({
  PERSON: 'Pessoa',
  PET: 'PET',
  ENVIRONMENT: 'Ambiente',
  GROUP: 'Grupo',
  SITUATION: 'Situação / Processo',
  OTHER: 'Outro',
});

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function searchKey(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function assistedSearchText(name = '') {
  const original = String(name).toLocaleLowerCase('pt-BR').trim();
  const normalized = searchKey(name);
  return original === normalized ? original : `${original}|${normalized}`;
}

export function assistedPicker(model, ui = {}) {
  if (ui.assistedCreate) {
    const body = `
      <div class="v2-stack">
        <div class="v2-progress" aria-label="Novo Assistido">
          <div class="v2-progress__meta"><span>Novo Assistido</span><span>Pessoa</span></div>
          <div class="v2-progress__bar"><span style="width:100%"></span></div>
        </div>
        <section class="v2-section">
          <div>
            <p class="v2-eyebrow">Contexto do atendimento</p>
            <h3>Quem será atendido?</h3>
            <p class="v2-copy">Cadastre somente o necessário para continuar. Outros detalhes podem ser completados depois no Acervo.</p>
          </div>
          <label class="v2-field">
            <span>Nome completo</span>
            <input type="text" name="assistedName" autocomplete="name" required data-v2-assisted-name>
          </label>
          <label class="v2-field">
            <span>Data de nascimento</span>
            <input type="date" name="birthDate" required data-v2-assisted-birthdate>
          </label>
        </section>
      </div>
    `;
    return mobileSheet({
      eyebrow: 'Assistido',
      title: 'Adicionar pessoa',
      body,
      primaryLabel: 'Adicionar e selecionar',
      secondaryLabel: 'Voltar',
      error: ui.error,
    });
  }

  const options = (model.assistedOptions || []).map((item) => `
    <button class="v2-select-row" type="button" data-v2-select-assisted="${esc(item.id)}" data-v2-assisted-search="${esc(assistedSearchText(item.name))}">
      <span>
        <strong>${esc(item.name)}</strong>
        <small>${esc(ASSISTED_TYPE_LABELS[item.type] || 'Assistido')}</small>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  `).join('');

  const body = `
    <div class="v2-stack">
      <section class="v2-section">
        <div>
          <p class="v2-eyebrow">Contexto da sessão</p>
          <h3>Selecione o Assistido</h3>
          <p class="v2-copy">O nome ficará visível durante todo o trabalho para reduzir risco de registrar uma ação no contexto errado.</p>
        </div>
        <label class="v2-field">
          <span class="v2-visually-hidden">Buscar Assistido</span>
          <input type="search" placeholder="Buscar por nome" autocomplete="off" data-v2-assisted-search-input>
        </label>
        <div class="v2-select-list" data-v2-assisted-list>
          ${options || '<div class="v2-empty"><strong>Nenhum Assistido cadastrado</strong><p>Adicione uma pessoa para continuar a sessão.</p></div>'}
        </div>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Sessão em andamento',
    title: 'Quem você vai atender?',
    body,
    primaryLabel: 'Adicionar novo Assistido',
    secondaryLabel: '',
    error: ui.error,
  });
}
