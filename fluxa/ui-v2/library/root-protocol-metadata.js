const ROOT_PROTOCOLS=Object.freeze([
  ['Vida Financeira','Temas essenciais'],
  ['Carreira / Profissional','Temas essenciais'],
  ['Casamento / Relacionamento','Temas essenciais'],
  ['Protocolo Mestre de Causa Raiz','Protocolo Mestre'],
  ['Autoestima, Amor-próprio e Merecimento','Investigações profundas'],
  ['Relacionamentos Familiares','Investigações profundas'],
  ['Prosperidade e Abundância','Investigações profundas'],
  ['Propósito e Caminho de Vida','Investigações profundas'],
  ['Casa e Ambiente','Investigações profundas'],
  ['Relacionamento com o Próprio Corpo','Investigações profundas'],
  ['Criatividade e Projetos','Investigações profundas'],
  ['Vida Social e Pertencimento','Investigações profundas'],
  ['Parentalidade','Investigações profundas'],
  ['Padrões Repetitivos','Investigações profundas'],
  ['Limpeza e Reequilíbrio','Protocolos rápidos'],
  ['Reequilíbrio após um Dia Difícil','Protocolos rápidos'],
  ['Preparação para uma Decisão Importante','Protocolos rápidos'],
  ['Encerramento de Ciclo','Protocolos rápidos'],
  ['Reequilíbrio após Conflito','Protocolos rápidos'],
]);

function slug(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

export const ROOT_PROTOCOL_METADATA=Object.freeze(ROOT_PROTOCOLS.map(([name,category])=>Object.freeze({
  id:`root-catalog-${slug(name)}`,
  name,
  category,
  description:'Protocolo da biblioteca terapêutica original do Fluxa.',
  source:'Fluxa',
})));
