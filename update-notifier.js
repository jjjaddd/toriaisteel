(function() {
  var banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.style.cssText = 'display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#ede9fe;color:#4c1d95;padding:12px 20px;border-radius:10px;border:1.5px solid #6d28d9;z-index:9999;align-items:center;gap:12px;font-family:Space Grotesk,Noto Sans JP,sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(109,40,217,.2);';
  banner.innerHTML = '<span>\uD83D\uDD04 \u65B0\u3057\u3044\u66F4\u65B0\u304C\u3042\u308A\u307E\u3059</span><button onclick="doUpdate()" style="background:#6d28d9;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">\u66F4\u65B0\u3059\u308B</button>';
  document.body.appendChild(banner);

  var _swReg = null;
  function showBanner() {
    banner.style.display = 'flex';
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function(reg) {
      _swReg = reg;
      if (reg.waiting) {
        showBanner();
        return;
      }
      reg.addEventListener('updatefound', function() {
        var nw = reg.installing;
        nw.addEventListener('statechange', function() {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showBanner();
          }
        });
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
  }

  window.doUpdate = function() {
    if (_swReg && _swReg.waiting) {
      _swReg.waiting.postMessage('SKIP_WAITING');
    } else {
      caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(k) { return caches.delete(k); }));
      }).then(function() {
        window.location.reload(true);
      });
    }
  };
})();
