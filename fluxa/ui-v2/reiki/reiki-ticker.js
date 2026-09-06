const timerBaselines = new WeakMap();

export function formatElapsed(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function baselineFor(timer, now) {
  const sourceSeconds = Math.max(0, Number(timer.dataset.v2ReikiElapsedSeconds) || 0);
  const sourceRunning = timer.dataset.v2ReikiRunning === 'true';
  const existing = timerBaselines.get(timer);
  if (existing && existing.sourceSeconds === sourceSeconds && existing.running === sourceRunning) return existing;
  const next = { sourceSeconds, running: sourceRunning, observedAt: now };
  timerBaselines.set(timer, next);
  return next;
}

export function updateReikiTimer(doc = globalThis.document, now = Date.now()) {
  const timer = doc?.querySelector?.('[data-v2-reiki-timer]');
  if (!timer) return null;
  const output = timer.querySelector?.('[data-v2-reiki-elapsed]');
  if (!output) return null;
  const baseline = baselineFor(timer, now);
  const extra = baseline.running ? Math.max(0, Math.floor((now - baseline.observedAt) / 1000)) : 0;
  const seconds = baseline.sourceSeconds + extra;
  output.textContent = formatElapsed(seconds);
  return seconds;
}

export function initReikiTicker(win = globalThis.window, doc = globalThis.document) {
  if (!win || !doc || doc.documentElement?.dataset.v2ReikiTickerReady === 'true') return null;
  if (doc.documentElement) doc.documentElement.dataset.v2ReikiTickerReady = 'true';
  const tick = () => {
    if (doc.hidden) return;
    updateReikiTimer(doc, Date.now());
  };
  tick();
  const intervalId = win.setInterval?.(tick, 1000);
  doc.addEventListener?.('visibilitychange', tick);
  win.addEventListener?.('pageshow', tick, { passive: true });
  return intervalId ?? null;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initReikiTicker(window, document);
