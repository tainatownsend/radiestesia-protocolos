import assert from 'node:assert/strict';
import { findingsSummary } from './ui-v2/investigation/findings-summary.js';
import { triageFlow } from './ui-v2/investigation/triage-flow.js';
import { historyPage } from './ui-v2/history/history-page.js';
import { libraryPage } from './ui-v2/library/library-page.js';
import { reikiWorkspace } from './ui-v2/reiki/reiki-workspace.js';
import { settingsSheet } from './ui-v2/settings/settings-sheet.js';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';
import { closingFlow } from './ui-v2/session/closing-flow.js';
import { postCloseSummary } from './ui-v2/session/post-close-summary.js';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';
import { finalAssessment } from './ui-v2/treatment/final-assessment.js';
import { treatmentComposer } from './ui-v2/treatment/treatment-composer.js';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';
import { treatmentReview } from './ui-v2/treatment/treatment-review.js';
import { treatmentWorkspace } from './ui-v2/treatment/treatment-workspace.js';

const HTML_PAYLOAD = '<img src=x onerror=alert(1)>';
const ATTR_PAYLOAD = '" autofocus onfocus=alert(1) data-x="';
const ESCAPED_HTML_PAYLOAD = '&lt;img src=x onerror=alert(1)&gt;';
const ESCAPED_ATTR_PAYLOAD = '&quot; autofocus onfocus=alert(1) data-x=&quot;';

const component = {
  id: `cmp_${ATTR_PAYLOAD}`,
  name: HTML_PAYLOAD,
  status: 'IN_PROGRESS',
  due: true,
  manualReview: false,
  reviewable: true,
  commandCount: 1,
  graphCount: 1,
  commands: [{ text: HTML_PAYLOAD, graphs: [{ name: HTML_PAYLOAD, expectedEndAt: null }] }],
};

const treatment = {
  id: `trt_${ATTR_PAYLOAD}`,
  title: HTML_PAYLOAD,
  objective: HTML_PAYLOAD,
  status: 'IN_PROGRESS',
  modalities: [{ id:'CUSTOM_0', label:HTML_PAYLOAD }],
  total: 1,
  resolved: 0,
  unresolved: 1,
  components: [component],
  primaryAction: 'review',
  primaryLabel: HTML_PAYLOAD,
  reviewableCount: 1,
  readyForFinalAssessment: false,
};

const session = {
  id: `ses_${ATTR_PAYLOAD}`,
  status: 'CLOSED',
  startedAt: '2026-09-06T10:00:00.000Z',
  endedAt: '2026-09-06T11:00:00.000Z',
  assistedNames: [HTML_PAYLOAD],
  investigationOpened: 1,
  investigationCompleted: 1,
  treatmentsWorked: 1,
  findings: 1,
  notes: 1,
  longitudinal: [{ id:treatment.id, title:HTML_PAYLOAD, status:'IN_PROGRESS' }],
  closingNote: HTML_PAYLOAD,
  narrative: [{
    id:'narrative_1',
    kind:'event',
    title:HTML_PAYLOAD,
    detail:HTML_PAYLOAD,
    occurredAt:'2026-09-06T10:30:00.000Z',
    relatedCount:0,
    audit:[{ id:'audit_1', label:HTML_PAYLOAD, detail:HTML_PAYLOAD, occurredAt:'2026-09-06T10:30:00.000Z' }],
  }],
};

