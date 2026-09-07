import assert from 'node:assert/strict';
import { reikiWorkspace } from './ui-v2/reiki/reiki-workspace.js';

function occurrences(source, text) {
  return source.split(text).length - 1;
}

const startHtml = reikiWorkspace({
  assistedName:'Marina',
  reikiEnabled:true,
  reiki:null,
}, { error:'' });
assert.match(startHtml, /Marina · Reiki/);
assert.match(startHtml, /Iniciar Reiki/);
assert.equal(occurrences(startHtml, 'Marina'), 1,
  'Reiki start must keep the Assisted in the sticky sheet context instead of repeating it in a body card.');
assert.doesNotMatch(startHtml, /<p class="v2-eyebrow">Assistido<\/p>/);

const activeHtml = reikiWorkspace({
  assistedName:'Marina',
  reikiEnabled:true,
  reiki:{
    id:'reiki_1', status:'RUNNING', assistedName:'Marina', modeLabel:'Presencial',
    elapsedSeconds:90, sessionId:'ses_1', belongsToCurrentSession:true, belongsToCurrentAssisted:true,
  },
}, { error:'' });
assert.match(activeHtml, /Marina · Reiki/);
assert.equal(occurrences(activeHtml, 'Marina'), 1,
  'Active Reiki must not repeat the Assisted below the sticky sheet header.');
assert.match(activeHtml, />Presencial<\/span>/);
assert.doesNotMatch(activeHtml, /Presencial · Marina/);

console.log('ui-v2-reiki-context-dedup.test.mjs: ok');
