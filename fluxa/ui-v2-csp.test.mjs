import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./v2.html', import.meta.url), 'utf8');
const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
assert.ok(match, 'Fluxa V2 must ship with a Content Security Policy meta tag.');
const csp = match[1];

assert.match(csp, /default-src 'self'/);
assert.match(csp, /script-src 'self'/);
assert.match(csp, /script-src-attr 'none'/);
assert.match(csp, /object-src 'none'/);
assert.match(csp, /frame-src 'none'/);
assert.match(csp, /base-uri 'none'/);
assert.match(csp, /form-action 'self'/);
assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/, 'Inline JavaScript must stay blocked even though inline style attributes are currently required.');
assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'V2 must not introduce inline script blocks that conflict with the CSP.');
assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'V2 entry markup must not introduce inline event-handler attributes.');

console.log('ui-v2-csp.test.mjs: ok');
