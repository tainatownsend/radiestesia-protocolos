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

const required = [
  'app.js','viewport-ui.js','offline-ui.js','today-continuity-ui.js','assisted-context-ui.js','assisted-quick-pick-ui.js','backlog-ui.js','treatment-create-ui.js','treatment-planning-ui.js','treatment-objective-ui.js','follow-up-treatment-ui.js',
  'protocol-ui.js','custom-protocol-ui.js','branching-resume-ui.js','finding-classification-ui.js','remaining-ui.js','treatment-card-identity-ui.js','workflow-integrity-ui.js',
  'activity-library-ui.js','library-refinement-ui.js','library-favorites-ui.js','bulk-library-ui.js','tool-picker-search-ui.js','therapist-experience-ui.js','session-fast-flow-ui.js','quick-input-ui.js','quick-percentage-ui.js','repeat-component-ui.js','recent-choice-ui.js','touch-select-ui.js','longitudinal-insights-ui.js','reports-ui.js','client-report-ui.js','therapist-language-ui.js','universal-search-ui.js','traceability-ui.js','history-ui.js','session-report-history-ui.js','reiki-outside-ui.js','reiki-lifecycle-ui.js','structured-preparation-ui.js','preparation-repeat-ui.js','guided-preparation-ui.js',
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
assert.match(serviceWorker, /fetch\(request\)/, 'Offline worker should try the network before cache fallback.');
assert.match(serviceWorker, /caches\.match\(request\)/, 'Offline worker should use cached fallback when network fails.');

console.log('static-smoke.test.mjs: ok');
