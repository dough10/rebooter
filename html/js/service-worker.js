var cacheName = 'rebooter-V1';
var files = [
  '/css/rebooter-client.min.css',
  '/js/rebooter-client.min.js',
  '/js/paper-ripple.min.js',
  '/index.html',
  '/src.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(cacheName).then(function (cache) {
    files.forEach(function (file) {
      console.log(file + ' cached');
    });
    return cache.addAll(files);
  }));
});

self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request).then(function (response) {
    if (response) return response;
    return fetch(e.request);
  }));
});
