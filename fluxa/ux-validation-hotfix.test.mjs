import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('./workspace-shell-ui.js', import.meta.url), 'utf8');
const session = await readFile(new URL('./session-cockpit-close-ui.js', import.meta.url), 'utf8');
const acervo = await readFile(new URL('./acervo-ui.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');

assert.match(shell, /data-open-workspace-settings/);
assert.match(shell, /Configurações/);
assert.match(shell, /M12 3\.4/,'Settings control should use a cog silhouette, not a sun/light-mode icon.');

assert.match(session, /data-session-assisted-prompt/);
assert.match(session, /Selecionar ou cadastrar Assistido/);
assert.match(session, /data-action="choose-assisted"/);
assert.match(session, /latestPreparation/,'Assisted prompt should only appear after session preparation is complete.');

assert.match(acervo, /data-acervo-protocol=/,'Protocol rows must be interactive.');
assert.match(acervo, /protocolDetailView/,'Acervo must expose protocol details.');
assert.match(acervo, /data-acervo-protocol-back/);
assert.match(acervo, /Usar em uma investigação/);

const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
assert.ok(styles.includes('ux-validation-hotfix.css'));
assert.equal(styles.at(-1),'idle-home-premium.css','Idle Home must remain last in the visual cascade.');

console.log('ux-validation-hotfix.test.mjs: ok');
