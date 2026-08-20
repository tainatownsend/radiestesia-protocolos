import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('.', import.meta.url);
const html = fs.readFileSync(new URL('./index.html', root), 'utf8');

const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const localRefs = refs.filter((ref) => !/^(https?:|data:|#)/.test(ref));
assert.ok(localRefs.length >= 2, 'Fluxa shell should load local scripts/styles.');

for (const ref of localRefs) {
  const filePath = path.resolve(new URL(ref, root).pathname);
  assert.ok(fs.existsSync(filePath), `Missing shell dependency: ${ref}`);
}

function localModuleRefs(source) {
  const refs=[];
  const patterns=[
    /(?:import|export)\s+(?:[^'";]*?\s+from\s*)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) if (match[1].startsWith('.')) refs.push(match[1]);
  return refs;
}

const moduleQueue=localRefs.filter((ref)=>/\.m?js$/.test(ref)).map((ref)=>new URL(ref,root));
const visitedModules=new Set();
while(moduleQueue.length){
  const moduleUrl=moduleQueue.shift();
  const key=moduleUrl.href;if(visitedModules.has(key))continue;visitedModules.add(key);
  const filePath=path.resolve(moduleUrl.pathname);
  assert.ok(fs.existsSync(filePath),`Missing browser module: ${moduleUrl.pathname}`);
  const source=fs.readFileSync(filePath,'utf8');
  for(const ref of localModuleRefs(source)){
    const target=new URL(ref,moduleUrl);
    assert.ok(target.pathname.startsWith(root.pathname),`Module import escapes Fluxa scope: ${ref} from ${moduleUrl.pathname}`);
    assert.ok(fs.existsSync(path.resolve(target.pathname)),`Missing imported browser module: ${ref} from ${moduleUrl.pathname}`);
    moduleQueue.push(target);
  }
}
assert.ok(visitedModules.size>localRefs.filter((ref)=>/\.m?js$/.test(ref)).length,'Browser module graph should include imported dependencies beyond index scripts.');

const required = [
  'app.js','persistence-status-ui.js','viewport-ui.js','offline-ui.js','today-continuity-ui.js','form-draft-ui.js','assisted-context-ui.js','assisted-quick-pick-ui.js','backlog-ui.js','treatment-create-ui.js','treatment-planning-ui.js','treatment-objective-ui.js','follow-up-treatment-ui.js',
  'protocol-ui.js','custom-protocol-ui.js','branching-resume-ui.js','finding-classification-ui.js','remaining-ui.js','treatment-card-identity-ui.js','workflow-integrity-ui.js',
  'activity-library-ui.js','library-refinement-ui.js','library-favorites-ui.js','bulk-library-ui.js','tool-picker-search-ui.js','session-template-ui.js','therapist-experience-ui.js','session-fast-flow-ui.js','quick-input-ui.js','quick-percentage-ui.js','repeat-component-ui.js','recent-choice-ui.js','touch-select-ui.js','longitudinal-insights-ui.js','reports-ui.js','client-report-ui.js','therapist-language-ui.js','universal-search-ui.js','traceability-ui.js','history-ui.js','session-report-history-ui.js','reiki-outside-ui.js','reiki-lifecycle-ui.js','structured-preparation-ui.js','preparation-repeat-ui.js','guided-preparation-ui.js',
  'import-ui.js','backup-reminder-ui.js','validation-ui.js','a11y.js','styles.css','remaining.css','visual-polish.css','interaction-polish.css','daily-use-polish.css','manifest.webmanifest','icon.svg'
];
for (const file of required) assert.ok(localRefs.includes(file), `index.html must include ${file}`);

assert.ok(fs.existsSync(new URL('./service-worker.js', root)), 'Fluxa offline service worker must exist.');
assert.equal(new Set(localRefs).size, localRefs.length, 'Shell should not load duplicate local assets.');
assert.match(html, /<html lang="pt-BR">/);
assert.match(html, /<title>Fluxa<\/title>/);
assert.match(html, /meta name="theme-color" content="#173F46"/);
assert.match(html, /meta name="apple-mobile-web-app-title" content="Fluxa"/);
assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
assert.doesNotMatch(html, /Radiestesia Terapêutica|Radiestesia & Reiki|Lumera/);
assert.equal((html.match(/data-route=/g)||[]).length,0,'navigation is rendered by app.js, not duplicated in the shell');

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.webmanifest', root), 'utf8'));
assert.equal(manifest.name, 'Fluxa');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.theme_color, '#173F46');
assert.equal(manifest.start_url, './');

const serviceWorker = fs.readFileSync(new URL('./service-worker.js', root), 'utf8');
assert.match(serviceWorker, /fluxa-runtime-v2/, 'Offline worker cache generation should match the complete-module precache implementation.');
assert.match(serviceWorker, /moduleRefs\(/, 'Offline worker should discover static/dynamic local module dependencies.');
assert.match(serviceWorker, /referencedUrls\(/, 'Offline worker should recursively inspect cached text assets.');
assert.match(serviceWorker, /MAX_PRECACHE_ASSETS/, 'Offline recursive precache should remain bounded.');
assert.match(serviceWorker, /fetch\(request\)/, 'Offline worker should try the network before cache fallback.');
assert.match(serviceWorker, /caches\.match\(request\)/, 'Offline worker should use cached fallback when network fails.');

const offlineUi = fs.readFileSync(new URL('./offline-ui.js', root), 'utf8');
assert.match(offlineUi, /controllerchange/, 'App updates should be detected without automatic reload.');
assert.match(offlineUi, /data-apply-app-update/, 'App update should require an explicit therapist action.');

const draftUi = fs.readFileSync(new URL('./form-draft-ui.js', root), 'utf8');
assert.match(draftUi, /version:2/, 'Form drafts should preserve repeated fields using the contextual v2 format.');
assert.match(draftUi, /MAX_AGE_MS/, 'Form drafts should expire rather than restoring stale work indefinitely.');
assert.match(draftUi, /assistedContext\(/, 'Form drafts should be isolated by assisted context when relevant.');

const persistenceUi = fs.readFileSync(new URL('./persistence-status-ui.js', root), 'utf8');
assert.match(persistenceUi, /fluxa:persistence-error/, 'Persistence failures should surface visibly in the app shell.');
assert.match(persistenceUi, /role','alert'/, 'Persistence warning should use alert semantics.');

console.log('static-smoke.test.mjs: ok');
