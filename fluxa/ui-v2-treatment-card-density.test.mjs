import assert from 'node:assert/strict';
import { treatmentPage } from './ui-v2/treatment/treatment-page.js';

const html = treatmentPage({
  sessionOpen:true,
  assistedSelected:true,
  assistedName:'Marina',
  hawkinsReady:true,
  nextActionCode:'INVESTIGATE',
  treatments:[{
    id:'trt_1', title:'Equilíbrio emocional', objective:'Apoiar estabilidade.',
    status:'IN_PROGRESS', total:2, resolved:1,
    modalities:[{ id:'RADIESTHESIA', label:'Radiestesia' }],
    primaryAction:'review', primaryLabel:'Revisar',
  }],
});

assert.match(html, /class="v2-progress-count" aria-label="1 de 2 componentes resolvidos">1\/2<\/span>/,
  'Compact treatment progress must remain accessible without a second visible progress sentence.');
assert.doesNotMatch(html, /<span>1 de 2 componentes resolvidos<\/span>/,
  'Treatment cards must not repeat the same progress already shown by the compact count.');
assert.match(html, /<div class="v2-treatment-meta"><span>Radiestesia<\/span><\/div>/,
  'Treatment metadata should reserve its visible line for composition context.');

console.log('ui-v2-treatment-card-density.test.mjs: ok');
