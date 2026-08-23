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
assert.ok(
  html.indexOf('ux-architecture-refresh.css') < html.indexOf('idle-home-premium.css'),
  'Idle Home must remain the final visual authority after the architecture refresh.'
);
assert.ok(
  html.indexOf('ux-architecture-loader.js') < html.indexOf('validation-round-ui.js'),
  'Validation/polish layers must remain able to refine the architecture shell after it loads.'
);

console.log('ux-architecture-refresh.test.mjs: ok');
