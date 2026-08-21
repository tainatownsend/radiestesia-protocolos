import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRootProtocols } from './root-protocol-parser.mjs';

const sources=[
  {path:'../app.js',group:'Temas essenciais'},
  {path:'../protocols-v11-core.js',group:'Investigações profundas'},
  {path:'../protocols-v11-expansion.js',group:'Investigações profundas'},
  {path:'../protocols-v11-quick.js',group:'Protocolos rápidos'}
];

const catalog=[];
for(const source of sources){
  const text=fs.readFileSync(new URL(source.path,import.meta.url),'utf8');
  const parsed=parseRootProtocols(text,source);
  assert.ok(parsed.length>0,`${source.path} must yield at least one Fluxa protocol.`);
  catalog.push(...parsed);
}

const unique=[...new Map(catalog.map(item=>[item.id,item])).values()];
assert.equal(unique.length,19,'The root therapeutic library should reconstruct exactly 19 protocols.');

const names=new Set(unique.map(p=>p.name));
for(const name of [
  'Vida Financeira','Carreira / Profissional','Casamento / Relacionamento',
  'Protocolo Mestre de Causa Raiz','Autoestima, Amor-próprio e Merecimento',
  'Relacionamentos Familiares','Prosperidade e Abundância','Propósito e Caminho de Vida',
  'Casa e Ambiente','Relacionamento com o Próprio Corpo','Criatividade e Projetos',
  'Vida Social e Pertencimento','Parentalidade','Padrões Repetitivos',
  'Limpeza e Reequilíbrio','Reequilíbrio após um Dia Difícil',
  'Preparação para uma Decisão Importante','Encerramento de Ciclo','Reequilíbrio após Conflito'
]) assert.ok(names.has(name),`Missing migrated protocol: ${name}`);

const master=unique.find(p=>p.id==='root_master');
assert.ok(master,'Protocolo Mestre must keep the stable root_master id.');
assert.equal(master.category,'Protocolo Mestre');
assert.ok(Object.keys(master.nodes).length>10,'Protocolo Mestre should preserve its deep question tree.');

const finance=unique.find(p=>p.name==='Vida Financeira');
assert.ok(finance,'Vida Financeira should be migrated.');
assert.equal(finance.nodes.f_internal.yes,'f_beliefs','YES should enter the internal financial branch.');
assert.equal(finance.nodes.f_internal.no,'f_external','NO should skip internal descendants and continue at the next root branch.');
assert.equal(finance.nodes.f_beliefs.legacyPlanTitle,'Crenças limitantes financeiras');
assert.match(finance.nodes.f_beliefs.legacyPlanCommand,/crenças limitantes/i,'Treatment guidance from the root app should be preserved.');

const quick=unique.filter(p=>p.category==='Protocolos rápidos');
assert.equal(quick.length,5,'All five quick protocols should be available.');

const ids=unique.map(p=>p.id);
assert.equal(new Set(ids).size,ids.length,'Migrated protocol IDs must be unique.');

console.log(`root-protocol-parser.test.mjs: ok (${unique.length} protocols)`);
