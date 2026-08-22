import assert from 'node:assert/strict';
import { buildCustomProtocolGraph, validateCustomProtocolGraph } from './custom-protocol-rules.js';

const valid=validateCustomProtocolGraph({
  texts:['Prioridade?','Origem interna?','Contexto externo?'],
  yesTargets:['2','Fim','Fim'],
  noTargets:['3','Fim','Fim']
});
assert.equal(valid.length,3);
assert.equal(valid[0].yesNext,'q2');
assert.equal(valid[0].noNext,'q3');

const defaults=buildCustomProtocolGraph({texts:['A?','B?'],yesTargets:['',''],noTargets:['Fim','Fim']});
assert.equal(defaults[0].yesNext,'q2');
assert.equal(defaults[1].yesNext,'END');

assert.throws(()=>validateCustomProtocolGraph({
  texts:['A?'],yesTargets:['1'],noTargets:['Fim']
}),/ciclo/i,'self loops must be rejected');

assert.throws(()=>validateCustomProtocolGraph({
  texts:['A?','B?'],yesTargets:['2','1'],noTargets:['Fim','Fim']
}),/ciclo/i,'multi-question cycles must be rejected');

assert.throws(()=>validateCustomProtocolGraph({
  texts:['A?','B?','C?'],yesTargets:['Fim','Fim','Fim'],noTargets:['2','Fim','Fim']
}),/sem caminho.*3/i,'unreachable questions must be rejected');

assert.throws(()=>validateCustomProtocolGraph({
  texts:['A?','B?'],yesTargets:['99','Fim'],noTargets:['Fim','Fim']
}),/Destino inválido/i);

assert.throws(()=>validateCustomProtocolGraph({texts:['A?','   '],yesTargets:['2','Fim'],noTargets:['Fim','Fim']}),/pergunta 2.*texto/i);

console.log('custom-protocol-rules.test.mjs: ok');
