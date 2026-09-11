import assert from 'node:assert/strict';
import { deriveLibraryModel } from './ui-v2/library/library-model.js';
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

const assistedModel = deriveLibraryModel({
  assistedEntities:[
    { id:'pet_1', type:'PET', displayName:'Milo', archivedAt:null, details:'' },
    { id:'env_1', type:'ENVIRONMENT', displayName:'Casa', archivedAt:null, details:'Port Coquitlam' },
    { id:'person_1', type:'PERSON', displayName:'Marina', archivedAt:null, birthDate:'1990-01-02', details:'' },
  ],
  settings:{}, tools:[], customProtocols:[],
});
const assistedHtml = libraryPage(assistedModel, { librarySection:'assisteds' });
assert.match(assistedHtml,/class="v2-library-kind">Pet</,'Pet must be rendered as a human label instead of the raw PET enum.');
assert.match(assistedHtml,/Milo<\/strong><small>Pet<\/small>/,'A Pet without birth date must not be described as a missing person birth-date record.');
assert.match(assistedHtml,/Casa<\/strong><small>Port Coquitlam<\/small>/,'Non-person assisted details should provide the row summary when available.');
assert.match(assistedHtml,/Marina<\/strong><small>Nascimento · 02\/01\/1990<\/small>/);
assert.doesNotMatch(assistedHtml,/Milo<\/strong><small>Sem data de nascimento registrada/);

console.log('ui-v2-library-therapy-labels.test.mjs: ok');
