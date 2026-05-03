// v165: 戦略を network-first から stale-while-revalidate に変更（2026-05-03 perf 改修）
//   - 旧: 毎回 network round-trip 発生、キャッシュは offline 用バックアップ扱いで意味なし
//   - 新: cache hit があれば即返す + 裏で network 更新 → 体感速度を劇的に改善
//   - register コードも index.html に追加（過去半年 navigator.serviceWorker.register が
//     呼ばれてなかったので SW 自体動いてなかった）
const CACHE_NAME = 'steel-optimizer-v166';

// install: 即 activate に進む（古い cache はあれば残しておいて、activate で削除）。
// 旧版にあった precache list は削除した:
//   - addAll は atomic、リスト中 1 つでも 404 で install 全失敗
//   - 過去半年メンテされてない手動リスト（実際 178 ファイル中 50 件しか入ってなかった）
//   - stale-while-revalidate で初回訪問時に各 asset が cache される（次回以降爆速）
self.addEventListener('install', function(e) {
  self.skipWaiting();
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

// stale-while-revalidate: cache hit を即座に返し、裏で network 更新する
//   - GET 以外（POST 等）と外部 origin はキャッシュ対象外
//   - cache miss 時は通常の network fetch にフォールバック
//   - network 更新が成功したら次回以降に反映される
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // POST / PUT / DELETE 等は network 直行（キャッシュしない）
  if (req.method !== 'GET') return;

  // 外部 origin（Supabase / PostHog / fonts.gstatic 等）はキャッシュしない
  // CSP で許可された外部 host への通信は SW で介入しないのが安全
  try {
    var reqUrl = new URL(req.url);
    if (reqUrl.origin !== self.location.origin) return;
  } catch (_) { return; }

  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(req).then(function(cached) {
        // 裏で network 更新（失敗しても無視。次回 cache 残存）
        var networkPromise = fetch(req).then(function(res) {
          // opaque や error は cache しない
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(function() { return null; });

        if (cached) {
          // cache hit: 即返す。network は裏で進む
          return cached;
        }
        // cache miss: network を待つ。失敗したら index.html を返す
        return networkPromise.then(function(res) {
          return res || cache.match('/index.html');
        });
      });
    })
  );
});
