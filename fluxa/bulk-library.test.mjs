import assert from 'node:assert/strict';
import { parseLibraryBulkText, prepareLibraryBulkImport, importLibraryItems, libraryItemsToCsv } from './bulk-library.js';

const parsed=parseLibraryBulkText('Nome,Tipo,Finalidade,Tags,Observações\nDesimpregnador,Gráfico,Limpeza,"limpeza, proteção",Teste\nEscala A,Biômetro,Medição,"escala, medição",');
assert.equal(parsed.items.length,2);
assert.equal(parsed.items[0].type,'GRAPH');
assert.equal(parsed.items[1].type,'BIOMETER');
assert.equal(parsed.items[0].purpose,'Limpeza');
assert.deepEqual(parsed.items[0].tags,['limpeza','proteção']);

const semicolon=parseLibraryBulkText('Nome;Tipo;Finalidade;Tags\nCampo X;Gráfico;Proteção;proteção');
assert.equal(semicolon.items[0].name,'Campo X');
assert.deepEqual(semicolon.items[0].tags,['proteção']);

const pasted=parseLibraryBulkText('Gráfico A\nGráfico B\nGráfico C');
assert.deepEqual(pasted.items.map((item)=>item.name),['Gráfico A','Gráfico B','Gráfico C']);
assert.ok(pasted.items.every((item)=>item.type==='GRAPH'));

const tabbed=parseLibraryBulkText('Nome\tTipo\tFinalidade\tTags\nEscala Z\tBiômetro\tMedição\tescala, frequência');
assert.equal(tabbed.items[0].name,'Escala Z');
assert.equal(tabbed.items[0].type,'BIOMETER');
assert.deepEqual(tabbed.items[0].tags,['escala','frequência']);

const prepared=prepareLibraryBulkImport({tools:[{name:'Desimpregnador',archivedAt:null}]},[...parsed.items,{name:'Escala A',type:'BIOMETER'}]);
assert.equal(prepared.ready.length,1);
assert.equal(prepared.ready[0].name,'Escala A');
assert.equal(prepared.duplicates.length,2);

let state={tools:[],events:[]};
let sequence=0;
const store={nowIso:()=> '2026-08-20T12:00:00.000Z',makeId:(prefix)=>`${prefix}_${++sequence}`,setState:(updater)=>{state=updater(state);return state;}};
const created=importLibraryItems(store,[{name:'Gráfico 1',type:'GRAPH',purpose:'Teste',tags:['Proteção','proteção','Limpeza']}]);
assert.equal(created.length,1);
assert.equal(state.tools.length,1);
assert.deepEqual(state.tools[0].tags,['Proteção','Limpeza']);
assert.deepEqual(state.events[0].metadata.tags,['Proteção','Limpeza']);
assert.equal(state.events[0].metadata.bulkImport,true);

const csv=libraryItemsToCsv([
  {name:'Campo, especial',type:'GRAPH',purpose:'Proteção',tags:['proteção','campo'],notes:'Usar "duas" vezes\nConfirmar novamente depois',archivedAt:null},
  {name:'Escala B',type:'BIOMETER',purpose:'Medição',tags:['escala','medição'],notes:null,archivedAt:null},
  {name:'Antigo',type:'OTHER',tags:['antigo'],archivedAt:'2026-08-01T00:00:00Z'}
]);
assert.match(csv,/Nome,Tipo,Finalidade,Tags,Observações/);
const roundTrip=parseLibraryBulkText(csv);
assert.equal(roundTrip.errors.length,0);
assert.equal(roundTrip.items.length,2);
assert.equal(roundTrip.items.find((item)=>item.name==='Campo, especial')?.notes,'Usar "duas" vezes\nConfirmar novamente depois');
assert.deepEqual(roundTrip.items.find((item)=>item.name==='Campo, especial')?.tags,['proteção','campo']);
assert.equal(roundTrip.items.find((item)=>item.name==='Escala B')?.type,'BIOMETER');
assert.ok(!roundTrip.items.some((item)=>item.name==='Antigo'));

const multilineInput='Nome,Tipo,Finalidade,Tags,Observações\n"Campo, complexo",Gráfico,Proteção,"campo, proteção","Linha 1\nLinha 2, com vírgula\nLinha 3 com ""aspas"""\nEscala C,Biômetro,Medição,escala,Fim';
const multiline=parseLibraryBulkText(multilineInput);
assert.equal(multiline.errors.length,0);
assert.equal(multiline.items.length,2);
assert.equal(multiline.items[0].name,'Campo, complexo');
assert.equal(multiline.items[0].notes,'Linha 1\nLinha 2, com vírgula\nLinha 3 com "aspas"');
assert.equal(multiline.items[1].sourceLine,5,'source line must follow physical lines even after a multiline quoted record');

const malformed=parseLibraryBulkText('Nome,Tipo,Observações\nA,Gráfico,"texto sem fim');
assert.match(malformed.errors.join(' '),/aspas não fechadas/i);

const largeTools=Array.from({length:500},(_,index)=>({
  name:`Recurso ${String(index+1).padStart(3,'0')}`,
  type:index%3===0?'BIOMETER':(index%3===1?'GRAPH':'OTHER'),
  purpose:`Finalidade ${index%7}`,
  tags:[`tag-${index%11}`,'escala'],
  notes:index%10===0?`Observação ${index}\nsegunda linha`:null,
  archivedAt:null
}));
const largeCsv=libraryItemsToCsv(largeTools);
const largeRoundTrip=parseLibraryBulkText(largeCsv);
assert.equal(largeRoundTrip.errors.length,0);
assert.equal(largeRoundTrip.items.length,500,'large synthetic Library must survive CSV export/import intact');
assert.equal(new Set(largeRoundTrip.items.map((item)=>item.name)).size,500);
assert.equal(largeRoundTrip.items.find((item)=>item.name==='Recurso 001')?.notes,'Observação 0\nsegunda linha');
const largePrepared=prepareLibraryBulkImport({tools:[]},largeRoundTrip.items);
assert.equal(largePrepared.ready.length,500);
assert.equal(largePrepared.duplicates.length,0);

console.log('bulk-library.test.mjs: ok');
