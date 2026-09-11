function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[c]));
}

export function mobileSheet({
  eyebrow = '',
  title,
  body,
  primaryLabel,
  secondaryLabel = '',
  closeLabel = 'Fechar',
  footerHtml = '',
  error = '',
}) {
  const footer = footerHtml || `
    ${secondaryLabel ? `<button class="v2-btn v2-btn--ghost" type="button" data-v2-secondary>${esc(secondaryLabel)}</button>` : '<span aria-hidden="true"></span>'}
    <button class="v2-btn v2-btn--primary" type="button" data-v2-primary>${esc(primaryLabel)}</button>
  `;
  return `
    <div class="v2-overlay" data-v2-overlay>
      <section class="v2-sheet" role="dialog" aria-modal="true" aria-labelledby="v2-sheet-title" tabindex="-1">
        <header class="v2-sheet__header">
          <div class="v2-sheet__header-copy">
            ${eyebrow ? `<p class="v2-eyebrow">${esc(eyebrow)}</p>` : ''}
            <h2 id="v2-sheet-title">${esc(title)}</h2>
          </div>
          <button class="v2-icon-btn" type="button" data-v2-close-sheet aria-label="${esc(closeLabel)}">×</button>
        </header>
        <div class="v2-sheet__body" data-v2-sheet-body>
          ${error ? `<div class="v2-inline-error" role="alert">${esc(error)}</div>` : ''}
          ${body}
        </div>
        <footer class="v2-sheet__footer">${footer}</footer>
      </section>
    </div>
  `;
}

function isVisibleFocusTarget(element) {
  if (!element || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest?.('[hidden], [aria-hidden="true"]')) return false;
  // offsetParent is null for controls inside display:none/visibility-collapsed branches in the
  // sheet. Keep the guard feature-detected so lightweight test doubles are not rejected.
  if ('offsetParent' in element && element.offsetParent === null && element !== globalThis.document?.activeElement) return false;
  return true;
}

function focusableIn(sheet) {
  return [...sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])')]
    .filter(isVisibleFocusTarget);
}

export function focusSheet(root) {
  const sheet = root.querySelector('.v2-sheet');
  if (!sheet) return;
  // Focus the dialog container by default so opening a sheet never summons the iOS keyboard
  // or shifts the visual viewport before the user has chosen a field. Surfaces that need a
  // semantic first focus (for example triage question text) opt in with data-v2-autofocus.
  const preferred = sheet.querySelector('[data-v2-autofocus]') || sheet;
  preferred.focus?.({ preventScroll: true });
}

export function trapSheetFocus(event, root, activeElement = globalThis.document?.activeElement) {
  if (event.key !== 'Tab') return;
  const sheet = root.querySelector('.v2-sheet');
  if (!sheet) return;
  const focusable = focusableIn(sheet);
  if (!focusable.length) {
    event.preventDefault();
    sheet.focus?.({ preventScroll: true });
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!sheet.contains(activeElement) || activeElement === sheet) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
