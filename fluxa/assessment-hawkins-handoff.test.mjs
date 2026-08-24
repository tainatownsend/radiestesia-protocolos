import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui=await readFile(new URL('./assessment-protocol-handoff-ui.js',import.meta.url),'utf8');
const assessmentDialogFn=ui.slice(ui.indexOf('function assessmentDialog'),ui.indexOf('function generalAssessmentHandoff'));
const startFn=ui.slice(ui.indexOf('function startSuggestedProtocol'),ui.indexOf('function openGeneralAssessmentFromCatalog'));

assert.ok(ui.includes("from './hawkins-measurement.js'"),'assessment handoff must depend on Hawkins measurement rules');
assert.ok(ui.includes('assessment-hawkins-baseline-form'),'suggested-protocol flow must expose a compact baseline form when needed');
assert.ok(ui.includes('recordHawkinsBaseline'),'handoff baseline must use the shared local-first Hawkins domain helper');
assert.ok(assessmentDialogFn.includes('source.sessionId !== session.id'),'general-assessment handoff must reject a source measurement from another session before rendering it');
assert.ok(assessmentDialogFn.includes('source.assistedEntityId !== assisted.id'),'general-assessment handoff must reject a source measurement from another Assisted before rendering it');
assert.ok(assessmentDialogFn.indexOf('source.sessionId !== session.id')<assessmentDialogFn.indexOf("const wrap = document.createElement('div')"),'source context validation must happen before the orienting-assessment overlay is rendered');
assert.match(assessmentDialogFn,/if \(sourceAssessmentId && \(!source \|\| source\.sessionId !== session\.id \|\| source\.assistedEntityId !== assisted\.id\)\) \{[\s\S]*?sourceAssessmentId = null;[\s\S]*?return;/,'stale source handoff must clear transient source state and stop before rendering');
assert.ok(assessmentDialogFn.includes('Esta medição pertence a outra sessão ou Assistido.'),'stale source handoff must explain why a new current-context measurement is required');
assert.ok(startFn.includes('currentHawkinsBaseline()'),'suggested protocol start must verify the current prepared-session baseline');
assert.match(startFn,/if\(!currentHawkinsBaseline\(\)\)\{[\s\S]*?return;/,'protocol start must stop before creating an investigation when the baseline is missing');
const baselineGuard=startFn.indexOf('if(!currentHawkinsBaseline())');
const normalHandoffClose=startFn.indexOf("close('#assessment-suggestions-overlay')",baselineGuard);
assert.ok(baselineGuard<normalHandoffClose,'baseline guard must run before the normal handoff overlay close');
assert.ok(startFn.includes('Registre a frequência vibracional de Hawkins em Hz antes de iniciar o protocolo.'),'missing baseline must give an actionable message');
assert.ok(ui.includes('restoreSuggestionAfterFailedStart'),'failed protocol starts must preserve and restore the recorded assessment suggestions');
assert.match(startFn,/if\(!selectedAssessment\)[\s\S]*?return;/,'handoff must verify that the selected orienting assessment still exists before closing suggestions');
assert.ok(startFn.includes('selectedAssessment.sessionId!==session.id'),'handoff must reject an assessment from a stale session before starting a protocol');
assert.ok(startFn.includes('selectedAssessment.assistedEntityId!==session.currentAssistedEntityId'),'handoff must reject an assessment from a stale Assisted context before starting a protocol');
const contextGuard=startFn.indexOf('if(selectedAssessment.sessionId!==session.id||selectedAssessment.assistedEntityId!==session.currentAssistedEntityId)');
assert.ok(contextGuard>startFn.indexOf('if(!selectedAssessment)'),'context guard must run only after confirming the recorded assessment still exists');
assert.ok(contextGuard<baselineGuard,'context guard must run before reading the current-session Hawkins baseline');
assert.ok(contextGuard<startFn.indexOf('proxy.click()'),'context guard must run before any proxy protocol-start side effect');
assert.match(startFn,/if\(selectedAssessment\.sessionId!==session\.id\|\|selectedAssessment\.assistedEntityId!==session\.currentAssistedEntityId\)\{[\s\S]*?assessmentId=null;[\s\S]*?return;/,'stale handoff must close and clear its transient UI state without starting anything');
assert.ok(startFn.includes('Esta avaliação pertence a outra sessão ou Assistido.'),'stale handoff must explain why the therapist needs to redo the assessment in the current context');
assert.match(startFn,/if\(!investigation\)\{restoreSuggestionAfterFailedStart/,'handoff must not claim success when the protocol start did not produce a valid investigation');
assert.ok(startFn.includes('try{\n    linkOrientingAssessmentToProtocol'),'assessment linking must be guarded so persistence/context failures remain recoverable');
assert.ok(startFn.includes('investigationId:investigation.id'),'handoff must link only after resolving a concrete investigation ID');
assert.ok(startFn.indexOf('assessmentId = null')>startFn.indexOf('linkOrientingAssessmentToProtocol'),'assessment handoff state must clear only after a successful link');

console.log('assessment-hawkins-handoff.test.mjs: ok');
