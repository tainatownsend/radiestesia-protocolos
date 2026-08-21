import fs from 'node:fs';
import assert from 'node:assert/strict';

const planning = fs.readFileSync(new URL('./treatment-planning-ui.js', import.meta.url), 'utf8');
const fastFlow = fs.readFileSync(new URL('./session-fast-flow-ui.js', import.meta.url), 'utf8');

assert.match(
  planning,
  /if\(detail\.textContent!==summary\) detail\.textContent=summary;/,
  'planned-treatment MutationObserver must not rewrite unchanged summary text'
);
assert.match(
  planning,
  /if\(startButton && startButton\.disabled !== \(count===0\)\) startButton\.disabled=count===0;/,
  'planned-treatment observer should only mutate disabled state when it changes'
);
assert.match(
  fastFlow,
  /function safeSessionGet\(key\)/,
  'fast-session UI must tolerate blocked sessionStorage reads'
);
assert.match(
  fastFlow,
  /function safeSessionSet\(key,value\)/,
  'fast-session UI must tolerate blocked sessionStorage writes'
);
assert.doesNotMatch(
  fastFlow,
  /setFocusMode\(sessionStorage\.getItem/,
  'fast-session module must not read sessionStorage directly during startup'
);

console.log('UI idempotency checks passed');
