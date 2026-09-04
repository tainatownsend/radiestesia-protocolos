const FLOW_STEPS = Object.freeze([
  { id:'prepare', label:'Preparar', mark:'01' },
  { id:'measure', label:'Medir', mark:'02' },
  { id:'investigate', label:'Investigar', mark:'03' },
  { id:'treat', label:'Tratar', mark:'04' },
  { id:'review', label:'Revisar', mark:'05' }
]);

const COMPACT_COPY = new Map([
  ['Marque cada etapa conforme concluir. O progresso é salvo automaticamente.', 'Siga uma etapa por vez. O progresso é salvo.'],
  ['Escolha uma ferramenta de apoio. Você pode tratar diretamente sem concluir uma investigação.', 'Escolha o nível. Você também pode tratar sem investigar.'],
  ['Confirme somente respostas positivas que realmente devem virar achados. Elas não serão classificadas automaticamente como causa.', 'Confirme apenas o que deve entrar no histórico.'],
  ['Registre a frequência em Hz antes de iniciar a investigação ou o tratamento.', 'Registre a frequência inicial para seguir.'],
  ['Medição final obrigatória do tratamento.', 'Medição final do tratamento.']
]);

let scheduled = false;

function stageFor(sheet) {
  if (sheet.querySelector('#final-assessment-form,#final-cycle-form')) return 'review';
  if (sheet.querySelector('#findings-form,#branch-findings-form')) return 'investigate';
  if (sheet.querySelector('#treatment-form,[data-treatment-items]')) return 'treat';
  if (sheet.querySelector('[data-hawkins-baseline-form],#assessment-hawkins-baseline-form')) return 'measure';
  if (sheet.querySelector('[data-prep-step],[data-prep-structured],[data-action="complete-preparation"]')) return 'prepare';
  if (sheet.matches('.premium-protocol-sheet,.premium-workflow-protocol') || sheet.querySelector('.question-panel,.assessment-suggestion-list,.featured-protocol-grid')) return 'investigate';
  return null;
}

function journey(stage) {
  const current = FLOW_STEPS.findIndex((step) => step.id === stage);
  const nav = document.createElement('ol');
  nav.className = 'fx-journey';
  nav.dataset.fxJourney = 'true';
  nav.setAttribute('aria-label', 'Etapas da sessão');
  nav.innerHTML = FLOW_STEPS.map((step, index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'next';
    const currentAttr = state === 'current' ? ' aria-current="step"' : '';
    return `<li class="${state}"${currentAttr}><span>${step.mark}</span><small>${step.label}</small></li>`;
  }).join('');
  return nav;
}

function compactText(root) {
  for (const node of root.querySelectorAll('p,small')) {
    const replacement = COMPACT_COPY.get(node.textContent.trim());
    if (replacement) node.textContent = replacement;
  }
}

function ensureSheetBody(sheet) {
  let body = sheet.querySelector(':scope > .fx-sheet-body');
  if (!body) {
    body = document.createElement('div');
    body.className = 'fx-sheet-body';
    const header = sheet.querySelector(':scope > .sheet-head');
    if (header) header.after(body);
    else sheet.prepend(body);
  }

  const directChildren = [...sheet.children];
  for (const child of directChildren) {
    if (child.matches('.sheet-head,.fx-sheet-body,.fx-sheet-footer')) continue;
    if (child.matches('.binary-actions,.save-state')) continue;
    body.appendChild(child);
  }
  return body;
}

function ensureQuestionFooter(sheet) {
  const actions = sheet.querySelector(':scope > .binary-actions');
  const save = sheet.querySelector(':scope > .save-state');
  if (!actions && !save) return;
  let footer = sheet.querySelector(':scope > .fx-sheet-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.className = 'fx-sheet-footer';
    sheet.appendChild(footer);
  }
  if (actions) footer.appendChild(actions);
  if (save) footer.appendChild(save);
}

