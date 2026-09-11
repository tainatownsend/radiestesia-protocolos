export function preventImplicitV2FormSubmit(event) {
  const form = event?.target;
  if (!form?.matches?.('form')) return false;
  event.preventDefault?.();
  return true;
}

export function initFormSubmitGuard(root = globalThis.document?.querySelector?.('#fluxa-v2-root')) {
  if (!root || root.dataset.v2FormSubmitGuard === 'true') return false;
  root.dataset.v2FormSubmitGuard = 'true';
  root.addEventListener?.('submit', preventImplicitV2FormSubmit);
  return true;
}

if (typeof document !== 'undefined') initFormSubmitGuard();
