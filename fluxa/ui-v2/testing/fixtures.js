const base = {
  assistedName: 'Marina',
  sessionStartedAt: '10:02',
  investigations: 1,
  treatmentCount: 1,
  treatmentsWorked: 1,
  treatments: [],
  activeTreatments: 0,
  treatmentFindings: [],
  modalityOptions: [{ id: 'RADIESTHESIA', label: 'Radiestesia', base: true }],
  graphOptions: [],
  reikiEnabled: false,
  reiki: null,
  notes: 0,
};

export const V2_FIXTURES = Object.freeze({
  'no-session': {
    id: 'no-session',
    ...base,
    sessionOpen: false,
    title: 'Seu próximo atendimento começa aqui',
    description: 'Inicie uma sessão quando estiver pronta. O Fluxa vai conduzir preparação, Assistido, Hawkins e próximos passos.',
  },
  'preparation-4': {
    id: 'preparation-4',
    ...base,
    sessionOpen: true,
    prepared: false,
    assistedSelected: false,
    hawkinsReady: false,
    nextAction: 'Concluir preparação',
    nextReason: 'Você está na etapa final da preparação da sessão.',
    overlay: 'preparation',
    preparation: {
      step: 4,
      total: 4,
      frequency: 540,
      frequencyLabel: 'Alegria',
      frequencyValid: true,
      protection: '4 Círculos',
      permission: 'Confirmada',
    },
  },
  'cockpit-ready': {
    id: 'cockpit-ready',
    ...base,
    sessionOpen: true,
    prepared: true,
    assistedSelected: true,
    hawkinsReady: true,
    hawkins: 540,
    nextAction: 'Continuar investigação',
    nextReason: 'Triagem rápida está em andamento para Marina · pergunta 2 de 3.',
  },
});

export function fixtureFromLocation(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(search);
  const requested = params.get('fixture') || 'preparation-4';
  return structuredClone(V2_FIXTURES[requested] || V2_FIXTURES['preparation-4']);
}
