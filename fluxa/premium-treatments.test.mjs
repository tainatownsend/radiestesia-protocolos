import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('.',import.meta.url);
const css=fs.readFileSync(new URL('./premium-reference.css',root),'utf8');
const app=fs.readFileSync(new URL('./app.js',root),'utf8');
const planning=fs.readFileSync(new URL('./treatment-planning-ui.js',root),'utf8');

assert.match(app,/class="card treatment-card"/,'Treatment route must render canonical treatment cards.');
assert.match(app,/status-pill/,'Treatment cards must keep an explicit lifecycle status.');
assert.match(app,/data-review-treatment/,'Review action must remain available on in-progress treatments.');
assert.match(app,/data-interrupt-treatment/,'Interrupt action must remain available without lifecycle changes.');
assert.match(planning,/data-planned-component-summary/,'Planned treatments must keep component planning context.');
assert.match(planning,/data-start-planned-treatment/,'Planned treatment start action must remain intact.');

assert.match(css,/\.treatment-card\{[^}]*border-radius:19px/,'Premium treatment cards should use the refined rounded surface.');
assert.match(css,/\.treatment-card \.status-pill\{[^}]*background:#E8EFED/,'Treatment status should use the quiet teal-soft treatment.');
assert.match(css,/\.treatment-card>\.muted,\.treatment-card>\[data-planned-component-summary\]\{[^}]*background:#F1F4F2/,'Treatment timing/planning metadata should have a distinct soft information surface.');
assert.match(css,/\.treatment-card \.button-row\{[^}]*border-top:1px solid var\(--premium-line\)/,'Treatment actions should be separated by a subtle divider.');
assert.match(css,/\[data-review-treatment\]\{[^}]*background:#173F46/,'Review should be the visually primary treatment action.');
assert.match(css,/\[data-interrupt-treatment\]\{[^}]*color:#875047/,'Interrupt should use the restrained terracotta destructive treatment.');
assert.doesNotMatch(css,/\.treatment-card[^\n]*linear-gradient/,'Treatment cards should remain editorial rather than gradient-heavy.');

console.log('premium-treatments.test.mjs: ok');