function enhanceSheet(sheet) {
  sheet.classList.add('fx-shell');
  sheet.closest('.modal-backdrop')?.classList.add('fx-backdrop');
  const header = sheet.querySelector(':scope > .sheet-head');
  if (header) {
    header.classList.add('fx-shell-header');
    const close = header.querySelector('.close-btn');
    if (close && !close.getAttribute('aria-label')) close.setAttribute('aria-label', 'Fechar');
  }

  const stage = stageFor(sheet);
  if (stage) {
    sheet.dataset.fxStage = stage;
    if (header && !header.querySelector('[data-fx-journey]')) header.appendChild(journey(stage));
  }

  ensureSheetBody(sheet);
  ensureQuestionFooter(sheet);
  compactText(sheet);
}

function enhancePreparation() {
  const progress = document.querySelector('[data-prep-guided-progress]');
  if (!progress) return;
  const match = progress.textContent.match(/Etapa\s+(\d+)\s+de\s+(\d+)/i);
  const value = match ? Math.round((Number(match[1]) / Number(match[2])) * 100) : 100;
  progress.classList.add('fx-prep-progress');
  progress.style.setProperty('--fx-progress', `${value}%`);
  if (!progress.querySelector('.fx-progress-track')) {
    const track = document.createElement('span');
    track.className = 'fx-progress-track';
    track.setAttribute('aria-hidden', 'true');
    progress.appendChild(track);
  }

  document.querySelectorAll('[data-prep-step]').forEach((input, index) => {
    const row = input.closest('.check-row');
    if (!row) return;
    row.classList.add('fx-prep-step');
    row.style.setProperty('--fx-step', `'0${index + 1}'`);
  });
}

function enhanceIdleHome() {
  if (!document.body.classList.contains('fluxa-home-idle')) return;
  const hero = document.querySelector('main .hero-card');
  if (!hero || hero.dataset.fxVisual === 'true') return;
  hero.dataset.fxVisual = 'true';
  hero.classList.add('fx-visual-hero');

  const copy = document.createElement('div');
  copy.className = 'fx-hero-copy';
  const eyebrow = hero.querySelector(':scope > .hero-eyebrow');
  const title = hero.querySelector(':scope > h2');
  const description = hero.querySelector(':scope > p:not(.eyebrow)');
  if (title) title.textContent = 'Abra uma sessão quando estiver pronta.';
  if (description) description.textContent = 'Histórico e tratamentos permanecem preservados.';
  [eyebrow, title, description].filter(Boolean).forEach((node) => copy.appendChild(node));

  const figure = document.createElement('figure');
  figure.className = 'fx-hero-art';
  figure.setAttribute('aria-hidden', 'true');
  figure.innerHTML = '<img src="assets/fluxa-focus.webp" alt="" width="1280" height="853" decoding="async">';
  hero.prepend(copy);
  hero.prepend(figure);
}

function enhanceIdleSupport() {
  if (!document.body.classList.contains('fluxa-home-idle')) return;
  document.querySelectorAll('main .notice-card').forEach((card) => {
    card.classList.add('fx-compact-notice');
    if (!card.querySelector('.fx-notice-mark')) {
      const mark = document.createElement('span');
      mark.className = 'fx-notice-mark';
      mark.textContent = '!';
      mark.setAttribute('aria-hidden', 'true');
      card.prepend(mark);
    }
  });
}

function enhanceProtocolCards() {
  document.querySelectorAll('#investigation-chooser-overlay .card,.assessment-suggestion-card,.featured-protocol').forEach((card, index) => {
    card.classList.add('fx-choice-card');
    if (!card.querySelector('.fx-choice-number')) {
      const mark = document.createElement('span');
      mark.className = 'fx-choice-number';
      mark.textContent = String(index + 1).padStart(2, '0');
      mark.setAttribute('aria-hidden', 'true');
      card.prepend(mark);
    }
  });
}

function enhance() {
  document.querySelectorAll('.modal-backdrop > .sheet').forEach(enhanceSheet);
  enhancePreparation();
  enhanceIdleHome();
  enhanceIdleSupport();
  enhanceProtocolCards();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','hidden','checked'] });
window.addEventListener('fluxa:state-changed', schedule);
queueMicrotask(schedule);
