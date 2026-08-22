let enhancing = false;

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    topbar.style.gridTemplateColumns = topbar.querySelector('.session-indicator') ? 'minmax(0,1fr) auto auto' : 'minmax(0,1fr) auto';
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
