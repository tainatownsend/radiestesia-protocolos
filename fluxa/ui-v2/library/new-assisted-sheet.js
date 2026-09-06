import { mobileSheet } from '../components/mobile-sheet.js';

export function newAssistedSheet(model, ui) {
  const body = `
    <form class="v2-library-person-form" data-v2-library-person-form>
      <p class="v2-copy">Cadastre a pessoa no Acervo sem alterar o Assistido atual da sessão.</p>
      <label class="v2-field">
        <span>Nome completo</span>
        <input type="text" autocomplete="name" data-v2-library-person-name placeholder="Nome da pessoa">
      </label>
      <label class="v2-field">
        <span>Data de nascimento</span>
        <input type="date" data-v2-library-person-birthdate>
      </label>
    </form>
  `;

  return mobileSheet({
    eyebrow: 'Acervo · Assistidos',
    title: 'Adicionar pessoa',
    body,
    error: ui.error,
    primaryLabel: 'Salvar pessoa',
    secondaryLabel: 'Cancelar',
  });
}
