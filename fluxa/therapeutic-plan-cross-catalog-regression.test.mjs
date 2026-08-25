import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';
import { parseTreatmentPlans } from './treatment-theme-parser.js';

const sources = [
  { path:'../app.js', group:'Temas essenciais' },
  { path:'../marriage.js', group:'Temas essenciais' },
  { path:'../protocols-v11-core.js', group:'Investigações profundas' },
  { path:'../protocols-v11-expansion.js', group:'Investigações profundas' },
  { path:'../protocols-v11-quick.js', group:'Protocolos rápidos' }
];
const mutations = ['../deep-tree.js', '../deep-tree-2.js'];

const parsedProtocols = [];
const treatmentPlans = [];
for (const source of sources) {
  const text = fs.readFileSync(new URL(source.path, import.meta.url), 'utf8');
  parsedProtocols.push(...parseRootProtocols(text, source));
  treatmentPlans.push(...parseTreatmentPlans(text, source.path));
}
const protocols = [...new Map(parsedProtocols.map((item) => [item.id, item])).values()];
for (const path of mutations) {
  const text = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  applyRootProtocolMutations(protocols, text);
  treatmentPlans.push(...parseTreatmentPlans(text, path));
}
const catalog = finalizeRootProtocols(protocols);

const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const treatmentPairs = new Set(treatmentPlans.map((item) => `${normalize(item.title)}\u0000${normalize(item.command)}`));
const protocolPairs = [];
for (const protocol of catalog) {
  for (const node of Object.values(protocol.nodes || {})) {
    if (!node?.legacyPlanTitle || !node?.legacyPlanCommand) continue;
    protocolPairs.push({
      protocolId: protocol.id,
      protocolName: protocol.name,
      title: node.legacyPlanTitle,
      command: node.legacyPlanCommand,
      key: `${normalize(node.legacyPlanTitle)}\u0000${normalize(node.legacyPlanCommand)}`
    });
  }
}

assert.equal(catalog.length, 19, 'cross-catalog regression must run against the complete 19-protocol therapeutic catalog');
assert.ok(protocolPairs.length > 0, 'real protocols must expose at least one legacy treatment plan for cross-catalog validation');
for (const plan of protocolPairs) {
  assert.ok(
    treatmentPairs.has(plan.key),
    `Treatment-by-theme discovery is missing the real protocol plan "${plan.title}" from ${plan.protocolName} (${plan.protocolId}).`
  );
}

const uniqueProtocolPairs = new Set(protocolPairs.map((item) => item.key));
assert.equal(
  uniqueProtocolPairs.size,
  protocolPairs.length,
  'protocol plan title/command pairs should remain unique so treatment discovery does not collapse distinct therapeutic actions'
);

console.log(`therapeutic-plan-cross-catalog-regression.test.mjs: ok (${protocolPairs.length} protocol plans cross-checked)`);
