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
    offsetTop: offset,
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
  root.style.setProperty('--v2-visual-viewport-offset-top', `${Math.round(metrics.offsetTop)}px`);
  root.style.setProperty('--v2-keyboard-inset', `${Math.round(metrics.keyboardInset)}px`);
  if (doc.body) doc.body.dataset.v2KeyboardOpen = metrics.keyboardOpen ? 'true' : 'false';
  return metrics;
}

export function setPageScrollLock(locked, win = globalThis.window, doc = globalThis.document) {
  const body = doc?.body;
  if (!body) return;
  const alreadyLocked = body.dataset.v2ScrollLocked === 'true';
  if (locked) {
    if (alreadyLocked) return;
    const scrollY = Math.max(0, Number(win?.scrollY ?? win?.pageYOffset) || 0);
    body.dataset.v2ScrollLocked = 'true';
    body.dataset.v2ScrollY = String(scrollY);
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return;
  }
  if (!alreadyLocked) {
    body.style.overflow = '';
    body.style.overscrollBehavior = '';
    return;
  }
  const scrollY = Math.max(0, Number(body.dataset.v2ScrollY) || 0);
  delete body.dataset.v2ScrollLocked;
  delete body.dataset.v2ScrollY;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  body.style.overscrollBehavior = '';
  win?.scrollTo?.({ top: scrollY, left: 0, behavior: 'auto' });
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

export function initMobileViewport(win = globalThis.window, doc = globalThis.document) {
  if (!win || !doc?.documentElement || doc.documentElement.dataset.v2ViewportReady === 'true') return;
  doc.documentElement.dataset.v2ViewportReady = 'true';

  let syncFrame = null;
  let focusFrame = null;
  let focusTimer = null;
  let keepFocusVisible = false;

  const requestFrame = (callback) => {
    if (typeof win.requestAnimationFrame === 'function') return win.requestAnimationFrame(callback);
    queueMicrotask(callback);
    return 'microtask';
  };

  const scheduleFocusedControlVisibility = () => {
    if (focusFrame == null) {
      focusFrame = requestFrame(() => {
        focusFrame = null;
        ensureControlVisible(doc.activeElement);
      });
    }
    if (focusTimer != null) win.clearTimeout?.(focusTimer);
    focusTimer = win.setTimeout?.(() => {
      focusTimer = null;
      ensureControlVisible(doc.activeElement);
    }, 180) ?? null;
  };

  const flushSync = () => {
    syncFrame = null;
    syncVisualViewportMetrics(win, doc);
    const shouldKeepFocus = keepFocusVisible;
    keepFocusVisible = false;
    if (shouldKeepFocus && doc.body?.dataset.v2SheetOpen === 'true') scheduleFocusedControlVisibility();
  };

  const scheduleSync = ({ ensureFocus = false } = {}) => {
    keepFocusVisible ||= ensureFocus;
    if (syncFrame != null) return;
    syncFrame = requestFrame(flushSync);
  };

  syncVisualViewportMetrics(win, doc);
  win.addEventListener?.('resize', () => scheduleSync({ ensureFocus: true }), { passive: true });
  win.addEventListener?.('orientationchange', () => scheduleSync({ ensureFocus: true }), { passive: true });
  win.addEventListener?.('pageshow', () => scheduleSync({ ensureFocus: true }), { passive: true });
  win.visualViewport?.addEventListener?.('resize', () => scheduleSync({ ensureFocus: true }), { passive: true });
  // VisualViewport scroll fires repeatedly while Safari pans the visual viewport around the keyboard.
  // Sync geometry, but do not repeatedly scroll the sheet body and create a feedback/jitter loop.
  win.visualViewport?.addEventListener?.('scroll', () => scheduleSync({ ensureFocus: false }), { passive: true });
  doc.addEventListener?.('focusin', (event) => {
    if (!event.target?.closest?.('.v2-sheet__body')) return;
    scheduleFocusedControlVisibility();
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initMobileViewport(window, document);
