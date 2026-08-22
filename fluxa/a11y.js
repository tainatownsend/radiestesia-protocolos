let dialogIdCounter = 0;
let lastActive = null;
const NO_ARIA_HIDDEN = '__none__';

function nextDialogTitleId() {
  dialogIdCounter += 1;
  return `fluxa-dialog-title-${dialogIdCounter}`;
}

function enhanceAccessibility() {
  document.querySelectorAll('.sheet').forEach((sheet) => {
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    const heading = sheet.querySelector('h1,h2,h3');
    if (heading) {
      if (!heading.id) heading.id = nextDialogTitleId();
      sheet.setAttribute('aria-labelledby', heading.id);
    } else if (!sheet.getAttribute('aria-label')) {
      sheet.setAttribute('aria-label', 'Janela do Fluxa');
    }
  });

  document.querySelectorAll('.close-btn').forEach((button) => {
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Fechar');
    button.setAttribute('type', 'button');
  });

  document.querySelectorAll('[data-live-timer],[data-reiki-outside-timer]').forEach((timer) => {
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

function focusableElements(dialog) {
  return [...dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
}

function newestDialog() {
  return [...document.querySelectorAll('.sheet[role="dialog"]')].at(-1) || null;
}

function topLevelOwner(node) {
  let current = node;
  while (current?.parentElement && current.parentElement !== document.body) current = current.parentElement;
  return current?.parentElement === document.body ? current : null;
}

function isolateNode(node) {
  if (!node.dataset.fluxaModalIsolated) {
    node.dataset.fluxaModalIsolated = 'true';
    node.dataset.fluxaPreviousAriaHidden = node.hasAttribute('aria-hidden') ? node.getAttribute('aria-hidden') : NO_ARIA_HIDDEN;
  }
  node.inert = true;
  node.setAttribute('aria-hidden', 'true');
}

function restoreNode(node) {
  if (!node.dataset.fluxaModalIsolated) return;
  node.inert = false;
  const previous = node.dataset.fluxaPreviousAriaHidden;
  if (previous === NO_ARIA_HIDDEN) node.removeAttribute('aria-hidden');
  else if (previous != null) node.setAttribute('aria-hidden', previous);
  delete node.dataset.fluxaModalIsolated;
  delete node.dataset.fluxaPreviousAriaHidden;
}

function syncModalIsolation() {
  const dialog = newestDialog();
  const owner = dialog ? topLevelOwner(dialog) : null;
  [...document.body.children].forEach((child) => {
    if (child.tagName === 'SCRIPT') return;
    if (dialog && child !== owner) isolateNode(child);
    else restoreNode(child);
  });
}

function focusNewestDialog() {
  const dialog = newestDialog();
  if (!dialog || dialog.dataset.focusInitialized) return;
  dialog.dataset.focusInitialized = 'true';
  const target = focusableElements(dialog)[0];
  if (target) target.focus({ preventScroll:true });
  else {
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll:true });
  }
}

function refreshAccessibility() {
  enhanceAccessibility();
  syncModalIsolation();
  focusNewestDialog();
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('button,[href]');
  if (trigger && !trigger.closest('.sheet')) lastActive = trigger;
  queueMicrotask(refreshAccessibility);
}, true);

document.addEventListener('keydown', (event) => {
  const dialog = newestDialog();
  if (event.key === 'Tab' && dialog) {
    const focusables = focusableElements(dialog);
    if (!focusables.length) {
      event.preventDefault();
      dialog.focus({ preventScroll:true });
      return;
    }
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll:true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll:true });
    }
    return;
  }

  if (event.key !== 'Escape' || !dialog) return;
  const close = dialog.querySelector('[data-remaining-close],[data-backlog-close],[data-action="dismiss-sheet"],[data-reiki-outside-close],[data-history-close],[data-close-protocol],[data-close-investigation-chooser],.close-btn');
  if (close) {
    event.preventDefault();
    close.click();
    queueMicrotask(() => {
      refreshAccessibility();
      lastActive?.isConnected && lastActive.focus?.({ preventScroll:true });
    });
  }
});

const observer = new MutationObserver(refreshAccessibility);
observer.observe(document.body, { childList:true, subtree:true });
queueMicrotask(refreshAccessibility);
