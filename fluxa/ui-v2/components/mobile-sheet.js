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
      <section class="v2-sheet" role="dialog" aria-modal="true" aria-labelledby="v2-sheet-title">
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

function focusableIn(sheet) {
  return [...sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

export function focusSheet(root) {
  const sheet = root.querySelector('.v2-sheet');
  if (!sheet) return;
  const preferred = sheet.querySelector('[data-v2-autofocus]')
    || sheet.querySelector('.v2-sheet__body input:not([disabled]), .v2-sheet__body select:not([disabled]), .v2-sheet__body textarea:not([disabled]), .v2-sheet__body button:not([disabled])')
    || sheet.querySelector('[data-v2-primary]')
    || focusableIn(sheet)[0];
  preferred?.focus({ preventScroll: true });
}

export function trapSheetFocus(event, root) {
  if (event.key !== 'Tab') return;
  const sheet = root.querySelector('.v2-sheet');
  if (!sheet) return;
  const focusable = focusableIn(sheet);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
