import assert from 'node:assert/strict';
import { hawkinsFlow } from './ui-v2/session/hawkins-flow.js';
import { sessionCockpit } from './ui-v2/session/session-cockpit.js';
import { finalAssessment } from './ui-v2/treatment/final-assessment.js';

const hawkinsHtml = hawkinsFlow({ assistedName: 'Marina' }, {});
assert.match(hawkinsHtml, /Calibração inicial de Hawkins/);
assert.match(hawkinsHtml, /Nível inicial de Hawkins/);
assert.doesNotMatch(hawkinsHtml, /\bHz\b/);

const cockpitHtml = sessionCockpit({
  sessionOpen: true,
  assistedSelected: true,
  assistedName: 'Marina',
  prepared: true,
  hawkinsReady: true,
  hawkins: 350,
  nextActionCode: 'INVESTIGATE',
  nextAction: 'Iniciar investigação',
  nextReason: 'Pronta para investigar.',
  treatmentCount: 0,
  investigations: 0,
  activeTreatments: 0,
  reikiEnabled: true,
  reiki: null,
});
assert.match(cockpitHtml, />Hawkins</);
assert.match(cockpitHtml, />350</);
assert.doesNotMatch(cockpitHtml, /350\s*Hz/);

const finalHtml = finalAssessment({
  assistedName: 'Marina',
  hawkins: 350,
  treatments: [{ id: 'T-1', title: 'Tratamento', resolved: 1, total: 1 }],
}, { activeTreatmentId: 'T-1', error: '' });
assert.match(finalHtml, /Calibração final/);
assert.match(finalHtml, /Nível final de Hawkins/);
assert.match(finalHtml, /Hawkins inicial desta sessão:\s*<strong>350<\/strong>/);
assert.doesNotMatch(finalHtml, /\bHz\b/);

console.log('ui-v2-hawkins-scale-copy.test.mjs: ok');
