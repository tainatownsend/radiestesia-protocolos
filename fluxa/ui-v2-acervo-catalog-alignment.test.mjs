import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROOT_PROTOCOL_METADATA } from './ui-v2/library/root-protocol-metadata.js';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';

const repo=new URL('../',import.meta.url);
const sources=[
  {path:'app.js',group:'Temas essenciais'},
  {path:'marriage.js',group:'Temas essenciais'},
  {path:'protocols-v11-core.js',group:'Investigações profundas'},
  {path:'protocols-v11-expansion.js',group:'Investigações profundas'},
  {path:'protocols-v11-quick.js',group:'Protocolos rápidos'},
];
const mutations=['deep-tree.js','deep-tree-2.js'];
const parsed=[];
for(const source of sources){
  const text=fs.readFileSync(new URL(source.path,repo),'utf8');
  parsed.push(...parseRootProtocols(text,{path:`../${source.path}`,group:source.group}));
}
const unique=[];const ids=new Set();
for(const protocol of parsed){if(ids.has(protocol.id))continue;ids.add(protocol.id);unique.push(protocol);}
for(const path of mutations)applyRootProtocolMutations(unique,fs.readFileSync(new URL(path,repo),'utf8'));
const runtimeCatalog=finalizeRootProtocols(unique);

const runtimeMetadata=runtimeCatalog.map(({name,category})=>({name,category})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
const acervoMetadata=ROOT_PROTOCOL_METADATA.map(({name,category})=>({name,category})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
assert.deepEqual(acervoMetadata,runtimeMetadata,'V2 Acervo root metadata must stay aligned with the authoritative migrated protocol catalog.');

const starterLibrary=fs.readFileSync(new URL('./graph-starter-library.js',import.meta.url),'utf8');
assert.match(starterLibrary,/graph-starter-catalog\.js/,'Persistent starter seeding and V2 Acervo must share one graph-name source.');
assert.doesNotMatch(starterLibrary,/Object\.freeze\(\[\s*'Srim'/,'Starter graph names must not be duplicated inside the persistence module.');

console.log(`ui-v2-acervo-catalog-alignment.test.mjs: ok · ${acervoMetadata.length} root protocols`);
