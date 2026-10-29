'use strict';

var CACHE_NAME = 'bugbane-shell-v4';
var SHELL_FILES = [
  './index.html',
  './manifest.webmanifest',
  './fonts/PixelifySans-Regular.ttf',
  './fonts/PixelifySans-Medium.ttf',
  './fonts/PixelifySans-SemiBold.ttf',
  './fonts/PixelifySans-Bold.ttf',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/bugbane.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf('bugbane-shell-') === 0 && key !== CACHE_NAME;
        }).map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  var url = new URL(request.url);
  if (request.mode === 'navigate' && url.pathname === new URL('./index.html', self.registration.scope).pathname) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { return cache.put('./index.html', copy); });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html').then(function (cached) {
          if (cached) return cached;
          return new Response('Bugbane is not available offline yet. Connect once to load the game, then try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  var assetPath = SHELL_FILES.find(function (path) {
    return new URL(path, self.registration.scope).href === request.url;
  });
  if (assetPath) {
    event.respondWith(caches.match(assetPath).then(function (cached) {
      return cached || fetch(request);
    }));
  }
});
