import { importLocalDataText } from './storage-health.js';

function ensureImportAction() {
  const main = document.querySelector('main');
  if (!main || document.querySelector('[data-storage-import]')) return;
  const eyebrow = main.querySelector('.eyebrow')?.textContent?.trim();
  if (eyebrow !== 'Hoje') return;

  const button = document.createElement('button');
  button.className = 'btn ghost small local-backup-action';
  button.dataset.storageImport = 'true';
  button.textContent = 'Importar cópia local';
  main.appendChild(button);
}

const observer = new MutationObserver(ensureImportAction);
observer.observe(document.querySelector('#app'), { childList:true, subtree:true });
queueMicrotask(ensureImportAction);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-storage-import]');
  if (!button) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ok = confirm('Importar esta cópia substituirá os dados atuais do Fluxa neste dispositivo. Uma cópia dos dados atuais será preservada como backup. Continuar?');
      if (!ok) return;
      importLocalDataText(text);
      location.reload();
    } catch (error) {
      alert(error.message || 'Não foi possível importar esta cópia.');
    }
  }, { once:true });
  input.click();
}, true);
