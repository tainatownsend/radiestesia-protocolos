import { inspectStorageHealth } from '../../storage-health.js';
import { mobileSheet } from '../components/mobile-sheet.js';

const OPTIONAL_MODALITIES = Object.freeze([
  { id: 'REIKI', label: 'Aplicação de Reiki' },
  { id: 'BACH_FLOWERS', label: 'Florais de Bach' },
  { id: 'CRYSTALS', label: 'Cristais' },
  { id: 'RADIONIC_TABLE', label: 'Mesa radiônica' },
]);

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function fmt(value) {
  if (!value) return 'Ainda não realizado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Registro indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function storageStatus(health) {
  if (health.status === 'OK') return { label: 'Armazenamento local disponível', detail: 'O navegador consegue ler e salvar os dados locais do Fluxa.' };
  if (health.status === 'PRIMARY_CORRUPT') return { label: 'Dados locais precisam de recuperação', detail: 'A cópia principal não pôde ser validada. Uma cópia de recuperação pode estar disponível.' };
  if (health.status === 'WRITE_ERROR') return { label: 'O navegador não está permitindo salvar', detail: 'Evite continuar o atendimento até que o armazenamento local volte a funcionar.' };
  return { label: 'Não foi possível ler o armazenamento local', detail: 'Verifique as permissões do navegador antes de continuar.' };
}

function importPreview(preview, locked = false) {
  if (!preview) return '';
  const summary = preview.summary || {};
  return `
    <div class="v2-import-preview" role="status">
      <p class="v2-eyebrow">Prévia validada</p>
      <strong>${esc(preview.name || 'Backup do Fluxa')}</strong>
      <div class="v2-import-counts">
        <span>${summary.sessions || 0} sessões</span>
        <span>${summary.assisteds || 0} Assistidos</span>
        <span>${summary.treatments || 0} tratamentos</span>
        <span>${summary.resources || 0} recursos</span>
      </div>
      <p class="v2-helper">A importação substituirá os dados atuais somente depois da sua confirmação. O Fluxa preserva uma cópia local anterior quando possível.</p>
      <button class="v2-btn v2-btn--primary" type="button" data-v2-settings-import-apply ${locked ? 'disabled' : ''}>Importar este backup</button>
    </div>
  `;
}

export function settingsSheet(model, ui) {
  const health = model.storageHealth || inspectStorageHealth();
  const status = storageStatus(health);
  const therapeutic = model.therapeuticSettings || { enabled: [], custom: [] };
  const enabled = new Set(therapeutic.enabled || []);
  const dataReplacementLocked = Boolean(model.sessionOpen);

  const body = `
    <div class="v2-settings-stack">
      <section class="v2-settings-block">
        <p class="v2-eyebrow">Dados e privacidade</p>
        <h3>Seus dados ficam neste dispositivo</h3>
        <p class="v2-copy">Esta versão do Fluxa salva os dados localmente neste navegador. Não há sincronização em nuvem ativa e o app não deve ser interpretado como tendo backup automático fora deste dispositivo.</p>
        <div class="v2-trust-state" data-status="${esc(health.status)}">
          <strong>${esc(status.label)}</strong>
          <span>${esc(status.detail)}</span>
        </div>
        <div class="v2-status-line"><span>Última exportação concluída</span><strong>${esc(fmt(health.lastExportAt))}</strong></div>
        ${dataReplacementLocked ? '<div class="v2-card v2-card--soft"><strong>Importação e recuperação estão pausadas</strong><p class="v2-copy">Finalize a sessão atual antes de substituir ou recuperar os dados locais. Exportar backup continua disponível.</p></div>' : ''}
        <div class="v2-settings-actions">
          <button class="v2-btn" type="button" data-v2-settings-export>Exportar backup JSON</button>
          <label class="v2-btn v2-btn--ghost v2-file-button">Selecionar backup para importar<input type="file" accept="application/json,.json" data-v2-settings-import-file ${dataReplacementLocked ? 'disabled' : ''}></label>
        </div>
        ${health.canRecover && health.status !== 'OK' ? `<button class="v2-btn v2-btn--ghost" type="button" data-v2-settings-recover ${dataReplacementLocked ? 'disabled' : ''}>Tentar recuperar cópia local</button>` : ''}
        ${importPreview(ui.importPreview, dataReplacementLocked)}
      </section>

      <section class="v2-settings-block">
        <p class="v2-eyebrow">Prática terapêutica</p>
        <h3>Terapias disponíveis</h3>
        <div class="v2-modality-base"><strong>Radiestesia</strong><span>Base permanente do Fluxa</span></div>
        <fieldset class="v2-settings-fieldset">
          <legend>Terapias complementares</legend>
          ${OPTIONAL_MODALITIES.map((item) => `
            <label class="v2-check-row">
              <input type="checkbox" name="v2EnabledModality" value="${esc(item.id)}" ${enabled.has(item.id) ? 'checked' : ''}>
              <span><strong>${esc(item.label)}</strong><small>Mostrar como opção ao compor tratamentos.</small></span>
            </label>
          `).join('')}
        </fieldset>
        <label class="v2-field">
          <span>Outras terapias <small>(uma por linha)</small></span>
          <textarea rows="4" data-v2-settings-custom-modalities placeholder="Ex.: Aromaterapia">${esc((therapeutic.custom || []).join('\n'))}</textarea>
        </label>
        <button class="v2-btn v2-btn--primary" type="button" data-v2-settings-save-modalities>Salvar terapias</button>
      </section>
    </div>
  `;

  return mobileSheet({
    eyebrow: 'Fluxa',
    title: 'Configurações',
    body,
    error: ui.error,
    footerHtml: '<span aria-hidden="true"></span><button class="v2-btn v2-btn--primary" type="button" data-v2-close-sheet>Fechar</button>',
  });
}
