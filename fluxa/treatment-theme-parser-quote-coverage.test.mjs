import assert from 'node:assert/strict';
import { matchesTreatmentThemeSearch, parseTreatmentPlans } from './treatment-theme-parser.js';

const doubleCall=parseTreatmentPlans('WORK:P("Produtividade consistente","Organizar trabalho e execução diária")','double-call.js');
assert.equal(doubleCall.length,1,'Double-quoted P/C treatment plans must remain discoverable.');
assert.equal(doubleCall[0].legacyId,'WORK');
assert.equal(doubleCall[0].title,'Produtividade consistente');
assert.equal(doubleCall[0].theme,'Carreira');
assert.equal(matchesTreatmentThemeSearch(doubleCall[0].search,'carreira produtividade'),true);

const doubleObject=parseTreatmentPlans('PLAN:{label:"Prosperidade sustentável",command:"Fortalecer relação consciente com dinheiro e recebimento"}','double-object.js');
assert.equal(doubleObject.length,1,'Double-quoted object treatment plans must remain discoverable.');
assert.equal(doubleObject[0].legacyId,'PLAN');
assert.equal(doubleObject[0].theme,'Financeiro');
assert.equal(matchesTreatmentThemeSearch(doubleObject[0].search,'prosperidade financeiro'),true);

const escaped=parseTreatmentPlans('ESC:P("Limites profissionais","Trabalhar \\"visibilidade\\" sem abandonar limites")','escaped.js');
assert.equal(escaped.length,1,'Escaped quotes inside double-quoted plans must not truncate the plan.');
assert.equal(escaped[0].command,'Trabalhar "visibilidade" sem abandonar limites');

const mixedCall=parseTreatmentPlans('MIX:P(\'Direção profissional\',"Fortalecer confiança no trabalho")','mixed-call.js');
assert.equal(mixedCall.length,1,'Mixed quote styles inside P/C treatment plans must remain discoverable.');
assert.equal(mixedCall[0].legacyId,'MIX');
assert.equal(mixedCall[0].theme,'Carreira');

const mixedObject=parseTreatmentPlans('OBJ:{label:"Receber com tranquilidade",command:\'Trabalhar prosperidade e dinheiro\'}','mixed-object.js');
assert.equal(mixedObject.length,1,'Mixed quote styles inside object treatment plans must remain discoverable.');
assert.equal(mixedObject[0].legacyId,'OBJ');
assert.equal(mixedObject[0].theme,'Financeiro');

const reversedObject=parseTreatmentPlans('REV:{command:"Fortalecer autonomia profissional",label:"Direção e carreira"}','reversed-object.js');
assert.equal(reversedObject.length,1,'Object treatment plans must remain discoverable when command appears before label.');
assert.equal(reversedObject[0].legacyId,'REV');
assert.equal(reversedObject[0].title,'Direção e carreira');
assert.equal(reversedObject[0].theme,'Carreira');

const metadataObject=parseTreatmentPlans(`META:{
  label:'Prosperidade com segurança',
  category:'finance',
  enabled:true,
  command:"Fortalecer prosperidade, dinheiro e capacidade de receber"
}`,'metadata-object.js');
assert.equal(metadataObject.length,1,'Harmless metadata between label and command must not hide a treatment plan.');
assert.equal(metadataObject[0].legacyId,'META');
assert.equal(metadataObject[0].theme,'Financeiro');
assert.equal(matchesTreatmentThemeSearch(metadataObject[0].search,'financeiro segurança'),true);

const duplicateFallback=parseTreatmentPlans('ONE:{label:"Carreira estável",command:"Fortalecer trabalho consistente"}','dedupe-object.js');
assert.equal(duplicateFallback.length,1,'Fallback object parsing must not duplicate plans already matched by the strict parser.');

const quotedFields=parseTreatmentPlans(`JSON_PLAN:{
  "label":"Pertencimento com segurança",
  "command":"Fortalecer confiança social e pertencimento"
}`,'quoted-fields.js');
assert.equal(quotedFields.length,1,'JSON-style quoted label/command keys must remain discoverable.');
assert.equal(quotedFields[0].legacyId,'JSON_PLAN');
assert.equal(quotedFields[0].theme,'Vida social e pertencimento');

const quotedPlanKey=parseTreatmentPlans(`"financial-plan":{
  'label':'Receber com merecimento',
  'command':'Fortalecer prosperidade e capacidade de receber'
}`,'quoted-plan-key.js');
assert.equal(quotedPlanKey.length,1,'Quoted legacy plan keys must remain discoverable.');
assert.equal(quotedPlanKey[0].legacyId,'financial-plan');
assert.equal(quotedPlanKey[0].id,'quoted-plan-key.js:financial-plan');
assert.equal(quotedPlanKey[0].theme,'Financeiro');

const quotedCallKey=parseTreatmentPlans(`"career-plan":P(
  'Direção profissional consistente',
  "Fortalecer carreira, trabalho e reconhecimento"
)`,'quoted-call-key.js');
assert.equal(quotedCallKey.length,1,'Quoted legacy plan keys must remain discoverable for P/C call-style plans.');
assert.equal(quotedCallKey[0].legacyId,'career-plan');
assert.equal(quotedCallKey[0].id,'quoted-call-key.js:career-plan');
assert.equal(quotedCallKey[0].theme,'Carreira');

const singleQuotedCallKey=parseTreatmentPlans(`'social plan':C(
  "Pertencimento com segurança",
  'Fortalecer confiança social e vínculos saudáveis'
)`,'single-quoted-call-key.js');
assert.equal(singleQuotedCallKey.length,1,'Single-quoted call-style plan IDs with spaces must remain discoverable.');
assert.equal(singleQuotedCallKey[0].legacyId,'social plan');
assert.equal(singleQuotedCallKey[0].theme,'Vida social e pertencimento');

const trailingMetadata=parseTreatmentPlans(`META_CALL:P(
  'Prosperidade com consistência',
  "Fortalecer dinheiro, prosperidade e capacidade de receber",
  true,
  30,
  'legacy-note'
)`,'trailing-metadata.js');
assert.equal(trailingMetadata.length,1,'Harmless trailing scalar metadata must not hide a call-style treatment plan.');
assert.equal(trailingMetadata[0].legacyId,'META_CALL');
assert.equal(trailingMetadata[0].title,'Prosperidade com consistência');
assert.equal(trailingMetadata[0].theme,'Financeiro');
assert.equal(matchesTreatmentThemeSearch(trailingMetadata[0].search,'financeiro consistencia'),true);

console.log('treatment-theme-parser-quote-coverage.test.mjs: ok');
