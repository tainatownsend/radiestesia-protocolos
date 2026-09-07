import assert from 'node:assert/strict';
import { newAssistedSheet } from './ui-v2/library/new-assisted-sheet.js';

const html = newAssistedSheet({}, { error:'' });
assert.match(html, /data-v2-library-person-name[^>]*required/,'Acervo person name must be exposed as required to the browser and assistive technology.');
assert.match(html, /data-v2-library-person-birthdate[^>]*required/,'Person birth date is required by the domain and must be communicated by the form.');
assert.match(html, /Cadastre a pessoa no Acervo sem alterar o Assistido atual da sessão/,'Acervo creation must make its session-context behavior explicit.');

console.log('ui-v2-library-new-assisted-required.test.mjs: ok');
