import assert from 'node:assert/strict';
import { parseTreatmentPlans } from './treatment-theme-parser.js';

const source = `
const plans = {
  CAREER_NESTED: {
    label: 'Direção profissional',
    metadata: { icon: 'briefcase', featured: true },
    command: 'Investigar bloqueios ligados à carreira e ao trabalho'
  },
  "SELF_WORTH_NESTED": {
    command: "Investigar merecimento e autovalor",
    presentation: { group: 'identity', order: 2 },
    label: "Autoestima e merecimento"
  }
};
`;

const plans = parseTreatmentPlans(source, 'nested-metadata.js');
assert.equal(plans.length, 2, 'Nested presentation metadata must not hide otherwise valid legacy treatment plans.');
assert.deepEqual(plans.map((item) => item.legacyId), ['CAREER_NESTED', 'SELF_WORTH_NESTED']);
assert.equal(plans[0].title, 'Direção profissional');
assert.equal(plans[0].command, 'Investigar bloqueios ligados à carreira e ao trabalho');
assert.equal(plans[0].theme, 'Carreira');
assert.equal(plans[1].title, 'Autoestima e merecimento');
assert.equal(plans[1].command, 'Investigar merecimento e autovalor');
assert.equal(plans[1].theme, 'Autoestima e identidade');
assert.ok(plans.every((item) => item.sourcePath === 'nested-metadata.js'));

console.log('treatment-theme-nested-metadata.test.mjs: ok');
