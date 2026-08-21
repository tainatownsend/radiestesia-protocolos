import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const drafts=fs.readFileSync(new URL('./form-draft-ui.js',root),'utf8');
const reiki=fs.readFileSync(new URL('./reiki-mode-ui.js',root),'utf8');
const therapist=fs.readFileSync(new URL('./therapist-experience-ui.js',root),'utf8');

// Form drafts: rejected/validation-error submits keep their content, while accepted
// submits that replace/remove the form clear the old draft key.
assert.match(drafts,/if\(!form\.isConnected\)removeKey\(draftKey\);else save\(form\);/,
  'Form draft submit handling must clear only after the form leaves the DOM and preserve rejected submits.');
assert.match(drafts,/MAX_AGE_MS=24\*60\*60\*1000/,
  'Session form drafts must expire rather than linger indefinitely.');
assert.match(drafts,/sessionStorage\.setItem\(draftKey,JSON\.stringify\(serialize\(form\)\)\)/,
  'Form drafts must remain session-local rather than entering therapeutic state.');

// Session Reiki: treatment context is chosen before start and applied only to the
// application created by that start action.
assert.match(reiki,/id="reiki-session-start-form"[\s\S]*name="treatmentId"/,
  'Session Reiki start must offer an optional treatment link before creating the application.');
assert.match(reiki,/const before=new Set\(store\.getState\(\)\.reikiApplications\.map\(i=>i\.id\)\)/,
  'Reiki start must snapshot existing application IDs before creation.');
assert.match(reiki,/filter\(i=>!before\.has\(i\.id\)\)/,
  'Reiki context must target only a newly created application.');
assert.match(reiki,/if\(app\)setApplicationContext\(app\.id,\{mode,treatmentId\}\)/,
  'Mode and treatment context must be written only when creation actually produced an application.');

// Retrospective/out-of-session treatment links use the same "new application only"
// strategy and do nothing when no treatment was selected.
assert.match(therapist,/if\(!treatmentId\)return;/,
  'Optional retrospective Reiki treatment linking must remain optional.');
assert.match(therapist,/filter\(\(r\)=>!before\.has\(r\.id\)\)/,
  'Retrospective Reiki linking must never mutate a pre-existing application by accident.');

console.log('daily-safety-regressions.test.mjs: ok');
