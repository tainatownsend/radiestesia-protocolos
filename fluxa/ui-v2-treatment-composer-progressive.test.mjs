import assert from 'node:assert/strict';
import { treatmentComposer } from './ui-v2/treatment/treatment-composer.js';

const model = {
  assistedName:'Marina',
  modalityOptions:[
    { id:'RADIESTHESIA', label:'Radiestesia', base:true },
    { id:'REIKI', label:'Aplicação de Reiki', base:false },
  ],
  graphOptions:['Desimpregnador','Decágono','Turbilhão'],
  treatmentFindings:[{ id:'find_1', title:'Fator prioritário' }],
  library:{ resources:[] },
};

const completeItem = (label, command, graph) => ({
  itemLabel:label,
  commands:[{ text:command, graphApplications:[{ graphName:graph, durationValue:'', durationUnit:'DAY' }] }],
});

const complexHtml = treatmentComposer(model, {
  error:'',
  treatmentDraft:{
    title:'Equilíbrio emocional',
    objective:'Apoiar estabilidade e clareza.',
    modalities:['REIKI'],
    findingIds:['find_1'],
    items:[
      completeItem('Crença de escassez','Neutralizar','Desimpregnador'),
      completeItem('Medo de mudança','Fortalecer segurança','Decágono'),
    ],
  },
});

assert.match(complexHtml, /class="v2-composer-context"/,'Name and objective should remain a compact unnumbered context block.');
assert.equal((complexHtml.match(/class="v2-section-number"/g) || []).length, 2, 'The composer should expose only the two user decisions: Composição and Itens.');
assert.match(complexHtml, /class="v2-section-number">1<\/div>[\s\S]*?>Composição</);
assert.match(complexHtml, /class="v2-section-number">2<\/div>[\s\S]*?>Itens</);
assert.doesNotMatch(complexHtml, /class="v2-section-number">[34]<\/div>/,'Context and summary must not become extra workflow steps.');
assert.match(complexHtml, /Salvar como planejado/);
assert.match(complexHtml, /Iniciar tratamento/);
assert.equal((complexHtml.match(/class="v2-treatment-item"[^>]*\sopen/g) || []).length, 1, 'A populated composer should keep only one treatment item expanded.');
assert.match(complexHtml, /data-v2-treatment-item-index="0"\sopen/,'When every item is complete, the first item is the compact default workspace.');
assert.doesNotMatch(complexHtml, /data-v2-treatment-item-index="1"\sopen/);

const pendingHtml = treatmentComposer(model, {
  error:'',
  treatmentDraft:{
    title:'Equilíbrio emocional', objective:'', modalities:[], findingIds:[],
    items:[
      completeItem('Crença de escassez','Neutralizar','Desimpregnador'),
      { itemLabel:'', commands:[{ text:'', graphApplications:[{ graphName:'', durationValue:'', durationUnit:'DAY' }] }] },
    ],
  },
});
assert.equal((pendingHtml.match(/class="v2-treatment-item"[^>]*\sopen/g) || []).length, 1);
assert.match(pendingHtml, /data-v2-treatment-item-index="1"\sopen/,'A newly added or incomplete item should become the single expanded workspace.');
assert.doesNotMatch(pendingHtml, /data-v2-treatment-item-index="0"\sopen/);

console.log('ui-v2-treatment-composer-progressive.test.mjs: ok');
