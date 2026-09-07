import assert from 'node:assert/strict';
import fs from 'node:fs';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';

function activeTreatment(overrides = {}) {
  return {
    id:'trt_1', title:'Equilíbrio emocional', objective:'', status:'IN_PROGRESS',
    modalities:[{ id:'RADIESTHESIA', label:'Radiestesia' }], total:2, resolved:1,
    primaryAction:'review', primaryLabel:'Revisar', ...overrides,
  };
}

const base = {
  sessionOpen:true, assistedSelected:true, assistedName:'Marina', hawkinsReady:true,
  nextActionCode:'INVESTIGATE',
};

const activeHtml = treatmentPage({ ...base, treatments:[activeTreatment()] });
const reviewIndex = activeHtml.indexOf('>Revisar<');
const componentsIndex = activeHtml.indexOf('>Ver componentes<');
const historyIndex = activeHtml.indexOf('>Histórico<');
assert.ok(reviewIndex >= 0 && componentsIndex > reviewIndex && historyIndex > componentsIndex,
  'Active treatment actions must read primary → components → history.');
assert.match(activeHtml, /data-v2-treatment-action="review"/);
assert.match(activeHtml, /data-v2-treatment-action="workspace"/);
assert.match(activeHtml, /data-v2-route="history"/);

const lockedHtml = treatmentPage({ ...base, nextActionCode:'TRIAGE', treatments:[activeTreatment()] });
assert.doesNotMatch(lockedHtml, /data-v2-treatment-action="review"/,
  'A contiguous investigation must not expose a mutating review action.');
assert.match(lockedHtml, />Ver componentes</);
assert.match(lockedHtml, />Histórico</);
assert.match(lockedHtml, /Somente consulta por enquanto/);

const completedHtml = treatmentPage({
  ...base,
  treatments:[activeTreatment({ status:'COMPLETED', total:2, resolved:2, primaryAction:'workspace', primaryLabel:'Ver tratamento' })],
});
assert.match(completedHtml, />Ver tratamento</);
assert.match(completedHtml, />Histórico</);

const css = fs.readFileSync(new URL('./ui-v2/treatment.css', import.meta.url), 'utf8');
assert.match(css, /\.v2-treatment-history-link\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*justify-self:\s*start;/s,
  'History must render as a quiet tertiary row rather than competing with the main action.');
assert.match(css, /\.v2-treatment-card__actions--consult \.v2-helper\s*\{\s*grid-column:\s*1\s*\/\s*-1;/s);

console.log('ui-v2-treatment-action-hierarchy.test.mjs: ok');
