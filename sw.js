// Basic service worker for caching static assets (optional)
const CACHE = 'skylong-v1';
const assets = [
  'index.html','login.html','statistiche.html','css/styles.css','js/app.js','js/statistics.js','js/config.json',"img/logo.png", "img/benzina.png","img/cestino.png","ing/file.png"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
