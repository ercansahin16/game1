// ===== SaadetYolu Service Worker =====
// Basit bir "app shell" önbellekleme stratejisi: uygulama kabuğunu (index.html,
// ikonlar) önbelleğe alır, böylece uygulama internetsizken de açılabilir.
// Firestore/Firebase istekleri önbelleğe ALINMAZ (her zaman ağdan gider),
// çünkü kullanıcı verisi (puan, mesajlar, arkadaşlar) her zaman güncel olmalı.

const CACHE_NAME = 'saadetyolu-shell-v1';
const APP_SHELL = [
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase / Firestore / harici API isteklerine dokunma - direkt ağa gitsin
    if (
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('cloudfunctions.net') ||
        event.request.method !== 'GET'
    ) {
        return; // servis çalışanı araya girmesin, tarayıcı normal şekilde ağa gitsin
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached); // ağ yoksa önbellekten dön

            // Önbellekte varsa hemen onu göster (hızlı açılış), arka planda da tazele
            return cached || networkFetch;
        })
    );
});
