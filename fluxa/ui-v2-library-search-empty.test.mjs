import assert from 'node:assert/strict';
import { libraryPage } from './ui-v2/library/library-page.js';

const populated = {
  library: {
    counts:{ assisteds:1, protocols:1, resources:1, therapies:1 },
    assisteds:[{ name:'José', typeLabel:'Pessoa', birthDate:'1990-01-01', details:'' }],
    protocols:[{ name:'Limpeza', category:'Energia', description:'Teste', source:'Fluxa' }],
    resources:[{ name:'Luxor', typeLabel:'Gráfico', purpose:'Harmonização', tags:['energia'] }],
    therapies:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  },
};

for (const section of ['assisteds','protocols','resources']) {
  const html = libraryPage(populated, { librarySection:section });
  assert.match(html,/data-v2-library-search/);
  assert.match(html,/v2-library-search-empty/);
  assert.match(html,/Nenhum resultado encontrado/);
  assert.match(html,/:has\(\[data-v2-library-search-text\]\)/,'Search-empty feedback should react to rows hidden by the existing Acervo search controller.');
}

const empty = {
  library: { counts:{}, assisteds:[], protocols:[], resources:[], therapies:[] },
};
for (const section of ['assisteds','protocols','resources']) {
  const html = libraryPage(empty, { librarySection:section });
  assert.doesNotMatch(html,/Nenhum resultado encontrado/,'A genuinely empty catalog must not be mistaken for a filtered empty search.');
}

console.log('ui-v2-library-search-empty.test.mjs: ok');
