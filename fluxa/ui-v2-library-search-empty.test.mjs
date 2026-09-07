import assert from 'node:assert/strict';
import fs from 'node:fs';
import { libraryPage } from './ui-v2/library/library-page.js';

const css = fs.readFileSync(new URL('./ui-v2/library-settings.css', import.meta.url), 'utf8');
assert.match(css,/\.v2-library-search-empty\s*\{[^}]*display:\s*none;/s,'Filtered-empty feedback must stay hidden until search removes every searchable row.');
assert.match(css,/:has\(\[data-v2-library-search-text\]\):not\(:has\(\[data-v2-library-search-text\]:not\(\[hidden\]\)\)\)\s+\.v2-library-search-empty/,'Search-empty feedback should react to rows hidden by the existing Acervo search controller.');

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
  assert.doesNotMatch(html,/<style(?:\s|>)/i,'Acervo rendering must not inject CSS into page markup.');
}

const empty = {
  library: { counts:{}, assisteds:[], protocols:[], resources:[], therapies:[] },
};
for (const section of ['assisteds','protocols','resources']) {
  const html = libraryPage(empty, { librarySection:section });
  assert.doesNotMatch(html,/Nenhum resultado encontrado/,'A genuinely empty catalog must not be mistaken for a filtered empty search.');
}

console.log('ui-v2-library-search-empty.test.mjs: ok');
