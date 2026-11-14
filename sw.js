// Service Worker for Mother's Hut Instant Image Caching
// Intercepts all requests to mothershut.com/uploads/menu/ and serves from Cache Storage first
const CACHE_NAME = 'mothershut-menu-images-v1';

self.addEventListener('install', (event) => {
    // Activate worker immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Cache-First strategy for images
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Intercept menu photos and logo
    const isMenuImage = url.hostname === 'mothershut.com' && url.pathname.includes('/uploads/menu/');
    const isLogo = url.pathname.endsWith('logo.png');
    const isImage = isMenuImage || isLogo || request.destination === 'image';

    if (isImage) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached image immediately!
                        // Fetch fresh in background to update cache (stale-while-revalidate)
                        fetch(request).then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                cache.put(request, networkResponse.clone());
                            }
                        }).catch(() => {/* offline or network hiccup */});
                        return cachedResponse;
                    }

                    // Not in cache yet, fetch from network and cache it
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Fallback response if offline and not in cache
                        return new Response('', { status: 404, statusText: 'Not Found' });
                    });
                });
            })
        );
    }
});
