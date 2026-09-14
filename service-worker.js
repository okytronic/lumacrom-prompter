const CACHE_NAME = 'lumacrom-prompter-v3-1';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./service-worker.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy)).catch(()=>{});
    return resp;
  }).catch(()=> caches.match('./index.html'))));
});