import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mobileSheet } from './ui-v2/components/mobile-sheet.js';

const source = fs.readFileSync(new URL('./ui-v2/components/mobile-sheet.js', import.meta.url), 'utf8');
const composer = fs.readFileSync(new URL('./ui-v2/treatment/treatment-composer.js', import.meta.url), 'utf8');
const html = mobileSheet({
  eyebrow:'Sessão', title:'Teste', body:'<p>Conteúdo</p>', primaryLabel:'Continuar', secondaryLabel:'Voltar',
});

assert.match(html, /role="dialog"/);
assert.match(html, /aria-modal="true"/);
assert.match(html, /aria-labelledby="v2-sheet-title"/);
assert.match(html, /tabindex="-1"/);
assert.match(html, /aria-label="Fechar"/);
assert.match(source, /a\[href\]/);
assert.match(source, /const preferred = sheet\.querySelector\('\[data-v2-autofocus\]'\) \|\| sheet;/);
assert.doesNotMatch(source, /preferred = [^;]*\.v2-sheet__body input/s);
assert.match(source, /!sheet\.contains\(activeElement\) \|\| activeElement === sheet/);
assert.match(source, /sheet\.focus\?\.\(\{ preventScroll: true \}\)/);
assert.match(source, /event\.preventDefault\(\)/);
assert.doesNotMatch(composer, /data-v2-treatment-draft="title"[^>]*data-v2-autofocus/);

console.log('ui-v2-accessibility.test.mjs: ok');
