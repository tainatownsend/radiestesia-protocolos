import fs from 'node:fs';
import assert from 'node:assert/strict';

const planning = fs.readFileSync(new URL('./treatment-planning-ui.js', import.meta.url), 'utf8');
const fastFlow = fs.readFileSync(new URL('./session-fast-flow-ui.js', import.meta.url), 'utf8');
const protocolUi = fs.readFileSync(new URL('./protocol-ui.js', import.meta.url), 'utf8');
const reikiModeUi = fs.readFileSync(new URL('./reiki-mode-ui.js', import.meta.url), 'utf8');
const clientReportUi = fs.readFileSync(new URL('./client-report-ui.js', import.meta.url), 'utf8');

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
assert.match(
  protocolUi,
  /data-finding-classification-for/,
  'branching protocol submit must honor per-finding classification controls'
);
assert.match(
  protocolUi,
  /confirmBranchingFindings\(store,form\.dataset\.investigation,\[nodeId\],perFinding\?\.value\|\|fallback\)/,
  'each selected branching finding must be persisted with its own classification'
);
assert.doesNotMatch(
  reikiModeUi,
  /data-session-reiki-mode=/,
  'Reiki mode controls must not be permanently injected into the Today workspace'
);
assert.match(
  reikiModeUi,
  /reiki-session-start-form/,
  'Reiki mode and optional treatment link should live inside the start flow'
);
assert.match(
  clientReportUi,
  /b\.className='btn secondary wide'/,
  'client-share summary action should render as a visible report button'
);

console.log('UI idempotency checks passed');
