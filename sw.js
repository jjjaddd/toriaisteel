// ⚠️ 重要: index.html・js・cssなど何かファイルを変更してpushする際は、
// 必ずこのCACHE_NAMEの末尾の文字や数字を変えること。
// 例: toriai-20260405a → toriai-20260405b
// これをしないと更新バナーがユーザーに表示されない。
const CACHE_NAME = 'toriai-20260405a';
const ASSETS = ['./', './index.html', './style.css', './main.js', './calc.js', './storage.js', './weight.js', './final-overrides.js', './update-notifier.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
