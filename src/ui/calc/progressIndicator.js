/**
 * src/ui/calc/progressIndicator.js
 * Phase 2-3: 計算中の進捗バナー＋中断ボタン
 *
 * 公開 API (window):
 *   toriaiShowProgress({ mode })  - 計算開始時に呼ぶ
 *   toriaiHideProgress()           - 計算終了時に呼ぶ
 *   toriaiUpdateProgress(text)     - サブタイトル更新
 *
 * 中断は 'toriai:calcCancel' というカスタムイベントを発火。
 * orchestration.js が listen して worker.terminate() を呼ぶ。
 */
(function(global) {
  'use strict';
  var _bannerEl = null;
  var _timerId = null;
  var _startMs = 0;
  var _mode = 'normal';

  function ensureBanner() {
    if (_bannerEl) return _bannerEl;
    var el = document.createElement('div');
    el.id = 'toriaiCalcBanner';
    el.style.cssText = [
      'position:fixed', 'left:50%', 'top:80px', 'transform:translateX(-50%)',
      'background:#fff', 'border:2px solid #1890ff', 'border-radius:10px',
      'padding:14px 20px', 'box-shadow:0 4px 18px rgba(0,0,0,0.15)',
      'z-index:9999', 'min-width:280px', 'font-family:system-ui, sans-serif',
      'display:none'
    ].join(';');
    el.innerHTML = [
      '<div style="display:flex;align-items:center;gap:10px">',
      '  <span id="toriaiBannerSpin" style="display:inline-block;width:18px;height:18px;border:3px solid #e0e0e0;border-top-color:#1890ff;border-radius:50%;animation:tsp 0.8s linear infinite"></span>',
      '  <div style="flex:1">',
      '    <div style="font-size:14px;font-weight:600" id="toriaiBannerLabel">計算中…</div>',
      '    <div style="font-size:11px;color:#666;margin-top:2px"><span id="toriaiBannerElapsed">0</span>秒経過 <span id="toriaiBannerSub" style="margin-left:8px;color:#999"></span></div>',
      '  </div>',
      '  <button id="toriaiBannerCancel" style="border:1px solid #ddd;background:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;color:#cf1322">中断</button>',
      '</div>'
    ].join('');
    document.body.appendChild(el);

    if (!document.getElementById('toriaiSpinKf')) {
      var sty = document.createElement('style');
      sty.id = 'toriaiSpinKf';
      sty.textContent = '@keyframes tsp { to { transform: rotate(360deg); } }';
      document.head.appendChild(sty);
    }

    el.querySelector('#toriaiBannerCancel').addEventListener('click', function() {
      // 中断イベント発火（orchestration.js が listen）
      try {
        document.dispatchEvent(new CustomEvent('toriai:calcCancel'));
      } catch (_e) {}
      hide();
    });
    _bannerEl = el;
    return el;
  }

  function tick() {
    if (!_bannerEl) return;
    var elapsed = Math.floor((Date.now() - _startMs) / 1000);
    var elEl = _bannerEl.querySelector('#toriaiBannerElapsed');
    if (elEl) elEl.textContent = elapsed;
  }

  function show(opts) {
    opts = opts || {};
    _mode = opts.mode || 'normal';
    var el = ensureBanner();
    var label = el.querySelector('#toriaiBannerLabel');
    var sub = el.querySelector('#toriaiBannerSub');
    if (label) label.textContent = _mode === 'deep' ? '🐢 長考モードで計算中…' : '計算中…';
    if (sub) sub.textContent = _mode === 'deep' ? '最大3分かかります' : '';
    var elEl = el.querySelector('#toriaiBannerElapsed');
    if (elEl) elEl.textContent = '0';
    _startMs = Date.now();
    el.style.display = '';
    if (_timerId) clearInterval(_timerId);
    _timerId = setInterval(tick, 1000);
  }

  function hide() {
    if (_timerId) { clearInterval(_timerId); _timerId = null; }
    if (_bannerEl) _bannerEl.style.display = 'none';
  }

  function update(text) {
    if (!_bannerEl) return;
    var sub = _bannerEl.querySelector('#toriaiBannerSub');
    if (sub) sub.textContent = text || '';
  }

  global.toriaiShowProgress = show;
  global.toriaiHideProgress = hide;
  global.toriaiUpdateProgress = update;
})(typeof window !== 'undefined' ? window : globalThis);
