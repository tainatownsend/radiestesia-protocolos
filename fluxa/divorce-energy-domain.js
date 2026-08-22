export const DIVORCE_ENERGY_GENERAL = Object.freeze({
  id:'general',
  label:'Tratamento geral',
  graph:'KRIM',
  command:'Realizar um tratamento geral de Divórcio Energético dentro da prática, liberando vínculos percebidos como negativos ou limitantes e preservando aprendizados e conexões saudáveis.'
});

export const DIVORCE_ENERGY_CUT = Object.freeze({
  id:'cut',
  label:'Corte geral',
  graph:'72 NOMES DE DEUS',
  command:'Realizar o corte geral dos vínculos ainda percebidos como limitantes, com intenção de encerramento, proteção e reintegração do que pertence a cada parte.'
});

export const DIVORCE_ENERGY_AREAS = Object.freeze([
  Object.freeze(['affective','Relacionamento afetivo','HRIM']),
  Object.freeze(['prosperity','Prosperidade / financeiro','SRIM']),
  Object.freeze(['health','Saúde física','SHIN']),
  Object.freeze(['professional','Profissional','SRIM']),
  Object.freeze(['environment','Ambiente','KRIM']),
  Object.freeze(['trauma','Trauma emocional','YOSHUA']),
  Object.freeze(['negative','Sentimentos negativos','YOSHUA']),
  Object.freeze(['family','Laço familiar','HRIM']),
  Object.freeze(['friendship','Amizade','HRIM']),
  Object.freeze(['partnership','Parceria profissional / sociedade','SRIM']),
  Object.freeze(['past','Experiência de vida passada / registro antigo','72 NOMES DE DEUS']),
  Object.freeze(['belief','Crença limitante','KRIM']),
  Object.freeze(['selfdestructive','Vício / padrão autodestrutivo','KRIM']),
  Object.freeze(['spiritual','Influência espiritual externa percebida','72 NOMES DE DEUS']),
  Object.freeze(['grief','Luto / falecido','72 NOMES DE DEUS']),
  Object.freeze(['other','Outro','KRIM'])
]);

export function answeredDivorceAreas(answers = {}) {
  return DIVORCE_ENERGY_AREAS.filter(([id]) => ['YES','NO'].includes(answers[id])).length;
}

export function validateDivorceEnergyDraft(draft = {}) {
  if (!draft.theme) throw new Error('Escolha o tema do Divórcio Energético antes de continuar.');
  if (draft.theme === 'Outro' && !String(draft.other || '').trim()) throw new Error('Descreva o tema antes de continuar.');
  const answered = answeredDivorceAreas(draft.answers || {});
  if (answered !== DIVORCE_ENERGY_AREAS.length) {
    throw new Error(`Responda todas as áreas antes de revisar o plano (${answered}/${DIVORCE_ENERGY_AREAS.length}).`);
  }
  return true;
}

export function divorceEnergyFindings(draft = {}) {
  validateDivorceEnergyDraft(draft);
  const findings = [
    {
      sourceQuestionId:'general',
      title:'Divórcio Energético · Tratamento geral',
      suggestedTreatmentTitle:DIVORCE_ENERGY_GENERAL.label,
      suggestedTreatmentCommand:`${DIVORCE_ENERGY_GENERAL.command} Gráfico sugerido no protocolo original: ${DIVORCE_ENERGY_GENERAL.graph}.`
    },
    {
      sourceQuestionId:'cut',
      title:'Divórcio Energético · Corte geral',
      suggestedTreatmentTitle:DIVORCE_ENERGY_CUT.label,
      suggestedTreatmentCommand:`${DIVORCE_ENERGY_CUT.command} Gráfico sugerido no protocolo original: ${DIVORCE_ENERGY_CUT.graph}.`
    }
  ];
  for (const [id,label,graph] of DIVORCE_ENERGY_AREAS.filter(([areaId]) => draft.answers?.[areaId] === 'YES')) {
    findings.push({
      sourceQuestionId:id,
      title:`Divórcio Energético · ${label}`,
      suggestedTreatmentTitle:label,
      suggestedTreatmentCommand:`Aplicar o tratamento específico indicado para ${label}. Gráfico sugerido no protocolo original: ${graph}.`
    });
  }
  return findings;
}
