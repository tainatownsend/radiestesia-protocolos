const CONTROL_SELECTOR = 'input, textarea, select, button, [contenteditable="true"]';
const KEYBOARD_THRESHOLD = 120;

export function viewportMetrics({ layoutHeight = 0, visualHeight = 0, offsetTop = 0 } = {}) {
  const layout = Math.max(0, Number(layoutHeight) || 0);
  const visual = Math.max(0, Number(visualHeight) || layout);
  const offset = Math.max(0, Number(offsetTop) || 0);
  const keyboardInset = Math.max(0, layout - visual - offset);
  return {
    layoutHeight: layout,
    visualHeight: visual || layout,
    keyboardInset,
    keyboardOpen: keyboardInset >= KEYBOARD_THRESHOLD,
  };
}

export function syncVisualViewportMetrics(win = globalThis.window, doc = globalThis.document) {
  if (!win || !doc?.documentElement) return null;
  const viewport = win.visualViewport;
  const metrics = viewportMetrics({
    layoutHeight: win.innerHeight || doc.documentElement.clientHeight || 0,
    visualHeight: viewport?.height || win.innerHeight || doc.documentElement.clientHeight || 0,
    offsetTop: viewport?.offsetTop || 0,
  });
  const root = doc.documentElement;
  root.style.setProperty('--v2-visual-viewport-height', `${Math.round(metrics.visualHeight)}px`);
  root.style.setProperty('--v2-keyboard-inset', `${Math.round(metrics.keyboardInset)}px`);
  if (doc.body) doc.body.dataset.v2KeyboardOpen = metrics.keyboardOpen ? 'true' : 'false';
  return metrics;
}

function focusedBlock(target) {
  return target?.closest?.('.v2-field, .v2-choice-card, .v2-check-row, .v2-treatment-graph') || target;
}

export function ensureControlVisible(target = globalThis.document?.activeElement) {
  if (!target?.matches?.(CONTROL_SELECTOR)) return false;
  const body = target.closest?.('.v2-sheet__body');
  if (!body) return false;
  const block = focusedBlock(target);
  if (!block?.getBoundingClientRect || !body.getBoundingClientRect) return false;
  const bodyRect = body.getBoundingClientRect();
  const targetRect = block.getBoundingClientRect();
  const topGuard = bodyRect.top + 16;
  const bottomGuard = bodyRect.bottom - 20;
  let delta = 0;
  if (targetRect.bottom > bottomGuard) delta = targetRect.bottom - bottomGuard;
  else if (targetRect.top < topGuard) delta = targetRect.top - topGuard;
  if (Math.abs(delta) > 1 && typeof body.scrollBy === 'function') body.scrollBy({ top: delta, behavior: 'auto' });
  return true;
}

function scheduleFocusedControlVisibility(win, doc) {
  const run = () => ensureControlVisible(doc.activeElement);
  if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(run);
  else queueMicrotask(run);
  win.setTimeout?.(run, 180);
}

export function initMobileViewport(win = globalThis.window, doc = globalThis.document) {
  if (!win || !doc?.documentElement || doc.documentElement.dataset.v2ViewportReady === 'true') return;
  doc.documentElement.dataset.v2ViewportReady = 'true';
  const sync = () => {
    syncVisualViewportMetrics(win, doc);
    if (doc.body?.dataset.v2SheetOpen === 'true') scheduleFocusedControlVisibility(win, doc);
  };
  sync();
  win.addEventListener?.('resize', sync, { passive: true });
  win.addEventListener?.('orientationchange', sync, { passive: true });
  win.addEventListener?.('pageshow', sync, { passive: true });
  win.visualViewport?.addEventListener?.('resize', sync, { passive: true });
  win.visualViewport?.addEventListener?.('scroll', sync, { passive: true });
  doc.addEventListener?.('focusin', (event) => {
    if (!event.target?.closest?.('.v2-sheet__body')) return;
    scheduleFocusedControlVisibility(win, doc);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initMobileViewport(window, document);
