const CACHE_NAME='fluxa-runtime-v3';
const ROOT=new URL('./',self.location.href).href;
const MAX_PRECACHE_ASSETS=300;

function isLocalFluxaUrl(url){
  return url.origin===self.location.origin&&url.pathname.includes('/fluxa/');
}
function addRef(set,ref,base){
  if(!ref||/^(https?:|data:|#|mailto:|tel:)/.test(ref))return;
  try{const url=new URL(ref,base);if(isLocalFluxaUrl(url))set.add(url.href);}catch(_){}
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
function referencedUrls(text,url,contentType=''){
  if(contentType.includes('text/html')||url.endsWith('/')||url.endsWith('.html'))return htmlRefs(text,url);
  if(contentType.includes('javascript')||/\.(?:m?js)$/.test(new URL(url).pathname))return moduleRefs(text,url);
  if(contentType.includes('text/css')||url.endsWith('.css'))return cssRefs(text,url);
  return new Set();
}

async function cacheResponse(request,response){
  if(!response||!response.ok||request.method!=='GET')return response;
  const url=new URL(request.url);if(!isLocalFluxaUrl(url))return response;
  const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());return response;
}

async function precacheCurrentShell(){
  const cache=await caches.open(CACHE_NAME);
  const queue=[ROOT];const seen=new Set();
  while(queue.length&&seen.size<MAX_PRECACHE_ASSETS){
    const url=queue.shift();if(seen.has(url))continue;seen.add(url);
    try{
      const response=await fetch(url,{cache:'reload'});if(!response.ok)continue;
      await cache.put(url,response.clone());
      const contentType=response.headers.get('content-type')||'';
      if(!(contentType.includes('text/')||contentType.includes('javascript')||/\.(?:html?|css|m?js)$/.test(new URL(url).pathname)))continue;
      const text=await response.text();
      for(const ref of referencedUrls(text,url,contentType))if(!seen.has(ref)&&queue.length+seen.size<MAX_PRECACHE_ASSETS)queue.push(ref);
    }catch(_){}
  }
}

self.addEventListener('install',(event)=>{
  event.waitUntil((async()=>{try{await precacheCurrentShell();}catch(_){}await self.skipWaiting();})());
});

self.addEventListener('activate',(event)=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter((key)=>key.startsWith('fluxa-runtime-')&&key!==CACHE_NAME).map((key)=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',(event)=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(!isLocalFluxaUrl(url))return;
  event.respondWith((async()=>{
    try{return await cacheResponse(request,await fetch(request));}
    catch(error){
      const cached=await caches.match(request);if(cached)return cached;
      if(request.mode==='navigate'){const root=await caches.match(ROOT);if(root)return root;}
      throw error;
    }
  })());
});
