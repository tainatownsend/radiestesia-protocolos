import { mobileSheet } from '../components/mobile-sheet.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

function progress(prep) {
  return `
    <div class="v2-progress" aria-label="Etapa ${prep.step} de ${prep.total}">
      <div class="v2-progress__meta"><span>Etapa ${prep.step} de ${prep.total}</span><span>Preparação</span></div>
      <div class="v2-progress__bar"><span style="width:${(prep.step / Math.max(prep.total, 1)) * 100}%"></span></div>
    </div>
  `;
}

function breathingStep() {
  return `
    <section class="v2-section">
      <div>
        <p class="v2-eyebrow">Respiração e presença</p>
        <h3>Chegue antes de começar</h3>
        <p class="v2-copy">Faça uma breve pausa e confirme que você está presente e pronta para conduzir o atendimento.</p>
      </div>
      <div class="v2-inline-note">
        <strong>Sem formulário</strong>
        <p>Quando estiver pronta, conclua esta etapa e siga para a sua frequência.</p>
      </div>
    </section>
  `;
}

function frequencyStep(prep) {
  return `
    <section class="v2-section">
      <div>
        <p class="v2-eyebrow">Frequência do terapeuta</p>
        <h3>Como está sua frequência agora?</h3>
        <p class="v2-copy">A sessão terapêutica pode continuar a partir de 400 Hz. A explicação de bloqueio só aparece se o valor estiver abaixo do mínimo.</p>
      </div>
      <label class="v2-field">
        <span>Frequência vibracional</span>
        <div class="v2-unit-input">
          <input type="number" min="0.01" step="any" inputmode="decimal" value="${esc(prep.frequency)}" placeholder="Ex.: 540" data-v2-prep-frequency required>
          <strong>Hz</strong>
        </div>
      </label>
    </section>
  `;
}

function protectionStep(prep) {
  return `
    <section class="v2-section">
      <div>
        <p class="v2-eyebrow">Proteção</p>
        <h3>Qual proteção está ativa?</h3>
        <p class="v2-copy">Registre somente o que precisa ficar associado a esta sessão. A seleção direta do Acervo será conectada na próxima etapa da migração.</p>
      </div>
      <label class="v2-field">
        <span>Proteção / recurso utilizado</span>
        <input type="text" value="${esc(prep.protection)}" placeholder="Ex.: 4 Círculos" data-v2-prep-protection required>
      </label>
    </section>
  `;
}

function permissionStep(prep) {
  const frequencyState = prep.frequencyValid
    ? '<small class="v2-status-ok">✓ Adequada para continuar</small>'
    : '<small class="v2-status-warn">Nova medição necessária</small>';
  return `
    <section class="v2-section" aria-labelledby="v2-prep-summary">
      <div>
        <p class="v2-eyebrow">Permissão</p>
        <h3 id="v2-prep-summary">Confirme antes de atender</h3>
        <p class="v2-copy">Revise o essencial uma vez. Não repetimos a mesma informação em cards separados.</p>
      </div>
      <div class="v2-card">
        <div class="v2-summary-row">
          <div>
            <strong>Frequência do terapeuta</strong>
            <small>${esc(prep.frequency || '—')}${prep.frequency ? ' Hz' : ''}</small>
            ${frequencyState}
          </div>
        </div>
        <div class="v2-summary-row">
          <div><strong>Proteção</strong><small>${esc(prep.protection || 'Não registrada')}</small></div>
        </div>
      </div>
      <label class="v2-field">
        <span>Mantra / permissão <small>(opcional)</small></span>
        <textarea rows="3" placeholder="Registre somente se for útil para esta sessão" data-v2-prep-permission>${esc(prep.permission || '')}</textarea>
      </label>
    </section>
  `;
}

export function preparationFlow(model, ui = {}) {
  const prep = model.preparation || { step: 1, total: 4, stepKey: 'breathing' };
  const stepKey = prep.stepKey || (prep.step >= 4 ? 'permission' : 'breathing');
  const content = {
    breathing: breathingStep,
    frequency: () => frequencyStep(prep),
    protection: () => protectionStep(prep),
    permission: () => permissionStep(prep),
  }[stepKey] || breathingStep;
  const body = `<div class="v2-stack">${progress(prep)}${content()}</div>`;

  return mobileSheet({
    eyebrow: 'Preparação da sessão',
    title: 'Antes de começar',
    body,
    primaryLabel: stepKey === 'permission' ? 'Concluir preparação' : 'Concluir etapa',
    secondaryLabel: '',
    error: ui.error,
  });
}
