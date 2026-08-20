function setPortugueseDateTimeMessage(input) {
  if (!(input instanceof HTMLInputElement) || input.type !== 'datetime-local') return;

  input.setCustomValidity('');
  const value = input.value;
  if (!value) return;

  if (input.min && value <= input.min) {
    input.setCustomValidity('O horário de término deve ser posterior ao horário de início da sessão.');
    return;
  }

  if (input.max && value > input.max) {
    input.setCustomValidity('O horário de término não pode estar no futuro.');
  }
}

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input?.matches?.('#correct-session-form [name="endedAt"]')) {
    setPortugueseDateTimeMessage(input);
  }
}, true);

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input?.matches?.('#correct-session-form [name="endedAt"]')) {
    setPortugueseDateTimeMessage(input);
  }
}, true);

document.addEventListener('invalid', (event) => {
  const input = event.target;
  if (!input?.matches?.('#correct-session-form [name="endedAt"]')) return;
  setPortugueseDateTimeMessage(input);
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form?.id !== 'correct-session-form') return;
  const input = form.querySelector('[name="endedAt"]');
  setPortugueseDateTimeMessage(input);
  if (!input.checkValidity()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    input.reportValidity();
  }
}, true);
