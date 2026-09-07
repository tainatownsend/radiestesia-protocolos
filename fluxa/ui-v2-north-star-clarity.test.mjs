import assert from 'node:assert/strict';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { settingsSheet } from './ui-v2/settings/settings-sheet.js';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';

const cockpitHtml = sessionCockpit({
  sessionOpen: true,
  assistedSelected: true,
  assistedName: 'Marina',
  prepared: true,
  hawkinsReady: true,
  hawkins: 350,
  nextActionCode: 'INVESTIGATE',
  nextAction: 'Iniciar investigação',
  nextReason: 'Pré-requisitos concluídos.',
  activeTreatments: 1,
  investigations: 0,
  treatmentCount: 0,
  reikiEnabled: false,
});
assert.match(cockpitHtml, />Hawkins</, 'The Hawkins value must stay attached to an explicit Hawkins label.');
assert.match(cockpitHtml, />350</, 'The compact session context must expose the recorded Hawkins level.');
assert.doesNotMatch(cockpitHtml, /350\s*Hz/, 'The Hawkins scale must not be mislabeled as frequency in Hz.');

const lockedTreatmentHtml = treatmentPage({
  sessionOpen: true,
  assistedSelected: true,
  assistedName: 'Marina',
  hawkinsReady: true,
  nextActionCode: 'TRIAGE',
  treatments: [{
    id: 'trt_1',
    title: 'Equilíbrio emocional',
    objective: '',
    status: 'IN_PROGRESS',
    modalities: [{ id:'RADIESTHESIA', label:'Radiestesia' }],
    total: 2,
    resolved: 1,
    primaryAction: 'review',
    primaryLabel: 'Revisar',
  }],
});
assert.match(lockedTreatmentHtml, /Ver componentes/);
assert.match(lockedTreatmentHtml, /Somente consulta por enquanto/);
assert.doesNotMatch(lockedTreatmentHtml, /data-v2-treatment-action="review"/, 'Locked workflow must not expose a mutating treatment action.');

const blockingCloseModel = {
  assistedName: 'Marina',
  findings: [],
  safeClose: {
    assistedNames: ['Marina'],
    investigationOpened: 0,
    investigationCompleted: 0,
    treatmentsWorked: 1,
    findings: 0,
    notes: 0,
    longitudinal: [],
    activeReiki: { status:'PAUSED', assistedName:'Marina' },
  },
};
const blockedClosingHtml = closingFlow(blockingCloseModel, { error:'' });
assert.doesNotMatch(blockedClosingHtml, /data-v2-closing-confirmation/, 'Closing note must not be shown while closure is blocked because it would be discarded during recovery.');
assert.match(blockedClosingHtml, /Abrir Reiki para concluir/);

const readyCloseModel = structuredClone(blockingCloseModel);
readyCloseModel.safeClose.activeReiki = null;
const readyClosingHtml = closingFlow(readyCloseModel, { error:'' });
assert.match(readyClosingHtml, /data-v2-closing-confirmation/);
assert.match(readyClosingHtml, /Encerrar sessão/);

const settingsHtml = settingsSheet({
  sessionOpen: true,
  storageHealth: { status:'OK', canRecover:false, lastExportAt:null },
  therapeuticSettings: { enabled:[], custom:[] },
}, { error:'', importPreview:null });
assert.match(settingsHtml, /Importação e recuperação estão pausadas/);
assert.match(settingsHtml, /<button class="v2-btn v2-btn--ghost" type="button" disabled>Selecionar backup para importar<\/button>/);
assert.doesNotMatch(settingsHtml, /data-v2-settings-import-file/, 'A locked import control must not remain as a visually active file label.');

console.log('ui-v2-north-star-clarity.test.mjs: ok');