const model = {
  source:'live',
  sessionOpen:true,
  sessionId:'ses_live',
  sessionStartedAt:'2026-09-06T10:00:00.000Z',
  prepared:true,
  assistedSelected:true,
  assistedId:'ast_1',
  assistedName:HTML_PAYLOAD,
  assistedOptions:[{ id:`ast_${ATTR_PAYLOAD}`, name:HTML_PAYLOAD, type:'PERSON' }],
  title:HTML_PAYLOAD,
  description:HTML_PAYLOAD,
  hawkinsReady:true,
  hawkins:500,
  nextActionCode:'TREATMENT_REVIEW',
  nextActionTreatmentId:treatment.id,
  nextAction:HTML_PAYLOAD,
  nextReason:HTML_PAYLOAD,
  investigations:1,
  treatmentsWorked:1,
  treatmentCount:1,
  activeTreatments:1,
  treatments:[treatment],
  treatmentFindings:[{ id:`find_${ATTR_PAYLOAD}`, title:HTML_PAYLOAD }],
  modalityOptions:[{ id:`CUSTOM_${ATTR_PAYLOAD}`, label:HTML_PAYLOAD, base:false }],
  graphOptions:[HTML_PAYLOAD],
  reikiEnabled:true,
  reiki:{
    id:'reiki_1',
    sessionId:'ses_live',
    assistedEntityId:'ast_1',
    assistedName:HTML_PAYLOAD,
    belongsToCurrentSession:true,
    belongsToCurrentAssisted:true,
    status:'RUNNING',
    modeLabel:HTML_PAYLOAD,
    elapsedSeconds:60,
  },
  investigation:{ id:'inv_1', name:HTML_PAYLOAD, currentIndex:0, total:1, question:HTML_PAYLOAD, answers:[] },
  findings:[{ questionId:`question_${ATTR_PAYLOAD}`, title:HTML_PAYLOAD, selected:true }],
  safeClose:{
    assistedNames:[HTML_PAYLOAD],
    investigationOpened:1,
    investigationCompleted:1,
    pendingFindingCount:0,
    treatmentsWorked:1,
    findings:1,
    notes:1,
    longitudinal:[{ id:treatment.id, title:HTML_PAYLOAD, status:'IN_PROGRESS' }],
    activeReiki:null,
  },
  historySessions:[session],
  latestClosedSession:session,
  library:{
    counts:{ assisteds:1, protocols:1, resources:1, therapies:1 },
    assisteds:[{ id:'ast_1', name:HTML_PAYLOAD, typeLabel:HTML_PAYLOAD, birthDate:'2026-09-06', details:ATTR_PAYLOAD }],
    protocols:[{ id:'proto_1', name:HTML_PAYLOAD, category:HTML_PAYLOAD, description:HTML_PAYLOAD, source:HTML_PAYLOAD }],
    resources:[{ id:'res_1', name:HTML_PAYLOAD, type:'GRAPH', typeLabel:HTML_PAYLOAD, purpose:HTML_PAYLOAD, tags:[HTML_PAYLOAD] }],
    therapies:[{ id:'therapy_1', label:HTML_PAYLOAD, base:false }],
  },
  therapeuticSettings:{ enabled:[], custom:[HTML_PAYLOAD] },
  storageHealth:{ status:'OK', lastExportAt:null, canRecover:false },
};

const composerUi = {
  error:'',
  treatmentDraft:{
    title:HTML_PAYLOAD,
    objective:HTML_PAYLOAD,
    modalities:[`CUSTOM_${ATTR_PAYLOAD}`],
    findingIds:[`find_${ATTR_PAYLOAD}`],
    items:[{
      itemLabel:HTML_PAYLOAD,
      commands:[{
        text:HTML_PAYLOAD,
        graphApplications:[{ graphName:HTML_PAYLOAD, durationValue:'', durationUnit:'DAY' }],
      }],
    }],
  },
};

const surfaces = [
  ['session cockpit', sessionCockpit(model)],
  ['assisted picker', assistedPicker(model, {})],
  ['triage', triageFlow(model, {})],
  ['findings', findingsSummary(model, {})],
  ['treatment page', treatmentPage(model)],
  ['treatment composer', treatmentComposer(model, composerUi)],
  ['treatment workspace', treatmentWorkspace(model, { activeTreatmentId:treatment.id, error:'' })],
  ['treatment review', treatmentReview(model, { activeTreatmentId:treatment.id, reviewComponentId:component.id, error:'' })],
  ['final assessment', finalAssessment(model, { activeTreatmentId:treatment.id, error:'' })],
  ['reiki', reikiWorkspace(model, {})],
  ['closing', closingFlow(model, {})],
  ['post close', postCloseSummary(model, session.id)],
  ['history', historyPage(model, { historySessionId:session.id })],
  ['library assisteds', libraryPage(model, { librarySection:'assisteds' })],
  ['library protocols', libraryPage(model, { librarySection:'protocols' })],
  ['library resources', libraryPage(model, { librarySection:'resources' })],
  ['library therapies', libraryPage(model, { librarySection:'therapies' })],
  ['settings', settingsSheet(model, { error:'', importPreview:null })],
];

for (const [name, html] of surfaces) {
  assert.ok(html, `${name} should render markup for the security regression.`);
  assert.ok(!html.includes(HTML_PAYLOAD), `${name} rendered persisted HTML without escaping.`);
  assert.ok(!html.includes(ATTR_PAYLOAD), `${name} rendered an attribute-breaking payload without escaping.`);
}

const combined = surfaces.map(([, html]) => html).join('\n');
assert.match(combined, new RegExp(ESCAPED_HTML_PAYLOAD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Persisted text payload should survive as visible escaped text.');
assert.match(combined, new RegExp(ESCAPED_ATTR_PAYLOAD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Attribute payload should be entity-escaped rather than changing markup structure.');
assert.doesNotMatch(combined, /<img\s+src=x\s+onerror=/i);
assert.doesNotMatch(combined, /\sautofocus\s+onfocus=alert\(1\)\s+data-x="/i);

console.log('ui-v2-render-security.test.mjs: ok');
