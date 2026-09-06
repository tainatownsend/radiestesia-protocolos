let enhancing = false;

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const children = [...topbar.children].filter((node) => !node.hidden && getComputedStyle(node).display !== 'none');
    const trailing = Math.max(1, children.length - 1);
    topbar.style.display = 'grid';
    topbar.style.gridTemplateColumns = `minmax(0,1fr) repeat(${trailing},auto)`;
    topbar.style.alignItems = 'center';
    topbar.style.columnGap = '12px';
    children[0]?.style && (children[0].style.justifySelf = 'start');
    children.slice(1).forEach((node) => { node.style.justifySelf = 'end'; });
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);
