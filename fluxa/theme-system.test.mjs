import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
const ui=read('./theme-system-ui.js');
const css=read('./theme-system.css');
const loader=read('./ux-architecture-loader.js');

assert.match(loader,/theme-system-ui\.js/,'Theme system must load through the PR #95 architecture layer.');
assert.match(ui,/const DEFAULT_THEME='FRESH_ENERGY'/,'Fresh Energy must be the default theme.');
for(const theme of ['FRESH_ENERGY','MORNING_LIGHT','GENTLE_FLOW']){
  assert.match(ui,new RegExp(theme),`Theme UI must expose ${theme}.`);
  assert.match(css,new RegExp(`data-fluxa-theme=\\"${theme}\\"|${theme}\\]`),`Theme CSS must define ${theme}.`);
}
assert.match(ui,/settings\?\.appearance\?\.theme/,'Theme preference must live in settings.appearance.theme.');
assert.match(ui,/THEMES\.has\(value\)\?value:DEFAULT_THEME/,'Unknown or missing theme values must fall back to Fresh Energy.');
assert.match(ui,/name=\"fluxaTheme\"/,'Settings must expose a theme selector.');
assert.match(ui,/Fresh Energy/);
assert.match(ui,/Morning Light/);
assert.match(ui,/Gentle Flow/);
assert.match(ui,/draft\.settings\.appearance\.theme=theme/,'Chosen theme must persist locally in app settings.');
assert.match(css,/--fx-primary:#24A79A/,'Fresh Energy must retain the approved luminous aqua primary.');
assert.match(css,/--fx-accent:#F08D79/,'Fresh Energy must retain the approved coral accent.');
assert.match(css,/--fx-sun:#F4CA55/,'Fresh Energy must retain a restrained sunny accent.');
assert.match(css,/body\.fluxa-home-idle \.hero-card/,'Theme system must cover the idle Home hero.');
assert.match(css,/\.treatment-card/,'Theme system must cover treatments.');
assert.match(css,/:focus-visible/,'Theme system must preserve visible keyboard focus.');

console.log('theme-system.test.mjs: ok');
