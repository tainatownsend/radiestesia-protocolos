import assert from 'node:assert/strict';
import { inferTreatmentTheme } from './treatment-theme-parser.js';
import { suggestProtocolsForAreas,recordOrientingAssessment } from './assessment-protocol-handoff.js';

assert.equal(inferTreatmentTheme('Sobrecarga na maternidade','Harmonizar relação com os filhos'),'Parentalidade');
assert.equal(inferTreatmentTheme('Autoimagem corporal','Fortalecer aceitação do corpo'),'Corpo e autoimagem');
assert.equal(inferTreatmentTheme('Pertencimento social','Fortalecer vínculos de amizade'),'Vida social e pertencimento');
assert.equal(inferTreatmentTheme('Encerramento de ciclo','Apoiar transição para uma nova fase'),'Ciclos e transições');

const catalog=[
  {id:'finance',name:'Vida Financeira',category:'Temas essenciais'},
  {id:'prosperity',name:'Prosperidade e Abundância',category:'Investigações profundas'},
  {id:'career',name:'Carreira / Profissional',category:'Temas essenciais'},
  {id:'purpose',name:'Propósito e Caminho de Vida',category:'Investigações profundas'},
  {id:'relationship',name:'Casamento / Relacionamento',category:'Temas essenciais'},
  {id:'family',name:'Relacionamentos Familiares',category:'Investigações profundas'},
  {id:'master',name:'Protocolo Mestre de Causa Raiz',category:'Protocolo Mestre'}
];
assert.deepEqual(
  suggestProtocolsForAreas(['finance','career','relationship','family'],catalog,4).map(item=>item.protocolId),
  ['finance','career','relationship','family'],
  'When several areas are selected, each area should receive a specific first suggestion before secondary protocols consume the limit.'
);
assert.deepEqual(
  suggestProtocolsForAreas(['unclear','finance'],catalog,4).map(item=>item.protocolId),
  ['master'],
  'The suggestion layer must treat an unclear focus as a Master Protocol route rather than mixing it with specific areas.'
);

function fakeStore(){let seq=0;let state={sessions:[{id:'s1',status:'OPEN',currentAssistedEntityId:'a1'}],preparationRuns:[{id:'p1',sessionId:'s1',status:'COMPLETED'}],assistedEntities:[{id:'a1',displayName:'Pessoa'}],assessments:[],investigations:[],events:[]};return{getState:()=>state,setState(fn){state=structuredClone(fn(state));return state;},makeId(prefix){seq+=1;return `${prefix}_${seq}`;},nowIso(){return `2026-08-22T20:00:${String(seq).padStart(2,'0')}Z`;}};}
const store=fakeStore();
const assessment=recordOrientingAssessment(store,{sessionId:'s1',assistedEntityId:'a1',focusAreas:['finance','career','relationship','family']},catalog);
assert.equal(assessment.protocolSuggestions.length,4,'Recorded assessment should expand its suggestion limit to preserve one suggestion per selected area when possible.');
assert.deepEqual(assessment.protocolSuggestions.map(item=>item.protocolId),['finance','career','relationship','family']);
assert.throws(()=>recordOrientingAssessment(fakeStore(),{sessionId:'s1',assistedEntityId:'a1',focusAreas:['unclear','finance']},catalog),/deve ser usado sozinho/i,'The domain must reject the contradictory combination of unclear plus specific focus areas.');

console.log('therapeutic-discovery-completeness.test.mjs: ok');
