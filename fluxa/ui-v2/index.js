import { renderAppShell } from './app-shell.js';
import { fixtureFromLocation } from './testing/fixtures.js';
import { focusSheet, trapSheetFocus } from './components/mobile-sheet.js';

const root = document.querySelector('#fluxa-v2-root');
const model = fixtureFromLocation();
const ui = {
  route: 'today',
  sheet: model.overlay === 'preparation' ? 'preparation' : null,
};
let opener = null;

function render({ focusDialog = false } = {}) {
  root.innerHTML = renderAppShell(model, ui);
  document.body.dataset.v2SheetOpen = ui.sheet ? 'true' : 'false';
  document.body.style.overflow = ui.sheet ? 'hidden' : '';
  document.body.style.overscrollBehavior = ui.sheet ? 'none' : '';
  if (focusDialog && ui.sheet) queueMicrotask(() => focusSheet(root));
}

root.addEventListener('click', (event) => {
  const route = event.target.closest('[data-v2-route]');
  if (route) {
    ui.route = route.dataset.v2Route;
    ui.sheet = null;
    render();
    return;
  }

  const close = event.target.closest('[data-v2-close-sheet]');
  if (close) {
    ui.sheet = null;
    render();
    queueMicrotask(() => opener?.focus?.());
    return;
  }

  const action = event.target.closest('[data-v2-preview-action]');
  if (!action) return;
  opener = action;
  if (action.dataset.v2PreviewAction === 'next' && model.nextAction === 'Concluir preparação') {
    ui.sheet = 'preparation';
    render({ focusDialog: true });
  }
});

document.addEventListener('keydown', (event) => {
  if (!ui.sheet) return;
  if (event.key === 'Escape') {
    ui.sheet = null;
    render();
    queueMicrotask(() => opener?.focus?.());
    return;
  }
  trapSheetFocus(event, root);
});

render({ focusDialog: Boolean(ui.sheet) });