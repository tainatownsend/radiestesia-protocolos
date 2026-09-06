import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveLibraryModel } from './ui-v2/library/library-model.js';
import { settingsSheet } from './ui-v2/settings/settings-sheet.js';

const state = {
  assistedEntities: [
    { id:'ast_1', type:'PERSON', displayName:'Marina', birthDate:'1990-01-01', archivedAt:null },
    { id:'ast_2', type:'PERSON', displayName:'Arquivada', birthDate:'1991-01-01', archivedAt:'2026-09-01T00:00:00.000Z' },
  ],
  tools: [
    { id:'tool_1', type:'GRAPH', name:'Desimpregnador', purpose:'Limpeza', tags:['limpeza'], status:'ACTIVE', archivedAt:null },
    { id:'tool_2', type:'GRAPH', name:'Antigo', status:'ARCHIVED', archivedAt:'2026-09-01T00:00:00.000Z' },
  ],
  customProtocols: [
    { id:'proto_custom', name:'Protocolo pessoal', category:'Personalizado', description:'Teste', archivedAt:null },
  ],
  settings: {
    therapeuticModalities: { enabled:['REIKI'], custom:['Aromaterapia'] },
  },
};

const model = deriveLibraryModel(state);
assert.equal(model.library.assisteds.length, 1);
assert.equal(model.library.assisteds[0].name, 'Marina');
assert.equal(model.library.resources.length, 1);
assert.equal(model.library.resources[0].name, 'Desimpregnador');
assert.ok(model.library.protocols.some((item) => item.name === 'Protocolo pessoal'));
assert.ok(model.library.therapies.some((item) => item.id === 'RADIESTHESIA' && item.base));
assert.ok(model.library.therapies.some((item) => item.id === 'REIKI'));
assert.ok(model.library.therapies.some((item) => item.label === 'Aromaterapia'));
assert.deepEqual(model.therapeuticSettings, { enabled:['REIKI'], custom:['Aromaterapia'] });

const deterministicHealth = { status:'PRIMARY_CORRUPT', canRecover:true, lastExportAt:'2026-09-06T10:00:00.000Z' };
const lockedSettingsHtml = settingsSheet({
  sessionOpen:true,
  storageHealth:deterministicHealth,
  therapeuticSettings:{ enabled:['REIKI'], custom:[] },
}, { error:'', importPreview:{ name:'backup.json', summary:{ sessions:2, assisteds:1, treatments:3, resources:4 } } });
assert.match(lockedSettingsHtml,/Importação e recuperação estão pausadas/);
assert.match(lockedSettingsHtml,/data-v2-settings-import-file disabled/,'Import file selection must be disabled during an active session.');
assert.match(lockedSettingsHtml,/data-v2-settings-recover disabled/,'Recovery must be disabled during an active session.');
assert.match(lockedSettingsHtml,/data-v2-settings-import-apply disabled/,'Applying a validated backup must remain disabled during an active session.');
assert.match(lockedSettingsHtml,/Dados locais precisam de recuperação/,'Fixture-provided storage health must drive the rendered status deterministically.');
assert.match(lockedSettingsHtml,/data-v2-settings-export/,'Export remains safe and available during a session.');

const unlockedSettingsHtml = settingsSheet({
  sessionOpen:false,
  storageHealth:deterministicHealth,
  therapeuticSettings:{ enabled:[], custom:[] },
}, { error:'', importPreview:null });
assert.doesNotMatch(unlockedSettingsHtml,/data-v2-settings-import-file disabled/);
assert.doesNotMatch(unlockedSettingsHtml,/data-v2-settings-recover disabled/);

const library = fs.readFileSync(new URL('./ui-v2/library/library-page.js', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('./ui-v2/settings/settings-sheet.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('./ui-v2/app-shell.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');

assert.match(library, /Assistidos/);
assert.match(library, /Protocolos/);
assert.match(library, /Gráficos & Recursos/);
assert.match(library, /Terapias/);
assert.match(library, /data-v2-library-search/);
assert.match(library, /data-v2-library-new-assisted/);
assert.match(shell, /libraryPage/);
assert.match(shell, /Object\.assign\(ui, fixtureUi/,'Fixture overlays must update controller bookkeeping through the same UI object.');
assert.doesNotMatch(shell, /Em migração/);

assert.match(settings, /Seus dados ficam neste dispositivo/);
assert.match(settings, /model\.storageHealth \|\| inspectStorageHealth\(\)/,'Settings fixtures must not leak live localStorage state.');
assert.match(settings, /Não há sincronização em nuvem ativa/);
assert.match(settings, /Última exportação concluída/);
assert.match(settings, /data-v2-settings-export/);
assert.match(settings, /data-v2-settings-import-file/);
assert.match(settings, /Prévia validada/);
assert.match(settings, /Terapias complementares/);

assert.match(index, /createAssistedEntity/);
assert.match(index, /validateImportPayload/);
assert.match(index, /exportLocalDataFile/);
assert.match(index, /recoverLocalData/);
assert.match(index, /deriveLibraryModel/);
assert.match(index, /data-v2-settings-import-apply/);
assert.match(index, /therapeuticModalities/);
assert.doesNotMatch(index, /MutationObserver/);
assert.doesNotMatch(index, /location\.reload/);
assert.match(html, /library-settings\.css/);

console.log('ui-v2-acervo-settings.test.mjs: ok');
