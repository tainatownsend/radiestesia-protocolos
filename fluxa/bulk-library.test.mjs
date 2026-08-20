import assert from 'node:assert/strict';
import { parseLibraryBulkText, prepareLibraryBulkImport, importLibraryItems } from './bulk-library.js';

const parsed=parseLibraryBulkText('Nome,Tipo,Finalidade,Observações\nDesimpregnador,Gráfico,Limpeza,Teste\nEscala A,Biômetro,Medição,');
assert.equal(parsed.items.length,2);
assert.equal(parsed.items[0].type,'GRAPH');
assert.equal(parsed.items[1].type,'BIOMETER');
assert.equal(parsed.items[0].purpose,'Limpeza');

const semicolon=parseLibraryBulkText('Nome;Tipo;Finalidade\nCampo X;Gráfico;Proteção');
assert.equal(semicolon.items[0].name,'Campo X');

const prepared=prepareLibraryBulkImport({tools:[{name:'Desimpregnador',archivedAt:null}]},[...parsed.items,{name:'Escala A',type:'BIOMETER'}]);
assert.equal(prepared.ready.length,1);
assert.equal(prepared.ready[0].name,'Escala A');
assert.equal(prepared.duplicates.length,2);

let state={tools:[],events:[]};
const store={
  nowIso:()=> '2026-08-20T12:00:00.000Z',
  makeId:(prefix)=>`${prefix}_${Math.random()}`,
  setState:(updater)=>{state=updater(state);return state;}
};
const created=importLibraryItems(store,[{name:'Gráfico 1',type:'GRAPH',purpose:'Teste'}]);
assert.equal(created.length,1);
assert.equal(state.tools.length,1);
assert.equal(state.events[0].metadata.bulkImport,true);
console.log('bulk-library.test.mjs: ok');
