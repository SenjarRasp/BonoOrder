// Простой Service Worker для кэширования
const CACHE_NAME = 'restaurant-orders-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting(); // Активируется сразу
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
});

self.addEventListener('fetch', (event) => {
  // Простая стратегия: сеть сначала, потом кэш
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
