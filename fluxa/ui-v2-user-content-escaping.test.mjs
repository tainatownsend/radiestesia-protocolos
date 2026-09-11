import assert from 'node:assert/strict';
import { mobileSheet } from './ui-v2/components/mobile-sheet.js';
import { findingsSummary } from './ui-v2/investigation/findings-summary.js';
import { triageFlow } from './ui-v2/investigation/triage-flow.js';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';
import { hawkinsFlow } from './ui-v2/session/hawkins-flow.js';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';
import { postCloseSummary } from './ui-v2/session/post-close-summary.js';
import { treatmentComposer } from './ui-v2/treatment/treatment-composer.js';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';
import { treatmentWorkspace } from './ui-v2/treatment/treatment-workspace.js';
import { libraryPage } from './ui-v2/library/library-page.js';
import { historyPage } from './ui-v2/history/history-page.js';
import { settingsSheet } from './ui-v2/settings/settings-sheet.js';

const hostile = '<svg/onload=alert(1)>';
const escaped = '&lt;svg/onload=alert(1)&gt;';

function assertSafe(label, html) {
  assert.doesNotMatch(html, /<svg\b/i, `${label} must not render a user-supplied SVG element`);
  assert.match(html, new RegExp(escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${label} must preserve hostile text only as escaped content`);
}

assertSafe('MobileSheet title/error', mobileSheet({
  eyebrow: hostile,
  title: hostile,
  body: '<p>trusted renderer body</p>',
  primaryLabel: hostile,
  error: hostile,
}));

assertSafe('Assistido picker', assistedPicker({
  assistedOptions: [{ id: hostile, name: hostile, type: 'PERSON' }],
}, { error: '' }));

assertSafe('Hawkins flow', hawkinsFlow({ assistedName: hostile }, { error: hostile }));

assertSafe('Session cockpit', sessionCockpit({
  sessionOpen: true,
  assistedSelected: true,
  assistedName: hostile,
  description: hostile,
  prepared: true,
  hawkinsReady: true,
  hawkins: 540,
  nextAction: hostile,
  nextActionCode: 'INVESTIGATE',
  nextReason: hostile,
  investigations: 0,
  treatmentCount: 0,
  activeTreatments: 0,
  reikiEnabled: false,
  reiki: null,
}));

assertSafe('Investigation triage', triageFlow({
  assistedName: hostile,
  investigation: {
    currentIndex: 0,
    total: 1,
    name: hostile,
    question: hostile,
  },
}, { error: hostile }));

assertSafe('Investigation findings', findingsSummary({
  assistedName: hostile,
  findings: [{ questionId: hostile, title: hostile }],
}, { error: hostile }));

assertSafe('Treatment composer', treatmentComposer({
  assistedName: hostile,
  modalityOptions: [{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  graphOptions: [],
  treatmentFindings: [],
  library: { resources: [] },
}, {
  error:'',
  treatmentDraft:{
    title:hostile,
    objective:hostile,
    modalities:[], findingIds:[],
    items:[{ itemLabel:hostile, commands:[{ text:hostile, graphApplications:[{ graphName:hostile, durationValue:'', durationUnit:'DAY' }] }] }],
  },
}));

assertSafe('Treatment list', treatmentPage({
  sessionOpen: true,
  assistedSelected: true,
  assistedName: hostile,
  hawkinsReady: true,
  nextActionCode: 'INVESTIGATE',
  treatments: [{
    id: hostile,
    title: hostile,
    objective: hostile,
    status: 'PLANNED',
    total: 1,
    resolved: 0,
    modalities: [{ label: hostile }],
    primaryAction: 'start',
    primaryLabel: hostile,
  }],
}));

assertSafe('Treatment workspace', treatmentWorkspace({
  assistedName: hostile,
  nextActionCode: 'INVESTIGATE',
  treatments: [{
    id: 'trt_1',
    title: hostile,
    objective: hostile,
    status: 'IN_PROGRESS',
    total: 1,
    resolved: 0,
    primaryAction: 'workspace',
    primaryLabel: hostile,
    components: [{
      id: hostile,
      name: hostile,
      status: 'IN_PROGRESS',
      commandCount: 1,
      graphCount: 1,
      reviewable: false,
      commands: [{ text: hostile, graphs: [{ name: hostile, expectedEndAt: null }] }],
    }],
  }],
}, { activeTreatmentId: 'trt_1', error: '' }));

assertSafe('Acervo', libraryPage({
  library: {
    assisteds: [{ name: hostile, type:'OTHER', typeLabel: hostile, birthDate: '', details:hostile }],
  },
}, { librarySection: 'assisteds' }));

assertSafe('History', historyPage({
  historySessions: [{
    id: 'ses_1',
    status: 'CLOSED',
    assistedNames: [hostile],
    startedAt: '2026-09-06T10:00:00.000Z',
    endedAt: '2026-09-06T11:00:00.000Z',
    investigationOpened: 0,
    investigationCompleted: 0,
    treatmentsWorked: 0,
    findings: 0,
    notes: 1,
    closingNote: hostile,
    longitudinal: [],
    narrative: [{
      id: 'evt_1',
      title: hostile,
      detail: hostile,
      occurredAt: '2026-09-06T10:30:00.000Z',
      relatedCount: 0,
      audit: [{ label: hostile, detail: hostile, occurredAt: '2026-09-06T10:30:00.000Z' }],
    }],
  }],
}, { historySessionId: 'ses_1' }));

assertSafe('Post-close summary', postCloseSummary({
  historySessions: [{
    id: 'ses_1',
    assistedNames: [hostile],
    startedAt: '2026-09-06T10:00:00.000Z',
    endedAt: '2026-09-06T11:00:00.000Z',
    investigationCompleted: 0,
    treatmentsWorked: 0,
    findings: 0,
    closingNote: hostile,
    longitudinal: [{ title: hostile, assistedName: hostile, status: 'PLANNED' }],
  }],
}, 'ses_1'));

assertSafe('Settings', settingsSheet({
  sessionOpen: false,
  storageHealth: { status: 'OK', lastExportAt: null, canRecover: false },
  therapeuticSettings: { enabled: [], custom: [hostile] },
}, {
  error: hostile,
  importPreview: { name: hostile, summary: { sessions: 1, assisteds: 1, treatments: 1, resources: 1 } },
}));

console.log('ui-v2-user-content-escaping.test.mjs: ok');
