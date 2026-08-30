import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('.',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
const ui=read('./theme-system-ui.js');
const css=read('./theme-system.css');
const loader=read('./ux-architecture-loader.js');
const workspace=read('./workspace-shell-ui.js');

assert.match(loader,/theme-system-ui\.js/,'Theme system must load through the PR #95 architecture layer.');
assert.ok(loader.indexOf("theme-system-ui.js")<loader.indexOf("workspace-shell-ui.js"),'Theme listener must register before workspace settings so stopImmediatePropagation cannot swallow theme persistence.');
assert.match(workspace,/stopImmediatePropagation\(\)/,'Regression fixture: workspace settings still owns the form lifecycle, so loader order is required for theme persistence.');
assert.match(ui,/document\.documentElement\.dataset\.fluxaTheme=safe/,'Changing a palette must immediately update the root theme attribute.');
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

// The palette must drive both modern --fx-* tokens and every historical role used by Fluxa CSS.
for(const [role,token] of [
  ['--bg','--fx-bg'],['--surface','--fx-surface'],['--surface-2','--fx-surface-soft'],
  ['--primary','--fx-action'],['--primary-strong','--fx-primary-strong'],['--secondary','--fx-primary'],
  ['--accent','--fx-accent'],['--text','--fx-text'],['--muted','--fx-muted'],['--border','--fx-border'],
  ['--fluxa-bg','--fx-bg'],['--fluxa-surface','--fx-surface'],['--fluxa-surface-soft','--fx-surface-soft'],
  ['--fluxa-teal','--fx-action'],['--fluxa-teal-deep','--fx-primary-strong'],['--fluxa-teal-muted','--fx-primary'],
  ['--fluxa-coral','--fx-accent'],['--fluxa-text','--fx-text'],['--fluxa-muted','--fx-muted'],['--fluxa-border','--fx-border']
]){
  assert.match(css,new RegExp(`${role.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}:var\\(${token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\)`),`${role} must follow ${token} so legacy/final visual layers recolor with the selected palette.`);
}
assert.match(css,/html\{background:var\(--fx-bg\)!important;\}/,'The document canvas must change with the selected palette, not only individual cards.');
assert.match(css,/--fx-primary:#24A79A/,'Fresh Energy must retain the approved luminous aqua primary.');
assert.match(css,/--fx-accent:#F08D79/,'Fresh Energy must retain the approved coral accent.');
assert.match(css,/--fx-sun:#F4CA55/,'Fresh Energy must retain a restrained sunny accent.');
assert.match(css,/\.btn\.primary\{background:var\(--fx-action\)!important;color:#fff!important/,'White-text primary actions must use the contrast-safe semantic action token.');
assert.match(css,/hero-card \.hero-btn\{background:var\(--fx-action\)!important;color:#fff!important/,'The idle Home CTA must use the same accessible action token.');
assert.match(css,/\.eyebrow\{color:var\(--fx-primary-strong\)!important/,'Small eyebrow text must use the strong theme token rather than the luminous decorative primary.');
assert.match(css,/\.topbar-session-open\{background:linear-gradient\(120deg,var\(--fx-primary-strong\),color-mix\(in srgb,var\(--fx-primary\) 18%,var\(--fx-primary-strong\)\)\)!important;\}/,'Open-session chrome must keep white controls on a dark theme-derived field.');
assert.doesNotMatch(css,/\.topbar-session-open\{background:linear-gradient\(120deg,var\(--fx-primary-strong\),var\(--fx-primary\)\)/,'Session chrome must not fade directly into the low-contrast luminous primary.');
assert.match(css,/:focus-visible\{outline:3px solid var\(--fx-focus\)!important/,'Keyboard focus must use a dedicated contrast-safe token rather than the decorative accent.');

function rgb(hex){const value=hex.replace('#','');return [0,2,4].map((offset)=>parseInt(value.slice(offset,offset+2),16)/255);}
function luminance(hex){const [r,g,b]=rgb(hex).map((value)=>value<=0.03928?value/12.92:((value+0.055)/1.055)**2.4);return 0.2126*r+0.7152*g+0.0722*b;}
function contrast(a,b){const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (high+0.05)/(low+0.05);}
const themeBlocks=[
  ['FRESH_ENERGY',css.match(/:root,\[data-fluxa-theme="FRESH_ENERGY"\]\{([^}]*)\}/)?.[1]],
  ['MORNING_LIGHT',css.match(/\[data-fluxa-theme="MORNING_LIGHT"\]\{([^}]*)\}/)?.[1]],
  ['GENTLE_FLOW',css.match(/\[data-fluxa-theme="GENTLE_FLOW"\]\{([^}]*)\}/)?.[1]]
];
const seenSignatures=new Set();
for(const [theme,block] of themeBlocks){
  assert.ok(block,`${theme} token block must exist.`);
  const action=block.match(/--fx-action:(#[0-9A-Fa-f]{6})/)?.[1];
  const strong=block.match(/--fx-primary-strong:(#[0-9A-Fa-f]{6})/)?.[1];
  const muted=block.match(/--fx-muted:(#[0-9A-Fa-f]{6})/)?.[1];
  const focus=block.match(/--fx-focus:(#[0-9A-Fa-f]{6})/)?.[1];
  const bg=block.match(/--fx-bg:(#[0-9A-Fa-f]{6})/)?.[1];
  const heroB=block.match(/--fx-hero-b:(#[0-9A-Fa-f]{6})/)?.[1];
  assert.ok(action&&strong&&muted&&focus&&bg&&heroB,`${theme} must define action, strong, muted, focus, background and hero tokens.`);
  assert.ok(contrast(action,'#FFFFFF')>=4.5,`${theme} white-text action contrast must meet WCAG AA for normal text.`);
  assert.ok(contrast(strong,'#FFFFFF')>=4.5,`${theme} strong theme token must safely support white text in session chrome.`);
  assert.ok(contrast(muted,'#FFFFFF')>=4.5,`${theme} muted text must remain readable at small sizes on light surfaces.`);
  assert.ok(contrast(focus,'#FFFFFF')>=3,`${theme} focus indicator must retain at least 3:1 contrast on light surfaces.`);
  const signature=[action,bg,heroB].join('|');
  assert.ok(!seenSignatures.has(signature),`${theme} must be visually distinct from the other palettes.`);
  seenSignatures.add(signature);
}

assert.match(css,/body\.fluxa-home-idle \.hero-card/,'Theme system must cover the idle Home hero.');
assert.match(css,/\.treatment-card/,'Theme system must cover treatments.');
assert.match(css,/:focus-visible/,'Theme system must preserve visible keyboard focus.');

console.log('theme-system.test.mjs: ok');
