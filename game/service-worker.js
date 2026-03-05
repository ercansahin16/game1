const CACHE_NAME = 'manevi-oyun-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/game/index.html',
  '/firebase-core.js',
  '/license-check.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1',
  'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// Service Worker kurulumu
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Önbellek açıldı');
        return cache.addAll(urlsToCache);
      })
  );
});

// İstekleri yakala ve önbellekten döndür
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Önbellekte varsa döndür, yoksa ağdan al
        return response || fetch(event.request);
      })
  );
});

// Eski önbellekleri temizle
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
