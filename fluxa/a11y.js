function enhanceAccessibility() {
  document.querySelectorAll('.sheet').forEach((sheet) => {
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    const heading = sheet.querySelector('h1,h2,h3');
    if (heading) {
      if (!heading.id) heading.id = `dialog-title-${Math.random().toString(36).slice(2,8)}`;
      sheet.setAttribute('aria-labelledby', heading.id);
    }
  });

  document.querySelectorAll('.close-btn').forEach((button) => {
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Fechar');
    button.setAttribute('type', 'button');
  });

  document.querySelectorAll('[data-live-timer]').forEach((timer) => {
    timer.setAttribute('role', 'timer');
    timer.setAttribute('aria-live', 'off');
    timer.setAttribute('aria-label', 'Tempo da aplicação de Reiki');
  });

  document.querySelectorAll('button:not([type])').forEach((button) => button.setAttribute('type', 'button'));

  document.querySelectorAll('input, textarea, select').forEach((field) => {
    if (field.hasAttribute('aria-label') || field.hasAttribute('aria-labelledby')) return;
    const label = field.closest('.field')?.querySelector('label') || field.closest('label');
    if (label?.textContent?.trim()) field.setAttribute('aria-label', label.textContent.trim());
  });

  document.querySelectorAll('.status-pill').forEach((pill) => {
    pill.setAttribute('aria-label', `Status: ${pill.textContent.trim()}`);
  });
}

function focusNewestDialog() {
  const dialogs = [...document.querySelectorAll('.sheet[role="dialog"]')];
  const dialog = dialogs.at(-1);
  if (!dialog || dialog.dataset.focusInitialized) return;
  dialog.dataset.focusInitialized = 'true';
  const target = dialog.querySelector('input:not([type="hidden"]), textarea, select, button');
  target?.focus({ preventScroll:true });
}

let lastActive = null;
document.addEventListener('click', (event) => {
  if (event.target.closest('button')) lastActive = event.target.closest('button');
  queueMicrotask(() => {
    enhanceAccessibility();
    focusNewestDialog();
  });
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const overlay = document.querySelector('#remaining-overlay, #backlog-overlay, .modal-backdrop');
  const close = overlay?.querySelector('[data-remaining-close],[data-backlog-close],[data-action="dismiss-sheet"],.close-btn');
  if (close) {
    event.preventDefault();
    close.click();
    queueMicrotask(() => lastActive?.focus?.({ preventScroll:true }));
  }
});

const observer = new MutationObserver(() => {
  enhanceAccessibility();
  focusNewestDialog();
});
observer.observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhanceAccessibility);
