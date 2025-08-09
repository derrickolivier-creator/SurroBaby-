// Simple service worker for Surrogacy Journey PWA
const CACHE = 'surro-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.headers.get('accept')?.includes('application/json')){
    e.respondWith(fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(req, copy));
      return res;
    }).catch(()=>caches.match(req).then(r=> r || new Response('{}',{headers:{'Content-Type':'application/json'}}))));
    return;
  }
  if (url.origin === location.origin){
    e.respondWith(caches.match(req).then(cached=> cached || fetch(req).catch(()=> caches.match('./offline.html'))));
  }
});
