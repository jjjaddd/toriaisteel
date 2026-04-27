const CACHE_NAME = 'steel-optimizer-v82';
const ASSETS = [
  '/',
  '/index.html',
  '/src/styles/core.css',
  '/src/styles/dataTabLayout.css',
  '/src/styles/changelog.css',
  '/src/styles/gearPopup.css',
  '/src/styles/weightTable.css',
  '/src/styles/overrideLayers.css',
  '/src/styles/theme.css',
  '/src/services/storage/storageKeys.js',
  '/src/services/storage/settingsStore.js',
  '/src/services/storage/remnantsStore.js',
  '/src/services/storage/piecesHistoryStore.js',
  '/src/services/storage/inventoryStore.js',
  '/src/services/storage/cutHistoryStore.js',
  '/src/services/storage/cartStore.js',
  '/src/services/storage/weightHistoryStore.js',
  '/src/services/storage/importExportStore.js',
  '/src/calculation/orchestration.js',
  '/src/main.js',
  '/src/calculation/workers/yieldWorker.js',
  '/src/assets/manifest.json',
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) {
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).then(function(res) {
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(e.request, clone);
      });
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/index.html');
      });
    })
  );
});
