let enhancing = false;
const values = [0, 25, 50, 75, 100];

function enhanceInput(input) {
  if (input.dataset.quickPercentage) return;
  input.dataset.quickPercentage = 'true';
  const field = input.closest('.field');
  if (!field) return;
  const group = document.createElement('div');
  group.className = 'touch-chip-group percentage-chip-group';
  group.dataset.quickPercentageGroup = 'true';
  group.innerHTML = values.map((value) => `<button type="button" class="touch-chip" data-percentage-value="${value}">${value}%</button>`).join('');
  field.appendChild(group);
  sync(input, group);
}

function sync(input, group = input.closest('.field')?.querySelector('[data-quick-percentage-group]')) {
  if (!group) return;
  const current = String(input.value ?? '');
  group.querySelectorAll('[data-percentage-value]').forEach((button) => {
    button.classList.toggle('active', current !== '' && button.dataset.percentageValue === current);
  });
}

function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    document.querySelectorAll('input[name="imbalancePercent"]').forEach(enhanceInput);
  } finally { enhancing = false; }
}

new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-percentage-value]');
  if (!button) return;
  const field = button.closest('.field');
  const input = field?.querySelector('input[name="imbalancePercent"]');
  if (!input) return;
  input.value = button.dataset.percentageValue;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  sync(input);
}, true);

document.addEventListener('input', (event) => {
  if (!event.target.matches('input[name="imbalancePercent"]')) return;
  sync(event.target);
}, true);
