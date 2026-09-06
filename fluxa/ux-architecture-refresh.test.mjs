import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

const loader = read('./ux-architecture-loader.js');
const workspace = read('./workspace-shell-ui.js');
const acervo = read('./acervo-ui.js');
const investigation = read('./investigation-entry-ui.js');
const assisted = read('./assisted-summary-ui.js');
const pickers = read('./operational-pickers-ui.js');
const cockpit = read('./session-cockpit-close-ui.js');
const html = read('./index.html');
const reconciliation = read('./visual-reconciliation.css');

// Architecture loader: the refresh must remain a single ordered entry point.
for (const moduleName of [
  'workspace-shell-ui.js',
  'workspace-layout-fix.js',
  'acervo-ui.js',
  'investigation-entry-ui.js',
  'assisted-summary-ui.js',
  'operational-pickers-ui.js',
  'session-cockpit-close-ui.js'
]) {
  assert.match(loader, new RegExp(`import ['\"]\\./${moduleName.replaceAll('.', '\\.')}`), `Architecture loader must import ${moduleName}.`);
}

// 1. Primary navigation and settings separation.
for (const label of ['Hoje', 'Tratamentos', 'Histórico', 'Acervo']) {
  assert.match(workspace, new RegExp(`['\"]${label}['\"]`), `Primary workspace navigation must include ${label}.`);
}
assert.match(workspace, /data-workspace-route/);
assert.match(workspace, /data-open-workspace-settings/);
assert.match(workspace, /removeLibraryPreferences\(\)/, 'Practice configuration must not remain mixed into the legacy Library surface.');
assert.match(workspace, /settings\.therapeuticModalities/, 'Therapeutic modality settings must preserve the existing store shape.');

// 2. Acervo must remain split into focused work areas instead of one long mixed Library.
for (const sectionName of ['Assistidos', 'Protocolos', 'Gráficos & Recursos', 'Terapias']) {
  assert.match(acervo, new RegExp(sectionName.replace('&', '&')), `Acervo must expose ${sectionName}.`);
}
assert.match(acervo, /data-acervo-search="resources"/);
assert.match(acervo, /data-resource-filter="ALL"/);
assert.match(acervo, /data-resource-filter="FAVORITES"/);
assert.match(acervo, /localStorage\.getItem\(FAVORITES_KEY\)/, 'Resource favorites remain a local UI preference.');
assert.match(acervo, /settings\?\.therapeuticModalities/, 'Terapias must be derived dynamically from configured modalities.');

// 3. Investigation entry must gate the full catalog behind an explicit specific-protocol choice.
for (const kind of ['quick', 'initial', 'complete', 'specific', 'master']) {
  assert.match(investigation, new RegExp(`data-investigation-entry=\\"${kind}\\"`), `Investigation entry must include ${kind}.`);
}
assert.match(investigation, /Protocolo Mestre de Causa Raiz/);
assert.match(investigation, /if \(kind === 'specific'\)[\s\S]*restoreCatalog\(sheet, \{ specific:true \}\)/, 'The full catalog must be restored only from the specific-protocol choice.');
assert.match(investigation, /data-start-quick-investigation/);
assert.match(investigation, /data-start-branching="investigacao_inicial"/);
assert.match(investigation, /data-start-branching="investigacao_completa"/);

// 4. Assisted detail must be longitudinal, tabbed, and scoped to the active Assisted.
for (const label of ['Resumo', 'Histórico', 'Tratamentos', 'Investigações', 'Relatórios']) {
  assert.match(assisted, new RegExp(`['\"]${label}['\"]`), `Assisted detail must include ${label}.`);
}
assert.match(assisted, /event\.assistedEntityId === activeAssistedId/);
assert.match(assisted, /item\.assistedEntityId === activeAssistedId/);
assert.match(assisted, /if \(latestSession\) metrics\.push/, 'Summary should render meaningful metrics conditionally instead of zero-heavy placeholders.');
assert.match(assisted, /if \(frequency\) metrics\.push/);

// 5. Operational selectors must stay dense/searchable with favorites and recents.
for (const filter of ['ALL', 'FAVORITES', 'RECENT']) {
  assert.match(pickers, new RegExp(`data-operational-picker-filter=\\"${filter}\\"`), `Operational picker must expose ${filter}.`);
}
assert.match(pickers, /recentToolIds/);
assert.match(pickers, /recentProtocols/);
assert.match(pickers, /data-recent-protocol-id/);
assert.match(pickers, /pickerFilter = 'ALL'/, 'Opening a picker must not inherit a stale restrictive filter.');

// 6. Session cockpit and closing review must summarize work while preserving safe-close semantics.
assert.match(cockpit, /data-session-live-stats/);
assert.match(cockpit, /investigations:uniqueEntityCount/);
assert.match(cockpit, /treatments:uniqueEntityCount/);
assert.match(cockpit, /Hawkins atual/);
assert.match(cockpit, /O progresso fica preservado para retomada em outra sessão\./, 'Open investigations must be described as resumable.');
assert.match(cockpit, /Tratamentos ativos não bloqueiam o encerramento da sessão/, 'Longitudinal treatments must not block session closing.');
assert.match(cockpit, /#close-session-form/, 'The architecture layer must enhance, not replace, the canonical safe-close form.');
assert.match(cockpit, /Confirmo que realizei meu procedimento de encerramento/);
assert.match(cockpit, /Encerrar sessão com segurança/);

// Shell wiring and visual cascade guardrails.
assert.match(html, /src="ux-architecture-loader\.js"/);
assert.match(html, /href="ux-architecture-refresh\.css"/);
assert.match(html, /href="visual-reconciliation\.css"/);
assert.ok(
  html.indexOf('ux-architecture-refresh.css') < html.indexOf('idle-home-premium.css'),
  'Idle Home must remain able to refine architecture-specific presentation.'
);
assert.ok(
  html.indexOf('idle-home-premium.css') < html.indexOf('visual-reconciliation.css'),
  'Visual reconciliation must be the final style authority during the identity validation round.'
);
assert.ok(
  html.indexOf('ux-architecture-loader.js') < html.indexOf('validation-round-ui.js'),
  'Validation/polish layers must remain able to refine the architecture shell after it loads.'
);

// Deep Teal source-of-truth guardrails for the validation surfaces.
for (const token of ['#EFF1EF','#F8F9F7','#DEE4E1','#173F46','#102F35','#66898C','#C17C61','#202729','#606B6C','#CBD3D1']) {
  assert.ok(reconciliation.includes(token), `Visual reconciliation must preserve approved Deep Teal token ${token}.`);
}
assert.match(reconciliation, /body\.fluxa-home-idle \.hero-card/, 'Idle Hoje must have a deliberate Deep Teal hero treatment.');
assert.match(reconciliation, /topbar-session-open/, 'Open-session cockpit must retain a Deep Teal operational shell.');
assert.match(reconciliation, /\.treatment-card/, 'Treatments must participate in the reconciled visual system.');
assert.match(reconciliation, /:focus-visible[\s\S]*outline:3px solid var\(--fluxa-coral\)/, 'Keyboard focus must remain visibly anchored in the approved palette.');
assert.match(reconciliation, /@media\(prefers-reduced-motion:reduce\)/, 'The staged premium visual system must respect reduced-motion preferences.');
assert.match(reconciliation, /transition-duration:\.01ms!important/, 'Reduced-motion mode must suppress decorative transitions without hiding state changes.');
assert.doesNotMatch(reconciliation, /font-family\s*:\s*Georgia/i, 'Fluxa brand treatment must not fall back to the improvised serif wordmark.');

console.log('ux-architecture-refresh.test.mjs: ok');
