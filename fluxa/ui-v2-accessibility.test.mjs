import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mobileSheet } from './ui-v2/components/mobile-sheet.js';

const source = fs.readFileSync(new URL('./ui-v2/components/mobile-sheet.js', import.meta.url), 'utf8');
const html = mobileSheet({
  eyebrow:'Sessão', title:'Teste', body:'<p>Conteúdo</p>', primaryLabel:'Continuar', secondaryLabel:'Voltar',
});

assert.match(html, /role="dialog"/);
assert.match(html, /aria-modal="true"/);
assert.match(html, /aria-labelledby="v2-sheet-title"/);
assert.match(html, /tabindex="-1"/);
assert.match(html, /aria-label="Fechar"/);
assert.match(source, /a\[href\]/);
assert.match(source, /!sheet\.contains\(activeElement\)/);
assert.match(source, /sheet\.focus\?\.\(\{ preventScroll: true \}\)/);
assert.match(source, /event\.preventDefault\(\)/);

console.log('ui-v2-accessibility.test.mjs: ok');
