import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const shell = await read('./workspace-shell-ui.js');
const session = await read('./session-cockpit-close-ui.js');
const acervo = await read('./acervo-ui.js');
const preparation = await read('./structured-preparation-ui.js');
const reikiOutside = await read('./reiki-outside-ui.js');
const round2 = await read('./validation-round-2-ui.js');
const catalog = await read('./therapeutic-catalog-ui.js');
const index = await read('./index.html');

assert.match(shell, /data-open-workspace-settings/);
assert.match(shell, /Configurações/);
assert.match(shell, /M9\.7 3\.4h4\.6/,'Settings control should use a cog silhouette, not a sun/light-mode icon.');

assert.match(session, /data-session-assisted-prompt/);
assert.match(session, /Selecionar ou cadastrar Assistido/);
assert.match(session, /data-action="choose-assisted"/);
assert.match(session, /latestPreparation/,'Assisted prompt should only appear after session preparation is complete.');
assert.match(session, /Sessão em andamento/,'Assisted prompt must be restricted to the session Home.');

assert.match(acervo, /data-acervo-protocol=/,'Protocol rows must be interactive.');
assert.match(acervo, /protocolDetailView/,'Acervo must expose protocol details.');
assert.match(acervo, /data-acervo-protocol-back/);
assert.match(acervo, /Usar em uma investigação/);

assert.match(reikiOutside, /therapeuticModalities/,'Standalone Reiki must read the configured modalities.');
assert.match(reikiOutside, /enabled\.includes\('REIKI'\)/,'Standalone Reiki must be gated by the Reiki practice setting.');
assert.match(reikiOutside, /main\.querySelector\('\[data-reiki-outside\]'\)\?\.remove\(\)/,'Disabled Reiki must be removed from Home.');

assert.match(preparation, /data-prep-protection-select/,'Preparation should use a compact resource selector.');
assert.match(preparation, /Gráfico não listado/);
assert.match(preparation, /data-prep-add-unlisted-acervo/,'An unlisted graph should be optionally addable to Acervo.');
assert.match(preparation, /createTool\(/,'Adding an unlisted protection graph should reuse the shared tool library.');
assert.doesNotMatch(preparation, />Proteção utilizada \/ observações</,'The old free-text protection field should not be visible.');
assert.match(preparation, /data-prep-mantra-select/,'Preparation should select mantra/permission from Acervo.');
assert.match(preparation, /data-prep-mantra-preview/,'Selected mantra text should be visible immediately below the selector.');

assert.match(round2, /Mantras \/ permissões/,'Acervo should expose a mantra/permission category.');
assert.match(round2, /mantrasPermissions/,'Mantras should persist in local settings.');
assert.match(round2, /data-home-treatment-continuity/,'Home should expose treatment continuity for the current assisted person.');
assert.match(round2, /Próximos passos/,'Home should explain relevant treatment next steps.');
assert.match(round2, /isSessionHome/,'The assisted prompt guard should be scoped to the session Home.');

assert.match(catalog, /protocol-stable-overlay/,'Root protocol answers should reuse a stable overlay.');
assert.doesNotMatch(catalog, /function rootDialog\(\)\{\s*document\.querySelector\('#root-protocol-overlay'\)\?\.remove/,'Root protocol dialog must not be destroyed before every answer.');
assert.match(catalog, /peers\?\.forEach\(x=>x\.disabled=true\)/,'Binary answer buttons should guard against double taps while the next question is rendered.');

const protocolSources = [
  await read('../app.js'),
  await read('../marriage.js'),
  await read('../protocols-v11-core.js'),
  await read('../protocols-v11-expansion.js'),
  await read('../protocols-v11-quick.js'),
  await read('../deep-tree.js'),
  await read('../deep-tree-2.js')
];
const openQuestionStarters = /^(?:qual(?:is)?\b|como\b|onde\b|por que\b|o que\b|quem\b)/i;
const openQuestions=[];
for (const source of protocolSources) {
  const patterns=[/[Qq]\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'((?:\\.|[^'])*)'/g];
  for(const pattern of patterns) for(const match of source.matchAll(pattern)) {
    const question=match[1].replace(/\\'/g,"'").trim();
    if(openQuestionStarters.test(question)) openQuestions.push(question);
  }
}
assert.deepEqual(openQuestions,[],'Protocol source questions should be binary whenever the source is not a numeric/quantity biometer prompt.');

const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
assert.ok(styles.includes('ux-validation-hotfix.css'));
assert.ok(styles.includes('validation-round-2.css'));
assert.match(index, /validation-round-2-ui\.js/);
assert.equal(styles.at(-1),'idle-home-premium.css','Idle Home must remain last in the visual cascade.');

console.log('ux-validation-hotfix.test.mjs: ok');
