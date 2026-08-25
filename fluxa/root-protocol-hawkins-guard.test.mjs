import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./legacy-protocol-adapter.js',import.meta.url),'utf8');

assert.match(source,/import \{ requireHawkinsBaseline \} from '\.\/hawkins-measurement\.js'/,
  'Root therapeutic protocols must use the canonical Hawkins baseline guard.');
assert.match(source,/function startRootProtocol|export function startRootProtocol/);
assert.match(source,/startRootProtocol[\s\S]*?requireHawkinsBaseline\(state,\{sessionId:session\.id,assistedEntityId:session\.currentAssistedEntityId\}\)[\s\S]*?hawkinsBaselineAssessmentId:baseline\.id[\s\S]*?hawkinsBaselineHertz:baseline\.hertz/,
  'Starting a root protocol must require and persist the current-session Hawkins baseline provenance.');
assert.match(source,/resumeRootProtocol[\s\S]*?requirePreparedAssistedSessionState\(state,session\.id,inv\.assistedEntityId[\s\S]*?requireHawkinsBaseline\(state,\{sessionId:session\.id,assistedEntityId:inv\.assistedEntityId\}\)/,
  'Resuming a root protocol must require the correct Assisted and a Hawkins baseline in the current session.');
assert.match(source,/INVESTIGATION_RESUMED[\s\S]*?hawkinsBaselineAssessmentId:baseline\.id,hawkinsBaselineHertz:baseline\.hertz/,
  'Root-protocol resume history must retain the new session baseline ID and Hertz.');
assert.match(source,/answerRootProtocol[\s\S]*?requirePreparedAssistedSessionState\(draft,inv\.currentSessionId,inv\.assistedEntityId[\s\S]*?requireHawkinsBaseline\(draft,\{sessionId:inv\.currentSessionId,assistedEntityId:inv\.assistedEntityId\}\)/,
  'Every root-protocol answer must revalidate Assisted context and current-session Hawkins baseline.');
assert.doesNotMatch(source,/if\(s\)s\.currentAssistedEntityId=target\.assistedEntityId/,
  'Root-protocol resume must not silently switch the session to another Assisted to bypass explicit context selection.');

console.log('root-protocol-hawkins-guard.test.mjs: ok');
