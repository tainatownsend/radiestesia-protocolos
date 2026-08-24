import assert from 'node:assert/strict';
import { parseTreatmentPlans } from './treatment-theme-parser.js';

for (const source of [undefined,null,{},[],42,true,'','   \n\t']) {
  assert.doesNotThrow(
    () => parseTreatmentPlans(source,'malformed-source.js'),
    'Malformed or empty therapeutic source input must fail closed instead of throwing during discovery.'
  );
  assert.deepEqual(
    parseTreatmentPlans(source,'malformed-source.js'),
    [],
    'Malformed or empty therapeutic source input must not create discovery entries.'
  );
}

const valid=parseTreatmentPlans(
  "VALID:P('Direção profissional segura','Fortalecer carreira, trabalho e reconhecimento')",
  'valid-source.js'
);
assert.equal(valid.length,1,'Valid string sources must remain discoverable after the shape guard.');
assert.equal(valid[0].legacyId,'VALID');
assert.equal(valid[0].theme,'Carreira');

console.log('treatment-theme-source-shape-guard.test.mjs: ok');
