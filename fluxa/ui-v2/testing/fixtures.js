const modalityOptions = [
  { id:'RADIESTHESIA', label:'Radiestesia', base:true },
  { id:'REIKI', label:'Aplicação de Reiki', base:false },
];

const libraryPopulated = {
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

const base = {
  assistedName:'Marina',
  assistedId:'ast_1',
  assistedOptions:[{ id:'ast_1', name:'Marina', type:'PERSON' }, { id:'ast_2', name:'João', type:'PERSON' }],
  sessionStartedAt:'2026-09-06T10:02:00.000Z',
  investigations:1,
  treatmentCount:1,
  treatmentsWorked:1,
  treatments:[],
  activeTreatments:0,
  treatmentFindings:[],
  modalityOptions,
  graphOptions:['Desimpregnador','Decágono','Turbilhão'],
  reikiEnabled:true,
  reiki:null,
  notes:0,
  historySessions:[],
  safeClose:null,
  latestClosedSession:null,
  library:libraryPopulated,
  therapeuticSettings:{ enabled:['REIKI'], custom:[] },
};

function ready(overrides = {}) {
  return {
    ...base,
    sessionOpen:true,
    prepared:true,
    assistedSelected:true,
    hawkinsReady:true,
    hawkins:540,
    title:'Marina',
    description:'Contexto, pendências e próxima ação em uma única linha de trabalho.',
    nextAction:'Iniciar investigação',
    nextReason:'Os pré-requisitos estão concluídos.',
    ...overrides,
  };
}

function graph(name = 'Desimpregnador', expectedEndAt = null) {
  return { id:`graph_${name}`, name, expectedEndAt, noDuration:!expectedEndAt };
}

function component(overrides = {}) {
  return {
    id:'cmp_1',
    name:'Crença limitante',
    status:'IN_PROGRESS',
    expectedEndAt:null,
    due:false,
    manualReview:true,
    reviewable:true,
    resolved:false,
    commands:[{ id:'cmd_1', text:'Neutralizar e harmonizar', graphs:[graph()] }],
    commandCount:1,
    graphCount:1,
    ...overrides,
  };
}

function treatment(overrides = {}) {
  const components = overrides.components || [component()];
  return {
    id:'trt_1',
    title:'Equilíbrio emocional',
    objective:'Reduzir o fator prioritário identificado.',
    status:'IN_PROGRESS',
    startedAt:'2026-09-06T10:20:00.000Z',
    plannedAt:null,
    completedAt:null,
    modalities:[{ id:'RADIESTHESIA', label:'Radiestesia' }],
    findingIds:['find_1'],
    components,
    total:components.length,
    resolved:components.filter((item) => item.resolved || item.status === 'COMPLETED').length,
    unresolved:components.filter((item) => !(item.resolved || item.status === 'COMPLETED')).length,
    readyForFinalAssessment:false,
    reviewableCount:components.filter((item) => item.reviewable).length,
    primaryAction:'review',
    primaryLabel:'Revisar',
    ...overrides,
  };
}

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

const triageBase = {
  id:'inv_1',
  name:'Triagem rápida',
  total:3,
  answers:[],
};

const emptyDraft = {
  title:'', objective:'', modalities:[], findingIds:['find_1'],
  items:[{ itemLabel:'', commands:[{ text:'', graphApplications:[{ graphName:'', durationValue:'', durationUnit:'DAY' }] }] }],
};

const complexDraft = {
  title:'Equilíbrio emocional',
  objective:'Apoiar estabilidade e clareza.',
  modalities:['REIKI'],
  findingIds:['find_1','find_2'],
  items:[
    {
      itemLabel:'Crença de escassez',
      commands:[
        { text:'Neutralizar', graphApplications:[{ graphName:'Desimpregnador', durationValue:'7', durationUnit:'DAY' }, { graphName:'Decágono', durationValue:'', durationUnit:'DAY' }] },
        { text:'Harmonizar', graphApplications:[{ graphName:'Turbilhão', durationValue:'2', durationUnit:'HOUR' }] },
      ],
    },
    {
      itemLabel:'Medo de mudança',
      commands:[{ text:'Fortalecer segurança', graphApplications:[{ graphName:'Decágono', durationValue:'3', durationUnit:'DAY' }] }],
    },
  ],
};

export const V2_FIXTURES = Object.freeze({
  'no-session': {
    id:'no-session', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false,
    title:'Seu próximo atendimento começa aqui',
    description:'Inicie uma sessão quando estiver pronta. O Fluxa vai conduzir preparação, Assistido, Hawkins e próximos passos.',
    nextAction:'Iniciar sessão', nextReason:'Comece o atendimento.',
  },
  'session-preparation-not-started': {
    id:'session-preparation-not-started', ...base, sessionOpen:true, prepared:false, assistedSelected:false, hawkinsReady:false,
    nextAction:'Continuar preparação', nextReason:'Conclua a preparação antes do atendimento.',
  },
  'preparation-1': {
    id:'preparation-1', ...base, sessionOpen:true, prepared:false, assistedSelected:false, hawkinsReady:false,
    nextAction:'Continuar preparação', nextReason:'Você está no início da preparação.', overlay:'preparation',
    preparation:{ step:1, total:4, stepKey:'breathing', frequency:'', frequencyValid:false, protection:'', permission:'' },
  },
  'preparation-4': {
    id:'preparation-4', ...base, sessionOpen:true, prepared:false, assistedSelected:false, hawkinsReady:false,
    nextAction:'Concluir preparação', nextReason:'Você está na etapa final da preparação da sessão.', overlay:'preparation',
    preparation:{ step:4, total:4, stepKey:'permission', frequency:540, frequencyValid:true, protection:'4 Círculos', permission:'Confirmada' },
  },
  'preparation-invalid-frequency': {
    id:'preparation-invalid-frequency', ...base, sessionOpen:true, prepared:false, assistedSelected:false, hawkinsReady:false,
    nextAction:'Continuar preparação', nextReason:'A frequência do terapeuta precisa ser revisada.', overlay:'preparation',
    preparation:{ step:2, total:4, stepKey:'frequency', frequency:320, frequencyValid:false, protection:'', permission:'' },
  },
  'prepared-no-assisted': {
    id:'prepared-no-assisted', ...base, sessionOpen:true, prepared:true, assistedSelected:false, assistedName:'', hawkinsReady:false,
    nextAction:'Selecionar Assistido', nextReason:'Defina quem está sendo atendido.', overlay:'assisted',
  },
  'assisted-no-hawkins': ready({
    id:'assisted-no-hawkins', hawkinsReady:false, hawkins:null, nextAction:'Registrar Hawkins inicial',
    nextReason:'Registre a frequência inicial de Marina antes de investigar ou tratar.', overlay:'hawkins',
  }),
  'hawkins-valid': ready({ id:'hawkins-valid', nextAction:'Iniciar investigação', nextReason:'Hawkins inicial registrado: 540 Hz.' }),
  'triage-1': ready({
    id:'triage-1', nextAction:'Continuar investigação', nextReason:'Triagem rápida · pergunta 1 de 3.', overlay:'triage',
    investigation:{ ...triageBase, currentIndex:0, question:'Existe algo prioritário que precisa ser investigado neste momento?' },
  }),
  'triage-3': ready({
    id:'triage-3', nextAction:'Continuar investigação', nextReason:'Triagem rápida · pergunta 3 de 3.', overlay:'triage',
    investigation:{ ...triageBase, currentIndex:2, question:'É apropriado iniciar um tratamento para este tema agora?', answers:[{questionId:'q1',answer:'YES'},{questionId:'q2',answer:'NO'}] },
  }),
  'findings-available': ready({
    id:'findings-available', nextAction:'Revisar achados', nextReason:'2 achados aguardam confirmação.', overlay:'findings', findingsInvestigationId:'inv_1',
    findings:[{questionId:'q1',title:'Existe algo prioritário que precisa ser investigado neste momento?',selected:true},{questionId:'q3',title:'É apropriado iniciar um tratamento para este tema agora?',selected:true}],
  }),
  'composer-empty': ready({
    id:'composer-empty', overlay:'treatment-composer', treatmentFindings:[{id:'find_1',title:'Fator prioritário'}],
    fixtureUi:{ activeTreatmentId:null, treatmentDraft:emptyDraft },
  }),
  'composer-complex': ready({
    id:'composer-complex', overlay:'treatment-composer', treatmentFindings:[{id:'find_1',title:'Fator prioritário'},{id:'find_2',title:'Padrão recorrente'}],
    fixtureUi:{ activeTreatmentId:null, treatmentDraft:complexDraft },
  }),
  'planned-treatment-blocked': {
    ...ready({ hawkinsReady:false, hawkins:null }), id:'planned-treatment-blocked',
    treatments:[treatment({ status:'PLANNED', startedAt:null, plannedAt:'2026-09-06T10:20:00.000Z', components:[component({status:'PLANNED',reviewable:false,manualReview:false})], primaryAction:'start', primaryLabel:'Iniciar' })],
    fixtureUi:{ route:'treatments' },
  },
  'active-treatment': ready({
    id:'active-treatment', treatments:[treatment({ reviewableCount:0, primaryAction:'workspace', primaryLabel:'Ver tratamento', components:[component({reviewable:false,manualReview:false,expectedEndAt:'2026-09-13T10:20:00.000Z'})] })], activeTreatments:1,
    fixtureUi:{ route:'treatments' },
  }),
  'treatment-ready-review': ready({
    id:'treatment-ready-review', treatments:[treatment({ components:[component({due:true,manualReview:false,expectedEndAt:'2026-09-06T09:20:00.000Z'})] })], activeTreatments:1,
    overlay:'treatment-workspace', fixtureUi:{ activeTreatmentId:'trt_1' },
  }),
  'component-manual-review': ready({
    id:'component-manual-review', treatments:[treatment({ components:[component({manualReview:true,reviewable:true,expectedEndAt:null})] })], activeTreatments:1,
    overlay:'treatment-review', fixtureUi:{ activeTreatmentId:'trt_1', reviewComponentId:'cmp_1' },
  }),
  'treatment-ready-final': ready({
    id:'treatment-ready-final', treatments:[treatment({ components:[component({status:'COMPLETED',resolved:true,reviewable:false,manualReview:false})], readyForFinalAssessment:true, reviewableCount:0, primaryAction:'final', primaryLabel:'Realizar avaliação final' })], activeTreatments:1,
    overlay:'treatment-workspace', fixtureUi:{ activeTreatmentId:'trt_1' },
  }),
  'final-assessment': ready({
    id:'final-assessment', hawkins:420, treatments:[treatment({ components:[component({status:'COMPLETED',resolved:true,reviewable:false,manualReview:false})], readyForFinalAssessment:true, primaryAction:'final', primaryLabel:'Realizar avaliação final' })],
    overlay:'final-assessment', fixtureUi:{ activeTreatmentId:'trt_1' },
  }),
  'reiki-running': ready({
    id:'reiki-running', overlay:'reiki', reiki:{ id:'reiki_1', sessionId:'ses_1', assistedEntityId:'ast_1', assistedName:'Marina', belongsToCurrentSession:true, belongsToCurrentAssisted:true, status:'RUNNING', mode:'IN_PERSON', modeLabel:'Presencial', elapsedSeconds:742, startedAt:'2026-09-06T10:30:00.000Z' },
  }),
  'safe-close-review': ready({
    id:'safe-close-review', overlay:'closing', safeClose:{ id:'ses_1', assistedNames:['Marina'], investigationOpened:1, investigationCompleted:1, treatmentsWorked:1, findings:2, notes:1, longitudinal:[{id:'trt_1',title:'Equilíbrio emocional',status:'IN_PROGRESS'}], activeReiki:null },
  }),
  'post-close-summary': {
    id:'post-close-summary', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false,
    historySessions:[closedSession], latestClosedSession:closedSession,
    fixtureUi:{ route:'today', justClosedSessionId:'ses_closed' },
  },
  'history-grouped': {
    id:'history-grouped', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false,
    historySessions:[closedSession], latestClosedSession:closedSession,
    fixtureUi:{ route:'history', historySessionId:'ses_closed' },
  },
  'acervo-empty': {
    id:'acervo-empty', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false, library:emptyLibrary,
    therapeuticSettings:{enabled:[],custom:[]}, fixtureUi:{route:'library',librarySection:'home'},
  },
  'acervo-populated': {
    id:'acervo-populated', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false,
    fixtureUi:{route:'library',librarySection:'resources'},
  },
  'settings-local-first': {
    id:'settings-local-first', ...base, sessionOpen:false, prepared:false, assistedSelected:false, hawkinsReady:false,
    overlay:'settings', fixtureUi:{route:'library',librarySection:'therapies'},
  },
});

export const V2_FIXTURE_ORDER = Object.freeze([
  'no-session','session-preparation-not-started','preparation-1','preparation-4','preparation-invalid-frequency',
  'prepared-no-assisted','assisted-no-hawkins','hawkins-valid','triage-1','triage-3','findings-available',
  'composer-empty','composer-complex','planned-treatment-blocked','active-treatment','treatment-ready-review',
  'component-manual-review','treatment-ready-final','final-assessment','reiki-running','safe-close-review','post-close-summary',
  'history-grouped','acervo-empty','acervo-populated','settings-local-first',
]);

export function fixtureFromLocation(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(search);
  const requested = params.get('fixture') || 'preparation-4';
  return structuredClone(V2_FIXTURES[requested] || V2_FIXTURES['preparation-4']);
}
