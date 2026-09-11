import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nextRecommendation } from './ui-v2/state/selectors.js';

const reiki = {
  id:'reiki_1', assistedEntityId:'ast_marina', assistedName:'Marina', status:'PAUSED', modeLabel:'À distância',
  belongsToCurrentSession:true, belongsToCurrentAssisted:false,
};
const recommendation = nextRecommendation({
  session:{ id:'ses_1' }, prepared:true, assisted:{ id:'ast_joao', displayName:'João' }, baseline:{ id:'base_1' },
  reiki, treatments:[], openInvestigation:null, pendingFindings:[], treatmentFindings:[],
});
assert.equal(recommendation.code,'REIKI_CONTEXT');
assert.equal(recommendation.assistedEntityId,'ast_marina');
assert.equal(recommendation.label,'Voltar para Marina');
assert.match(recommendation.reason,/aplicação de Reiki pausada vinculada a Marina/);

const noCurrentAssisted = nextRecommendation({
  session:{ id:'ses_1' }, prepared:true, assisted:null, baseline:null,
  reiki, treatments:[], openInvestigation:null, pendingFindings:[], treatmentFindings:[],
});
assert.equal(noCurrentAssisted.code,'REIKI_CONTEXT','An active Reiki application must recover its assisted even if the session currently has no assisted selected.');

const index = fs.readFileSync(new URL('./ui-v2/index.js', import.meta.url), 'utf8');
assert.match(index,/nextActionCode === 'REIKI_CONTEXT'/);
assert.match(index,/selectSessionAssisted\(store, model\.nextActionAssistedId\);[\s\S]*openSheet\('reiki', source\);/,'The primary recommendation must restore context and open Reiki in one gesture.');
assert.match(index,/model\.reiki\?\.assistedEntityId && !model\.reiki\.belongsToCurrentAssisted[\s\S]*selectSessionAssisted\(store, model\.reiki\.assistedEntityId\)/,'The closing-flow Reiki action must also recover a mismatched assisted context.');

console.log('ui-v2-reiki-context-recovery.test.mjs: ok');
