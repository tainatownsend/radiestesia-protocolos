import assert from 'node:assert/strict';
import fs from 'node:fs';

const internal = fs.readFileSync(new URL('./reports-ui.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('./client-report-ui.js', import.meta.url), 'utf8');

assert.match(internal, /statusLabels/);
assert.match(internal, /return value\?\(statusLabels\[value\]\|\|'Registrado'\):''/);
assert.doesNotMatch(internal, /protocolId\|\|'Investigação'/, 'internal report should not expose protocol IDs as fallback copy');
assert.match(internal, /findingLabels\[f\.classification\]\|\|'Fator relevante'/);
assert.match(internal, /reikiModeLabels\[r\.mode\]\|\|'Aplicação'/);
assert.match(internal, /sessionHawkinsMeasurements/);
assert.match(internal, /Frequência inicial da investigação/);
assert.match(internal, /Frequência após tratamento/);
assert.doesNotMatch(internal, /Nenhuma aplicação registrada\./, 'internal report must omit Reiki when no application occurred');
assert.doesNotMatch(internal, /Nenhuma anotação registrada para este assistido\./, 'internal report must omit empty notes sections');

assert.doesNotMatch(client, /\.instructions/,'shareable report must not expose component commands');
assert.doesNotMatch(client, /NOTE_CREATED/,'shareable report must not expose internal session notes');
assert.match(client, /histórico técnico do Fluxa/);
assert.match(client, /sessionHawkinsMeasurements/);
assert.match(client, /Frequência inicial da investigação/);
assert.match(client, /Frequência após tratamento/);
assert.doesNotMatch(client, /Nenhuma aplicação registrada nesta sessão\./, 'shareable report must omit Reiki when absent');

console.log('report-copy.test.mjs: ok');
