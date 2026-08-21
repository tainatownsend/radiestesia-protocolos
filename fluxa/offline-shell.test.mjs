import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=new URL('.',import.meta.url);
const MAX_PRECACHE_ASSETS=300;

function addRef(set,ref,base){
  if(!ref||/^(https?:|data:|#|mailto:|tel:)/.test(ref))return;
  const url=new URL(ref,base);
  if(url.href.startsWith(root.href))set.add(url.href);
}
function htmlRefs(text,base){
  const refs=new Set();
  for(const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g))addRef(refs,match[1],base);
  return refs;
}
function moduleRefs(text,base){
  const refs=new Set();
  const patterns=[
    /(?:import|export)\s+(?:[^'";]*?\s+from\s*)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  for(const pattern of patterns)for(const match of text.matchAll(pattern))addRef(refs,match[1],base);
  return refs;
}
function cssRefs(text,base){
  const refs=new Set();
  for(const match of text.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?\s*\)?/g))addRef(refs,match[1],base);
  return refs;
}
function refsFor(text,url){
  const pathname=new URL(url).pathname;
  if(pathname.endsWith('/index.html'))return htmlRefs(text,url);
  if(/\.m?js$/.test(pathname))return moduleRefs(text,url);
  if(pathname.endsWith('.css'))return cssRefs(text,url);
  return new Set();
}
function read(url){return fs.readFileSync(fileURLToPath(url),'utf8');}

const start=new URL('./index.html',root);
const queue=[start.href];
const visited=new Set();
while(queue.length){
  const url=queue.shift();
  if(visited.has(url))continue;
  visited.add(url);
  const filePath=fileURLToPath(url);
  assert.ok(fs.existsSync(filePath),`Offline shell dependency is missing: ${path.relative(fileURLToPath(root),filePath)}`);
  if(!/\.(?:html|css|m?js)$/.test(new URL(url).pathname))continue;
  const text=read(url);
  for(const ref of refsFor(text,url))if(!visited.has(ref))queue.push(ref);
}

assert.ok(visited.size<MAX_PRECACHE_ASSETS,
  `Offline shell graph has ${visited.size} assets, exceeding service-worker capacity ${MAX_PRECACHE_ASSETS}.`);
const utilization=Math.round((visited.size/MAX_PRECACHE_ASSETS)*100);
assert.ok(utilization<80,
  `Offline shell graph uses ${utilization}% of the precache cap; raise capacity or reduce shell before adding more modules.`);

const index=read(start.href);
const directScripts=[...index.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m)=>new URL(m[1],start).href);
for(const script of directScripts)assert.ok(visited.has(script),`Direct shell script was not discovered for offline precache: ${script}`);

const offlineUi=read(new URL('./offline-ui.js',root));
const controllerBlock=offlineUi.slice(
  offlineUi.indexOf("navigator.serviceWorker.addEventListener('controllerchange'"),
  offlineUi.indexOf("window.addEventListener('online'")
);
assert.match(controllerBlock,/updateAvailable=true/,'A newly controlling worker should surface an update state.');
assert.match(controllerBlock,/showUpdateBanner\(\)/,'A newly controlling worker should offer an explicit update action.');
assert.doesNotMatch(controllerBlock,/location\.reload/,'Service-worker takeover must not force reload while a therapist may be editing a form.');
assert.match(offlineUi,/data-apply-app-update[\s\S]*window\.location\.reload\(\)/,
  'Reload should happen only after the user explicitly chooses Atualizar.');

console.log(`offline-shell.test.mjs: ok · ${visited.size}/${MAX_PRECACHE_ASSETS} assets (${utilization}% cap)`);
