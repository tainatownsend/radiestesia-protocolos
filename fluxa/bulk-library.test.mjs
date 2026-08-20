import assert from 'node:assert/strict';
import { parseLibraryBulkText, prepareLibraryBulkImport, importLibraryItems, libraryItemsToCsv } from './bulk-library.js';

const parsed=parseLibraryBulkText('Nome,Tipo,Finalidade,Observações\nDesimpregnador,Gráfico,Limpeza,Teste\nEscala A,Biômetro,Medição,');
assert.equal(parsed.items.length,2);
assert.equal(parsed.items[0].type,'GRAPH');
assert.equal(parsed.items[1].type,'BIOMETER');
assert.equal(parsed.items[0].purpose,'Limpeza');

const semicolon=parseLibraryBulkText('Nome;Tipo;Finalidade\nCampo X;Gráfico;Proteção');
assert.equal(semicolon.items[0].name,'Campo X');

const pasted=parseLibraryBulkText('Gráfico A\nGráfico B\nGráfico C');
assert.deepEqual(pasted.items.map((item)=>item.name),['Gráfico A','Gráfico B','Gráfico C']);
assert.ok(pasted.items.every((item)=>item.type==='GRAPH'));

const tabbed=parseLibraryBulkText('Nome\tTipo\tFinalidade\nEscala Z\tBiômetro\tMedição');
assert.equal(tabbed.items[0].name,'Escala Z');
assert.equal(tabbed.items[0].type,'BIOMETER');

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

const csv=libraryItemsToCsv([
  {name:'Campo, especial',type:'GRAPH',purpose:'Proteção',notes:'Usar "duas" vezes',archivedAt:null},
  {name:'Escala B',type:'BIOMETER',purpose:'Medição',notes:null,archivedAt:null},
  {name:'Antigo',type:'OTHER',archivedAt:'2026-08-01T00:00:00Z'}
]);
const roundTrip=parseLibraryBulkText(csv);
assert.equal(roundTrip.items.length,2);
assert.equal(roundTrip.items.find((item)=>item.name==='Campo, especial')?.notes,'Usar "duas" vezes');
assert.equal(roundTrip.items.find((item)=>item.name==='Escala B')?.type,'BIOMETER');
assert.ok(!roundTrip.items.some((item)=>item.name==='Antigo'));

console.log('bulk-library.test.mjs: ok');
