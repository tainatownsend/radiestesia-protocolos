import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ORIENTING_ASSESSMENT_AREAS, suggestProtocolsForAreas } from './assessment-protocol-handoff.js';
import { parseRootProtocols, applyRootProtocolMutations, finalizeRootProtocols } from './root-protocol-parser.mjs';

const sources = [
  { path:'../app.js', group:'Temas essenciais' },
  { path:'../marriage.js', group:'Temas essenciais' },
  { path:'../protocols-v11-core.js', group:'Investigações profundas' },
  { path:'../protocols-v11-expansion.js', group:'Investigações profundas' },
  { path:'../protocols-v11-quick.js', group:'Protocolos rápidos' }
];
const mutations = ['../deep-tree.js', '../deep-tree-2.js'];

const parsed = [];
for (const source of sources) {
  parsed.push(...parseRootProtocols(fs.readFileSync(new URL(source.path, import.meta.url), 'utf8'), source));
}
const protocols = [...new Map(parsed.map((item) => [item.id, item])).values()];
for (const path of mutations) {
  applyRootProtocolMutations(protocols, fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
}
const catalog = finalizeRootProtocols(protocols);
const byId = new Map(catalog.map((protocol) => [protocol.id, protocol]));

function actionablePlans(protocol) {
  return Object.values(protocol?.nodes || {}).filter((node) =>
    node?.legacyPlanTitle?.trim() && node?.legacyPlanCommand?.trim()
  );
}

assert.equal(catalog.length, 19, 'actionable assessment handoff must validate against the complete real 19-protocol catalog');
for (const area of ORIENTING_ASSESSMENT_AREAS) {
  const suggestions = suggestProtocolsForAreas([area.id], catalog, 6);
  assert.ok(suggestions.length > 0, `assessment area ${area.id} must resolve to a real protocol`);
  for (const suggestion of suggestions) {
    const protocol = byId.get(suggestion.protocolId);
    assert.ok(protocol, `suggested protocol ${suggestion.protocolId} for ${area.id} must exist in the real catalog`);
    const plans = actionablePlans(protocol);
    assert.ok(
      plans.length > 0,
      `assessment area ${area.id} suggests ${protocol.name}, but that protocol has no actionable treatment plan`
    );
    assert.ok(
      plans.every((node) => node.legacyPlanTitle.trim() && node.legacyPlanCommand.trim()),
      `actionable plans for ${protocol.name} must preserve both visible title and therapeutic command`
    );
  }
}

const unclear = suggestProtocolsForAreas(['unclear'], catalog, 6)[0];
assert.equal(unclear?.protocolName, 'Protocolo Mestre de Causa Raiz');
assert.ok(actionablePlans(byId.get(unclear.protocolId)).length > 0, 'Master-protocol fallback must still lead to actionable therapeutic work');

console.log('assessment-actionable-handoff-regression.test.mjs: ok');
