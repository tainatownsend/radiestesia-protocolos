import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';

const repo=new URL('../',import.meta.url);
const sources=[
  {path:'app.js',group:'Temas essenciais'},
  {path:'marriage.js',group:'Temas essenciais'},
  {path:'protocols-v11-core.js',group:'Investigações profundas'},
  {path:'protocols-v11-expansion.js',group:'Investigações profundas'},
  {path:'protocols-v11-quick.js',group:'Protocolos rápidos'}
];
const mutations=['deep-tree.js','deep-tree-2.js'];
const parsed=[];
for(const source of sources){
  const text=fs.readFileSync(new URL(source.path,repo),'utf8');
  parsed.push(...parseRootProtocols(text,{path:`../${source.path}`,group:source.group}));
}
const unique=[];const ids=new Set();
for(const protocol of parsed){if(ids.has(protocol.id))continue;ids.add(protocol.id);unique.push(protocol);}
for(const path of mutations){applyRootProtocolMutations(unique,fs.readFileSync(new URL(path,repo),'utf8'));}
const catalog=finalizeRootProtocols(unique);

assert.ok(catalog.length>=18,`Expected at least 18 migrated protocols, got ${catalog.length}.`);
const byName=new Map(catalog.map(p=>[p.name,p]));
for(const name of [
  'Vida Financeira','Carreira / Profissional','Casamento / Relacionamento','Protocolo Mestre de Causa Raiz',
  'Autoestima, Amor-próprio e Merecimento','Relacionamentos Familiares','Prosperidade e Abundância',
  'Propósito e Caminho de Vida','Casa e Ambiente','Relacionamento com o Próprio Corpo','Criatividade e Projetos',
  'Vida Social e Pertencimento','Parentalidade','Padrões Repetitivos','Limpeza e Reequilíbrio',
  'Reequilíbrio após um Dia Difícil','Preparação para uma Decisão Importante','Encerramento de Ciclo','Reequilíbrio após Conflito'
]) assert.ok(byName.has(name),`Migrated catalog missing ${name}.`);

const master=byName.get('Protocolo Mestre de Causa Raiz');
assert.equal(master.id,'root_master');
assert.ok(Object.values(master.nodes).filter(n=>n.type==='QUESTION').length>=10,'Master protocol should retain a meaningful deep question tree.');

const finance=byName.get('Vida Financeira');
const financeQuestions=Object.values(finance.nodes).filter(n=>n.type==='QUESTION');
assert.ok(financeQuestions.length>=20,'Finance protocol should preserve its expanded investigation tree.');
assert.ok(financeQuestions.some(n=>n.legacyPlanCommand),'Migrated questions should retain treatment commands.');
assert.ok(financeQuestions.some(n=>n.no!==n.yes),'Conditional branches must preserve distinct Yes/No routing.');

const quick=byName.get('Limpeza e Reequilíbrio');
assert.equal(quick.category,'Protocolos rápidos');
assert.ok(Object.values(quick.nodes).filter(n=>n.type==='QUESTION').length>=5,'Quick protocols should preserve their short question set.');

for(const protocol of catalog){
  assert.ok(protocol.startNodeId&&protocol.nodes[protocol.startNodeId],`${protocol.name} must have a valid start node.`);
  for(const node of Object.values(protocol.nodes)){
    if(node.type!=='QUESTION')continue;
    assert.ok(protocol.nodes[node.yes],`${protocol.name}/${node.id} has invalid YES target ${node.yes}.`);
    assert.ok(protocol.nodes[node.no],`${protocol.name}/${node.id} has invalid NO target ${node.no}.`);
  }
}

const adapter=fs.readFileSync(new URL('fluxa/legacy-protocol-adapter.js',repo),'utf8');
assert.match(adapter,/requirePreparedAssistedSessionState\(draft,inv\.currentSessionId,inv\.assistedEntityId,[^)]*continuar/i,'Root protocol answering must require the investigation assisted context.');
assert.match(adapter,/requirePreparedAssistedSessionState\(draft,inv\.currentSessionId,inv\.assistedEntityId,[^)]*achados/i,'Finding consolidation must require the investigation assisted context.');

console.log(`root-protocol-runtime.test.mjs: ok (${catalog.length} protocols)`);
