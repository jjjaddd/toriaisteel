// guide.js — バージョン表示 & 更新履歴（使い方ガイドは一旦削除）

var APP_VERSION = '1.0.0';

// ── Changelog ──────────────────────────────────────────────
function openChangelog() {
  var m = document.getElementById('changelogModal');
  if (!m) return;
  m.style.display = 'flex';
  var body = document.getElementById('changelogBody');
  if (!body) return;
  body.innerHTML = '<p style="color:var(--g3);font-size:12px">読み込み中...</p>';
  fetch('./CHANGELOG.md')
    .then(function(r) { return r.text(); })
    .then(function(md) { body.innerHTML = _parseMd(md); })
    .catch(function() { body.innerHTML = '<p style="color:var(--rd)">読み込みに失敗しました</p>'; });
}

function closeChangelog() {
  var m = document.getElementById('changelogModal');
  if (m) m.style.display = 'none';
}

function _parseMd(md) {
  var BADGE = {
    NEW:    'background:#dcfce7;color:#166534',
    FIX:    'background:#fee2e2;color:#991b1b',
    CHANGE: 'background:#fef9c3;color:#854d0e'
  };
  var html = '';
  md.split('\n').forEach(function(line) {
    line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (/^## /.test(line)) {
      html += '<h3 style="font-size:13px;font-weight:700;color:var(--ink);margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--line)">' + line.slice(3) + '</h3>';
    } else if (/^# /.test(line)) {
      html += '<h2 style="font-size:14px;font-weight:700;color:var(--br);margin-bottom:8px">' + line.slice(2) + '</h2>';
    } else if (/^- /.test(line)) {
      var text = line.slice(2);
      text = text.replace(/\[(NEW|FIX|CHANGE)\]/g, function(_, tag) {
        var s = BADGE[tag] || '';
        return '<span style="' + s + ';font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:4px">' + tag + '</span>';
      });
      html += '<div style="font-size:12px;color:var(--g2);padding:3px 0 3px 8px;line-height:1.6">' + text + '</div>';
    }
  });
  return html;
}

// ── バージョン表示 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var vEl = document.getElementById('appVersionLabel');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;
  var cvEl = document.getElementById('changelogVersion');
  if (cvEl) cvEl.textContent = 'v' + APP_VERSION;
});

// 後方互換：旧 openGuide/closeGuide 呼び出しは no-op にして誤動作を防ぐ
function openGuide() {}
function closeGuide() {}
function guideNext() {}
function guidePrev() {}
