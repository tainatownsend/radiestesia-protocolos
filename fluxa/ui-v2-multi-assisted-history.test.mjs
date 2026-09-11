import assert from 'node:assert/strict';
import { deriveHistoryModel } from './ui-v2/history/history-model.js';
import { historyPage } from './ui-v2/history/history-page.js';

const state = {
  sessions:[{
    id:'ses_multi', status:'CLOSED', startedAt:'2026-09-06T10:00:00.000Z', endedAt:'2026-09-06T11:00:00.000Z',
    currentAssistedEntityId:'ast_marina',
  }],
  assistedEntities:[
    { id:'ast_marina', displayName:'Marina', archivedAt:null },
    { id:'ast_joao', displayName:'João', archivedAt:null },
  ],
  investigations:[
    {
      id:'inv_marina', currentSessionId:'ses_multi', assistedEntityId:'ast_marina', status:'COMPLETED',
      protocolSnapshot:{ name:'Triagem rápida' }, answers:[{ questionId:'q_m', answer:'NO' }],
    },
    {
      id:'inv_joao', currentSessionId:'ses_multi', assistedEntityId:'ast_joao', status:'COMPLETED',
      protocolSnapshot:{ name:'Triagem rápida' }, answers:[{ questionId:'q_j', answer:'YES' }],
    },
  ],
  findings:[{ id:'find_j', investigationId:'inv_joao', sourceQuestionId:'q_j', assistedEntityId:'ast_joao', status:'IDENTIFIED' }],
  treatments:[
    { id:'trt_marina', assistedEntityId:'ast_marina', title:'Equilíbrio', status:'IN_PROGRESS' },
    {
      id:'trt_joao', assistedEntityId:'ast_joao', title:'Integração', status:'PLANNED',
      plannedInSessionId:'ses_multi', plannedAt:'2026-09-06T10:35:00.000Z',
    },
  ],
  treatmentComponents:[
    { id:'cmp_m1', treatmentId:'trt_marina', name:'M1', status:'COMPLETED' },
    { id:'cmp_m2', treatmentId:'trt_marina', name:'M2', status:'IN_PROGRESS' },
    { id:'cmp_j1', treatmentId:'trt_joao', name:'J1', status:'PLANNED' },
  ],
  reikiApplications:[], closingRuns:[],
  events:[
    {
      id:'evt_inv_m', eventType:'INVESTIGATION_COMPLETED', entityType:'Investigation', entityId:'inv_marina',
      sessionId:'ses_multi', assistedEntityId:'ast_marina', occurredAt:'2026-09-06T10:10:00.000Z', metadata:{ protocolName:'Triagem rápida' },
    },
    {
      id:'evt_inv_j', eventType:'INVESTIGATION_COMPLETED', entityType:'Investigation', entityId:'inv_joao',
      sessionId:'ses_multi', assistedEntityId:'ast_joao', occurredAt:'2026-09-06T10:20:00.000Z', metadata:{ protocolName:'Triagem rápida' },
    },
    {
      id:'evt_trt_m', eventType:'TREATMENT_STARTED', entityType:'Treatment', entityId:'trt_marina',
      sessionId:'ses_multi', assistedEntityId:'ast_marina', occurredAt:'2026-09-06T10:30:00.000Z', metadata:{},
    },
    {
      id:'evt_note_j', eventType:'NOTE_CREATED', entityType:'Note', entityId:'note_joao',
      sessionId:'ses_multi', assistedEntityId:'ast_joao', occurredAt:'2026-09-06T10:40:00.000Z', metadata:{ body:'Revisar limites' },
    },
  ],
};

const model = deriveHistoryModel(state);
const session = model.latestClosedSession;
assert.deepEqual(new Set(session.assistedNames), new Set(['Marina','João']));

const marinaInvestigation = session.narrative.find((item) => item.id === 'investigation:inv_marina');
const joaoInvestigation = session.narrative.find((item) => item.id === 'investigation:inv_joao');
const marinaTreatment = session.narrative.find((item) => item.treatmentId === 'trt_marina');
const joaoTreatment = session.narrative.find((item) => item.treatmentId === 'trt_joao');
const joaoNote = session.narrative.find((item) => item.id === 'evt_note_j');

assert.equal(marinaInvestigation.detail, 'Marina · 0 respostas positivas');
assert.equal(joaoInvestigation.detail, 'João · 1 resposta positiva');
assert.equal(marinaTreatment.detail, 'Marina · 1 de 2 componentes resolvidos');
assert.equal(joaoTreatment.detail, 'João · 1 componente preparado');
assert.equal(joaoNote.detail, 'João · Revisar limites');

assert.equal(session.longitudinal.find((item) => item.id === 'trt_marina')?.assistedName, 'Marina');
assert.equal(session.longitudinal.find((item) => item.id === 'trt_joao')?.assistedName, 'João');

const html = historyPage(model, { historySessionId:'ses_multi' });
assert.match(html, /Marina · 1 de 2 componentes resolvidos/);
assert.match(html, /João · 1 componente preparado/);
assert.match(html, /João · Revisar limites/);

console.log('ui-v2-multi-assisted-history.test.mjs: ok');
