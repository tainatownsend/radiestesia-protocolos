import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const composer = fs.readFileSync(new URL('./ui-v2/treatment/treatment-composer.js', root), 'utf8');
const treatmentCss = fs.readFileSync(new URL('./ui-v2/treatment.css', root), 'utf8');
const settingsCss = fs.readFileSync(new URL('./ui-v2/library-settings.css', root), 'utf8');

assert.match(
  composer,
  /class="v2-treatment-modality-base"/,
  'Treatment composition must use a treatment-owned modality summary class.',
);
assert.doesNotMatch(
  composer,
  /class="v2-modality-base"/,
  'Treatment composition must not reuse the Settings modality class.',
);
assert.match(
  treatmentCss,
  /\.v2-treatment-modality-base\s*(?:,|\{)/,
  'Treatment CSS must own the treatment modality summary geometry.',
);
assert.match(
  treatmentCss,
  /\.v2-treatment-modality-base span\s*(?:,|\{)/,
  'Treatment CSS must own the treatment modality summary supporting copy.',
);
assert.doesNotMatch(
  treatmentCss,
  /(^|\n)\.v2-modality-base(?:\s|,|\{)/,
  'Treatment CSS must not style the Settings modality class.',
);
assert.match(
  settingsCss,
  /\.v2-modality-base\s*\{/,
  'Settings must retain its own modality presentation after the Treatment split.',
);

console.log('ui-v2-modality-style-boundary.test.mjs: ok');
