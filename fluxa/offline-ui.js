let registrationAttempted = false;

async function registerOfflineSupport() {
  if (registrationAttempted || !('serviceWorker' in navigator)) return;
  registrationAttempted = true;
  try {
    await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
  } catch (_) {
    // Offline support is an enhancement; Fluxa remains usable without registration.
  }
}

function updateOfflineState() {
  document.body.classList.toggle('fluxa-offline', !navigator.onLine);
  let banner = document.querySelector('[data-offline-banner]');
  if (navigator.onLine) {
    banner?.remove();
    return;
  }
  if (banner) return;
  banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.dataset.offlineBanner = 'true';
  banner.setAttribute('role', 'status');
  banner.textContent = 'Sem conexão · trabalhando com a cópia local do Fluxa';
  document.body.appendChild(banner);
}

window.addEventListener('online', updateOfflineState);
window.addEventListener('offline', updateOfflineState);
queueMicrotask(() => {
  updateOfflineState();
  registerOfflineSupport();
});
