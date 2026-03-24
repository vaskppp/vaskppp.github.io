const CACHE_NAME = 'project-log-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On ignore les erreurs sur les fonts (réseau requis la première fois)
      return cache.addAll(ASSETS).catch(() => cache.add('./index.html'));
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : stratégie Cache First (hors-ligne prioritaire)
// Pour les fonts Google : Network First avec fallback cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Fonts et ressources externes → Network first
  if (url.hostname.includes('fonts.g') || url.hostname.includes('gstatic')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Ressources locales → Cache first, réseau en fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
