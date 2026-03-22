const CACHE_NAME = 'steel-optimizer-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/storage.js',
  '/calc.js',
  '/main.js',
  '/worker.js',
  '/manifest.json',
];

// インストール：全アセットをキャッシュ
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// フェッチ：キャッシュ優先、なければネットワーク
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        // 成功したらキャッシュに追加
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return res;
      });
    }).catch(function() {
      // オフライン時はindex.htmlを返す
      return caches.match('/index.html');
    })
  );
});
