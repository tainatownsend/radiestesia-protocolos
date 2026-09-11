import assert from 'node:assert/strict';
import { hawkinsFlow } from './ui-v2/session/hawkins-flow.js';
import { preparationFlow } from './ui-v2/session/preparation-flow.js';
import { assistedPicker } from './ui-v2/session/assisted-picker.js';
import { triageFlow } from './ui-v2/investigation/triage-flow.js';
import { findingsSummary } from './ui-v2/investigation/findings-summary.js';
import { treatmentComposer } from './ui-v2/treatment/treatment-composer.js';
import { treatmentWorkspace } from './ui-v2/treatment/treatment-workspace.js';

function occurrences(source, text) {
  return source.split(text).length - 1;
}

const hawkinsHtml = hawkinsFlow({ assistedName:'Marina' }, { error:'' });
assert.match(hawkinsHtml, /Marina · Hawkins/);
assert.match(hawkinsHtml, /Calibração inicial de Hawkins/);
assert.equal(occurrences(hawkinsHtml, 'Marina'), 1,
  'Hawkins must expose the Assisted once in the sheet context instead of repeating it in the body.');
assert.doesNotMatch(hawkinsHtml, /\bHz\b/,
  'Assisted Hawkins is a scale level and must never be rendered as Hz.');

const preparationHtml = preparationFlow({
  preparation:{ step:2, total:4, stepKey:'frequency', frequency:540, frequencyValid:true, protection:'', permission:'' },
}, { error:'' });
assert.match(preparationHtml, /<strong>Hz<\/strong>/,
  'Therapist preparation frequency keeps its explicit Hz unit; the Hawkins rule must not erase this distinct measurement.');

const assistedHtml = assistedPicker({
  assistedOptions:[{ id:'ast_1', name:'Marina', type:'PERSON' }],
}, { assistedCreate:false, error:'' });
assert.match(assistedHtml, /Sessão em andamento · Assistido/);
assert.match(assistedHtml, /Quem você vai atender\?/);
assert.doesNotMatch(assistedHtml, /<h3>Selecione o Assistido<\/h3>/,
  'The Assisted picker must not repeat the selection instruction below an equivalent sheet title.');

const createAssistedHtml = assistedPicker({ assistedOptions:[] }, { assistedCreate:true, error:'' });
assert.match(createAssistedHtml, /Sessão · Assistido/);
assert.match(createAssistedHtml, /Adicionar pessoa/);
assert.doesNotMatch(createAssistedHtml, /Nova pessoa[\s\S]*Pessoa[\s\S]*Quem será atendido/,
  'A one-step Assisted form must not simulate extra progress and heading layers.');

const triageHtml = triageFlow({
  assistedName:'Marina',
  investigation:{
    name:'Triagem rápida', currentIndex:1, total:3,
    question:'Existe algum fator emocional prioritário?',
  },
}, { error:'' });
assert.match(triageHtml, /Marina · Investigação/);
assert.equal(occurrences(triageHtml, 'Marina'), 1,
  'Triage must keep the Assisted in the sheet context instead of repeating the name above the question.');
assert.equal(occurrences(triageHtml, 'Triagem rápida'), 1,
  'The investigation name belongs to the sheet title and must not be duplicated in progress metadata.');
assert.match(triageHtml, /Pergunta 2 de 3/);
assert.match(triageHtml, /Salvo automaticamente/);

const findingsHtml = findingsSummary({
  assistedName:'Marina',
  findings:[{ questionId:'q1', title:'Fator emocional prioritário' }],
}, { error:'' });
assert.match(findingsHtml, /Marina · Investigação concluída/);
assert.match(findingsHtml, /Revisar achados/);
assert.equal(occurrences(findingsHtml, 'Marina'), 1,
  'Findings must keep the Assisted in the sheet context instead of repeating it in the body.');
assert.doesNotMatch(findingsHtml, /O que foi encontrado/,
  'The findings body must not add a second heading below the sheet title.');

const composerHtml = treatmentComposer({
  assistedName:'Marina',
  modalityOptions:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  graphOptions:['Decágono'],
  treatmentFindings:[],
  library:{ resources:[] },
}, {
  error:'',
  treatmentDraft:{
    title:'', objective:'', modalities:[], findingIds:[],
    items:[{ itemLabel:'', commands:[{ text:'', graphApplications:[{ graphName:'', durationValue:'', durationUnit:'DAY' }] }] }],
  },
});
assert.match(composerHtml, /Marina · Tratamento/);
assert.match(composerHtml, /Novo tratamento/);
assert.doesNotMatch(composerHtml, /<p class="v2-eyebrow">Tratamento<\/p>/,
  'Treatment context must live in the sheet header, not be repeated as a body eyebrow.');

const workspaceHtml = treatmentWorkspace({
  assistedName:'Marina', nextActionCode:'INVESTIGATE',
  treatments:[{
    id:'trt_1', title:'Equilíbrio emocional', objective:'Apoiar estabilidade.',
    status:'IN_PROGRESS', primaryAction:'review', primaryLabel:'Revisar',
    total:2, resolved:1,
    components:[{
      id:'cmp_1', name:'Crença', status:'IN_PROGRESS', commandCount:1, graphCount:1,
      commands:[{ text:'Neutralizar', graphs:[{ name:'Decágono', expectedEndAt:null }] }],
      reviewable:true,
    }],
  }],
}, { activeTreatmentId:'trt_1', error:'' });
assert.match(workspaceHtml, /Marina · Tratamento/);
assert.equal(occurrences(workspaceHtml, 'Equilíbrio emocional'), 1,
  'Treatment title must appear in the sheet title once, not again inside the progress block.');
assert.match(workspaceHtml, /Apoiar estabilidade\./);

console.log('ui-v2-context-dedup.test.mjs: ok');
