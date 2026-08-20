const root = document.documentElement;
let frame = null;

function updateViewport() {
  frame = null;
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offsetTop = viewport?.offsetTop || 0;
  const keyboardHeight = Math.max(0, window.innerHeight - height - offsetTop);
  root.style.setProperty('--fluxa-visual-height', `${Math.round(height)}px`);
  root.style.setProperty('--fluxa-viewport-top', `${Math.round(offsetTop)}px`);
  root.style.setProperty('--fluxa-keyboard-height', `${Math.round(keyboardHeight)}px`);
  document.body.classList.toggle('fluxa-keyboard-open', keyboardHeight > 120);
}

function schedule() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(updateViewport);
}

window.addEventListener('resize', schedule, { passive: true });
window.addEventListener('orientationchange', schedule, { passive: true });
window.visualViewport?.addEventListener('resize', schedule, { passive: true });
window.visualViewport?.addEventListener('scroll', schedule, { passive: true });

document.addEventListener('focusin', schedule, true);
document.addEventListener('focusout', () => setTimeout(schedule, 50), true);
queueMicrotask(updateViewport);
