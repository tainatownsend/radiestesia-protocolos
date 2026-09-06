import assert from 'node:assert/strict';
import { libraryPage } from './ui-v2/library/library-page.js';

const html = libraryPage({
  library:{
    therapies:[
      { id:'RADIESTHESIA', label:'Radiestesia', base:true },
      { id:'REIKI', label:'Aplicação de Reiki', base:false },
    ],
  },
}, { librarySection:'therapies' });

assert.match(html,/class="v2-library-kind">Base</);
assert.match(html,/class="v2-library-kind">Ativa</);
assert.doesNotMatch(html,/class="v2-library-kind">BASE</);
assert.doesNotMatch(html,/class="v2-library-kind">ATIVA</);

console.log('ui-v2-library-therapy-labels.test.mjs: ok');
