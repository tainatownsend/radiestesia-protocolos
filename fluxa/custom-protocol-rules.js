function normalizeTarget(raw,index,count){
  const value=String(raw??'').trim().toLowerCase();
  if(!value||value==='próxima'||value==='proxima')return index<count-1?`q${index+2}`:'END';
  if(value==='fim'||value==='end')return'END';
  const number=Number(value);
  if(Number.isInteger(number)&&number>=1&&number<=count)return`q${number}`;
  throw new Error(`Destino inválido na pergunta ${index+1}. Use Próxima, Fim ou um número de 1 a ${count}.`);
}

export function buildCustomProtocolGraph(input={}){
  const texts=Array.isArray(input.texts)?input.texts:[];
  const yesTargets=Array.isArray(input.yesTargets)?input.yesTargets:[];
  const noTargets=Array.isArray(input.noTargets)?input.noTargets:[];
  if(!texts.length)throw new Error('Adicione pelo menos uma pergunta.');
  const questions=texts.map((text,index)=>{
    const clean=String(text||'').trim();
    if(!clean)throw new Error(`A pergunta ${index+1} precisa de texto.`);
    return{id:`q${index+1}`,text:clean,yesNext:normalizeTarget(yesTargets[index],index,texts.length),noNext:normalizeTarget(noTargets[index],index,texts.length)};
  });
  return questions;
}

export function validateCustomProtocolGraph(input={}){
  const questions=buildCustomProtocolGraph(input);
  const byId=new Map(questions.map((question)=>[question.id,question]));
  const visiting=new Set();const visited=new Set();const reachable=new Set();

  function visit(id){
    if(id==='END')return;
    const question=byId.get(id);
    if(!question)throw new Error(`O protocolo aponta para uma pergunta que não existe: ${id}.`);
    reachable.add(id);
    if(visiting.has(id))throw new Error('O protocolo contém um ciclo entre perguntas. Ajuste os destinos para que toda sequência possa chegar a Fim.');
    if(visited.has(id))return;
    visiting.add(id);
    visit(question.yesNext);
    visit(question.noNext);
    visiting.delete(id);
    visited.add(id);
  }

  visit('q1');
  const unreachable=questions.filter((question)=>!reachable.has(question.id));
  if(unreachable.length){
    const numbers=unreachable.map((question)=>Number(question.id.slice(1))).join(', ');
    throw new Error(`Há pergunta(s) sem caminho a partir da Pergunta 1: ${numbers}.`);
  }
  return questions;
}
