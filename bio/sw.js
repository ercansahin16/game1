const CACHE_NAME = 'glossy-touch-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admindash.html',
  '/templatemo-glossy-touch.css',
  '/templatemo-glossy-touch.js',
  '/manifest.json',
  '/images/templatemo-futuristic-girl.jpg'
  // Gerekirse başka statik dosyaları da ekleyin (örneğin ikonlar)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});
