const populatedLibrary = {
  assisteds:[{ id:'ast_1', name:'Marina', type:'PERSON', typeLabel:'Pessoa', birthDate:'1990-01-01', details:'' }],
  resources:[{ id:'tool_1', name:'Desimpregnador', type:'GRAPH', typeLabel:'Gráfico', purpose:'Limpeza energética', tags:['limpeza'] }],
  protocols:[{ id:'protocol_triagem_rapida', name:'Triagem rápida', category:'Fluxa', description:'Investigação inicial', source:'Fluxa' }],
  therapies:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }, { id:'REIKI', label:'Aplicação de Reiki', base:false }],
  counts:{ assisteds:1, resources:1, protocols:1, therapies:2 },
};

const emptyLibrary = {
  assisteds:[], resources:[], protocols:[], therapies:[{ id:'RADIESTHESIA', label:'Radiestesia', base:true }],
  counts:{ assisteds:0, resources:0, protocols:0, therapies:1 },
};

const closedSession = {
  id:'ses_closed',
  status:'CLOSED',
  startedAt:'2026-09-06T10:00:00.000Z',
  endedAt:'2026-09-06T10:48:00.000Z',
  closedRecordedAt:'2026-09-06T10:48:00.000Z',
  assistedNames:['Marina'],
  investigationOpened:1,
  investigationCompleted:1,
  treatmentsWorked:1,
  findings:2,
  notes:1,
  longitudinal:[{ id:'trt_1', title:'Equilíbrio emocional', status:'IN_PROGRESS' }],
  narrative:[
    {
      id:'investigation:inv_1', kind:'investigation', title:'Investigação concluída · Triagem rápida',
      detail:'2 respostas positivas', occurredAt:'2026-09-06T10:12:00.000Z', relatedCount:1,
      audit:[
        { id:'evt_1', label:'Investigação iniciada', detail:'Triagem rápida', occurredAt:'2026-09-06T10:05:00.000Z' },
        { id:'evt_2', label:'Investigação concluída', detail:'Triagem rápida', occurredAt:'2026-09-06T10:12:00.000Z' },
      ],
    },
    {
      id:'treatment:trt_1', kind:'treatment', title:'Tratamento Equilíbrio emocional revisado',
      detail:'1 de 2 componentes resolvidos', occurredAt:'2026-09-06T10:35:00.000Z', relatedCount:4,
      audit:[
        { id:'evt_3', label:'Tratamento iniciado', detail:'Equilíbrio emocional', occurredAt:'2026-09-06T10:20:00.000Z' },
        { id:'evt_4', label:'Componente revisado', detail:'Crença limitante', occurredAt:'2026-09-06T10:35:00.000Z' },
      ],
    },
  ],
};

const safeClose = {
  id:'ses_1', assistedNames:['Marina'], investigationOpened:1, investigationCompleted:1, treatmentsWorked:1,
  findings:2, notes:1, longitudinal:[{id:'trt_1',title:'Equilíbrio emocional',status:'IN_PROGRESS'}], activeReiki:null,
};

export function fixtureVisualData(id) {
  const common = {
    library: populatedLibrary,
    therapeuticSettings:{ enabled:['REIKI'], custom:[] },
  };
  if (id === 'safe-close-review') return { ...common, safeClose };
  if (id === 'post-close-summary' || id === 'history-grouped') {
    return { ...common, historySessions:[closedSession], latestClosedSession:closedSession };
  }
  if (id === 'acervo-empty') {
    return { library:emptyLibrary, therapeuticSettings:{ enabled:[], custom:[] } };
  }
  return common;
}
