import { mobileSheet } from '../components/mobile-sheet.js';
import { formatElapsed } from './reiki-ticker.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

export function reikiWorkspace(model, ui) {
  const reiki = model.reiki;
  if (!model.reikiEnabled && !reiki) {
    return mobileSheet({
      eyebrow: model.assistedName || 'Reiki',
      title: 'Reiki não está ativo',
      body: '<div class="v2-card v2-card--soft"><strong>Ative Reiki nas terapias da prática</strong><p class="v2-copy">Depois disso, a aplicação aparece aqui como uma ação de primeira classe da sessão.</p></div>',
      error: ui.error,
      footerHtml: '<span aria-hidden="true"></span><button class="v2-btn v2-btn--primary" type="button" data-v2-close-sheet>Fechar</button>',
    });
  }

  if (reiki) {
    const isCurrentContext = reiki.belongsToCurrentSession && reiki.belongsToCurrentAssisted;
    const outsideSession = !reiki.sessionId;
    const staleSessionContext = Boolean(reiki.sessionId && !reiki.belongsToCurrentSession);
    const canControl = outsideSession || isCurrentContext;
    const contextMessage = isCurrentContext
      ? '<p class="v2-helper">Esta aplicação está vinculada à sessão e ao Assistido atuais.</p>'
      : (outsideSession
        ? '<p class="v2-helper">Esta aplicação foi iniciada fora de uma sessão. Você pode pausá-la, retomá-la ou concluí-la aqui.</p>'
        : (staleSessionContext
          ? '<div class="v2-inline-error" role="alert"><strong>Registro pendente de uma sessão anterior.</strong><p>Essa sessão não está mais aberta, então o Reiki não pode ser retomado ou concluído como atendimento normal. Encerre apenas este registro pendente para liberar uma nova aplicação; a sessão anterior não será reaberta nem alterada.</p></div>'
          : '<div class="v2-inline-error" role="alert">A aplicação ativa pertence a outro contexto. Volte ao Assistido correto antes de alterá-la.</div>'));
    const body = `
      <div class="v2-reiki-workspace">
        <section class="v2-reiki-timer" role="timer" aria-label="Tempo decorrido da aplicação de Reiki" data-v2-reiki-timer data-v2-reiki-running="${reiki.status === 'RUNNING'}" data-v2-reiki-elapsed-seconds="${Math.max(0, Number(reiki.elapsedSeconds) || 0)}">
          <span class="v2-status-pill" data-status="${esc(reiki.status)}">${reiki.status === 'PAUSED' ? 'Pausado' : 'Em andamento'}</span>
          <strong data-v2-reiki-elapsed>${esc(formatElapsed(reiki.elapsedSeconds))}</strong>
          <span>${esc(reiki.modeLabel)} · ${esc(reiki.assistedName)}</span>
        </section>
        ${contextMessage}
        <label class="v2-field"><span>${staleSessionContext ? 'Nota da recuperação' : 'Notas ao concluir'} <small>(opcional)</small></span><textarea rows="3" data-v2-reiki-notes placeholder="${staleSessionContext ? 'Por que este registro ficou pendente?' : 'Observações da aplicação'}"></textarea></label>
      </div>
    `;
    return mobileSheet({
      eyebrow: `${reiki.assistedName} · Reiki`,
      title: staleSessionContext ? 'Registro de Reiki pendente' : (reiki.status === 'PAUSED' ? 'Aplicação pausada' : 'Aplicação em andamento'),
      body,
      error: ui.error,
      footerHtml: staleSessionContext
        ? '<span aria-hidden="true"></span><button class="v2-btn v2-btn--primary" type="button" data-v2-reiki-control="complete">Encerrar registro pendente</button>'
        : `
        <button class="v2-btn v2-btn--ghost" type="button" data-v2-reiki-control="${reiki.status === 'PAUSED' ? 'resume' : 'pause'}" ${canControl ? '' : 'disabled'}>${reiki.status === 'PAUSED' ? 'Retomar' : 'Pausar'}</button>
        <button class="v2-btn v2-btn--primary" type="button" data-v2-reiki-control="complete" ${canControl ? '' : 'disabled'}>Concluir Reiki</button>
      `,
    });
  }

  const body = `
    <form class="v2-reiki-start" data-v2-reiki-start-form>
      <section class="v2-card v2-card--soft">
        <p class="v2-eyebrow">Assistido</p>
        <strong>${esc(model.assistedName || 'Selecione um Assistido')}</strong>
        <p class="v2-copy">A aplicação ficará vinculada a este contexto da sessão.</p>
      </section>
      <fieldset class="v2-choice-group">
        <legend>Como será a aplicação?</legend>
        ${[['IN_PERSON','Presencial'],['DISTANCE','À distância'],['SELF','Autoaplicação'],['OTHER','Outro']].map(([value,label], index) => `
          <label class="v2-choice-card"><input type="radio" name="reikiMode" value="${value}" ${index === 0 ? 'checked' : ''}><span><strong>${label}</strong></span></label>
        `).join('')}
      </fieldset>
    </form>
  `;
  return mobileSheet({
    eyebrow: model.assistedName || 'Reiki',
    title: 'Iniciar Reiki',
    body,
    error: ui.error,
    primaryLabel: 'Iniciar aplicação',
    secondaryLabel: 'Cancelar',
  });
}
