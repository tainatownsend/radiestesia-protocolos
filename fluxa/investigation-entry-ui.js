const snapshots = new WeakMap();
let enhancing = false;

function entryHtml() {
  return `<div class="sheet-head"><div><p class="eyebrow">Investigar</p><h2>O que você quer fazer agora?</h2></div><button class="close-btn" type="button" data-close-investigation-chooser>×</button></div>
    <p class="muted">Escolha primeiro a profundidade. O catálogo completo aparece somente quando você pedir um protocolo específico.</p>
    <div class="investigation-entry-grid">
      <button type="button" class="investigation-entry-card" data-investigation-entry="quick"><span><strong>Investigação rápida</strong><span>Triagem objetiva para decidir se vale aprofundar.</span></span></button>
      <button type="button" class="investigation-entry-card" data-investigation-entry="initial"><span><strong>Investigação inicial</strong><span>Mapeia prioridade e direção antes de aprofundar.</span></span></button>
      <button type="button" class="investigation-entry-card" data-investigation-entry="complete"><span><strong>Investigação completa</strong><span>Percorre origem, manutenção, contexto e necessidade de aprofundamento.</span></span></button>
      <button type="button" class="investigation-entry-card" data-investigation-entry="specific"><span><strong>Protocolo específico</strong><span>Busque por tema quando você já sabe o foco da investigação.</span></span></button>
      <button type="button" class="investigation-entry-card master" data-investigation-entry="master"><span><strong>Não sei por onde começar</strong><span>Use o Protocolo Mestre de Causa Raiz para orientar a investigação.</span></span></button>
    </div>`;
}
function showEntry(sheet) {
  if (!sheet) return;
  if (!snapshots.has(sheet)) snapshots.set(sheet, sheet.innerHTML);
  sheet.dataset.iaInvestigationEntry = 'entry';
  sheet.innerHTML = entryHtml();
}
function restoreCatalog(sheet, { specific = false } = {}) {
  const html = snapshots.get(sheet);
  if (!html) return false;
  sheet.innerHTML = html;
  sheet.dataset.iaInvestigationEntry = specific ? 'catalog' : 'restored';
  if (specific) {
    const head = sheet.querySelector('.sheet-head');
    if (head) {
      const copy = head.querySelector('div');
      if (copy) copy.innerHTML = '<p class="eyebrow">Protocolo específico</p><h2>Qual protocolo você quer usar?</h2>';
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn ghost small investigation-catalog-back';
      back.dataset.investigationBackEntry = 'true';
      back.textContent = '← Tipos de investigação';
      head.after(back);
    }
    sheet.querySelector('.featured-protocol-grid')?.setAttribute('hidden', '');
    const quick = sheet.querySelector('[data-start-quick-investigation]')?.closest('[data-protocol-card]');
    quick?.setAttribute('hidden', '');
    requestAnimationFrame(() => sheet.querySelector('[data-therapeutic-search]')?.focus());
  }
  return true;
}
function clickCatalogTarget(sheet, selector) {
  if (!restoreCatalog(sheet)) return;
  const target = sheet.querySelector(selector);
  if (target) target.click();
  else alert('Este protocolo não está disponível nesta versão do Fluxa.');
}
function enhance() {
  if (enhancing) return;
  enhancing = true;
  try {
    const sheet = document.querySelector('#investigation-chooser-overlay .sheet');
    if (!sheet || sheet.dataset.therapeuticCatalog !== 'ready') return;
    if (sheet.dataset.iaInvestigationEntry) return;
    snapshots.set(sheet, sheet.innerHTML);
    showEntry(sheet);
  } finally {
    enhancing = false;
  }
}

new MutationObserver(() => queueMicrotask(enhance)).observe(document.body, { childList:true, subtree:true });
queueMicrotask(enhance);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.investigationBackEntry !== undefined) {
    const sheet = button.closest('#investigation-chooser-overlay .sheet');
    showEntry(sheet);
    return;
  }
  const kind = button.dataset.investigationEntry;
  if (!kind) return;
  const sheet = button.closest('#investigation-chooser-overlay .sheet');
  if (!sheet) return;
  if (kind === 'specific') {
    restoreCatalog(sheet, { specific:true });
    return;
  }
  if (kind === 'quick') {
    clickCatalogTarget(sheet, '[data-start-quick-investigation]');
    return;
  }
  if (kind === 'initial') {
    clickCatalogTarget(sheet, '[data-start-branching="investigacao_inicial"]');
    return;
  }
  if (kind === 'complete') {
    clickCatalogTarget(sheet, '[data-start-branching="investigacao_completa"]');
    return;
  }
  if (kind === 'master') clickCatalogTarget(sheet, '[data-start-root-by-title="Protocolo Mestre de Causa Raiz"]');
}, true);
