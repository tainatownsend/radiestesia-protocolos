import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ORIENTING_ASSESSMENT_AREAS, suggestProtocolsForAreas } from './assessment-protocol-handoff.js';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';

const sources=[
  {path:'../app.js',group:'Temas essenciais'},
  {path:'../marriage.js',group:'Temas essenciais'},
  {path:'../protocols-v11-core.js',group:'Investigações profundas'},
  {path:'../protocols-v11-expansion.js',group:'Investigações profundas'},
  {path:'../protocols-v11-quick.js',group:'Protocolos rápidos'}
];
const mutations=['../deep-tree.js','../deep-tree-2.js'];
const parsed=[];
for(const source of sources){
  parsed.push(...parseRootProtocols(fs.readFileSync(new URL(source.path,import.meta.url),'utf8'),source));
}
const unique=[...new Map(parsed.map(item=>[item.id,item])).values()];
for(const path of mutations) applyRootProtocolMutations(unique,fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog=finalizeRootProtocols(unique);

assert.equal(catalog.length,19,'Assessment integration should run against the complete 19-protocol catalog.');
for(const area of ORIENTING_ASSESSMENT_AREAS){
  const suggestions=suggestProtocolsForAreas([area.id],catalog,6);
  assert.ok(suggestions.length>0,`Orienting area ${area.id} must resolve to at least one real protocol.`);
  for(const suggestion of suggestions){
    assert.ok(catalog.some(protocol=>protocol.id===suggestion.protocolId),`Suggestion ${suggestion.protocolId} for ${area.id} must exist in the real catalog.`);
    assert.ok(suggestion.protocolName,'Assessment suggestions must carry a stable visible protocol name.');
  }
}

assert.deepEqual(
  suggestProtocolsForAreas(['finance'],catalog).map(item=>item.protocolName),
  ['Vida Financeira','Prosperidade e Abundância'],
  'Finance handoff must preserve the intended specific-first ordering against production content.'
);
assert.deepEqual(
  suggestProtocolsForAreas(['career'],catalog).map(item=>item.protocolName),
  ['Carreira / Profissional','Propósito e Caminho de Vida'],
  'Career handoff must preserve both operational and purpose-oriented paths.'
);
assert.equal(suggestProtocolsForAreas(['unclear'],catalog)[0]?.protocolName,'Protocolo Mestre de Causa Raiz','Unclear focus must resolve to the real Master protocol.');

console.log('assessment-real-catalog-integration.test.mjs: ok');
