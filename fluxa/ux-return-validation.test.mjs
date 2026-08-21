import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const html=fs.readFileSync(new URL('./index.html',root),'utf8');
const source=fs.readFileSync(new URL('./ux-return-validation-ui.js',root),'utf8');

assert.match(html,/ux-return-validation-ui\.js/,'Return validation layer must be loaded.');
assert.ok(html.indexOf('ux-return-validation-ui.js')>html.indexOf('ux-post-merge-integration-ui.js'),'Return validation must run after earlier therapist UX enhancers.');
assert.match(source,/s\.status==='CLOSED'/,'Return context must only select closed sessions.');
assert.match(source,/previousClosedSession/,'Return context must explicitly resolve the previous closed session.');
assert.match(source,/legacy\.hidden=true/,'The older duplicate return summary must remain hidden without observer churn.');
assert.match(source,/a\.sessionId===previous\.id/,'Previous-session measurement must come from the selected closed session.');
assert.match(source,/eventType==='FINDING_IDENTIFIED'/,'Return findings must be scoped by their actual registration event.');
assert.match(source,/e\.sessionId===sessionId&&e\.assistedEntityId===id/,'Finding registration must belong to the selected session and assisted entity.');
assert.match(source,/findingIds\.has\(f\.id\)/,'Return summary must resolve only findings identified in that session.');
assert.match(source,/Tratamentos atuais/,'Longitudinal treatments should remain current rather than frozen to the previous session.');
assert.match(source,/Concluída.*Concluído/,'Treatment component review copy should use masculine status.');

console.log('ux-return-validation.test.mjs: ok');
