// guide.js — 使い方ガイド・バージョン・Changelog

var APP_VERSION = '1.0.0';
var GUIDE_SEEN_KEY = 'toriai_guide_seen';
var _guideSlide = 0;

var GUIDE_SLIDES = [
  {
    icon: '👋',
    title: 'TORIAIへようこそ',
    body: '鋼材の取り合い・重量計算がブラウザだけで完結する無料ツールです。インストール不要、スマホでも使えます。'
  },
  {
    icon: '📋',
    title: 'STEP 1: データタブで鋼材を管理',
    body: '鋼種・サイズ・定尺を自由に編集できます。独自サイズや特殊な定尺の登録も可能で、現場ごとにカスタマイズできます。'
  },
  {
    icon: '✂️',
    title: 'STEP 2: 取り合いタブで切断計画',
    body: '必要な長さと数量を入力すれば、バンドソー歩留まりを最適化した切断計画が自動算出されます。残材も活用できます。'
  },
  {
    icon: '⚖️',
    title: 'STEP 3: 重量シミュレーター',
    body: '鋼種・サイズ・本数から総重量と塗装面積を一瞬で算出。単価を入れれば概算金額も計算できます。'
  },
  {
    icon: '♻️',
    title: 'STEP 4: 残材・カスタム定尺',
    body: '余った材料は残材登録して次の計算に活用。特殊な定尺も追加でき、現場に合わせて育てられます。'
  }
];

function openGuide(force) {
  if (!force && localStorage.getItem(GUIDE_SEEN_KEY) === 'skip') return;
  _guideSlide = 0;
  _renderGuideSlide();
  var m = document.getElementById('guideModal');
  if (m) { m.style.display = 'flex'; document.getElementById('guideDontShow').checked = false; }
}

function closeGuide() {
  var m = document.getElementById('guideModal');
  if (m) m.style.display = 'none';
  var cb = document.getElementById('guideDontShow');
  localStorage.setItem(GUIDE_SEEN_KEY, (cb && cb.checked) ? 'skip' : 'seen');
}

function _renderGuideSlide() {
  var s = GUIDE_SLIDES[_guideSlide];
  var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  set('guideIcon', s.icon);
  set('guideTitle', s.title);
  set('guideBody', s.body);
  set('guideCounter', (_guideSlide + 1) + ' / ' + GUIDE_SLIDES.length);

  var prev = document.getElementById('guidePrevBtn');
  var next = document.getElementById('guideNextBtn');
  if (prev) prev.style.visibility = _guideSlide === 0 ? 'hidden' : 'visible';
  if (next) next.textContent = _guideSlide === GUIDE_SLIDES.length - 1 ? '閉じる ✓' : '次へ →';

  document.querySelectorAll('.guide-dot').forEach(function(d, i) {
    d.classList.toggle('active', i === _guideSlide);
  });
}

function guidePrev() {
  if (_guideSlide > 0) { _guideSlide--; _renderGuideSlide(); }
}

function guideNext() {
  if (_guideSlide < GUIDE_SLIDES.length - 1) { _guideSlide++; _renderGuideSlide(); }
  else closeGuide();
}

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
    line = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

// ── 初回自動オープン ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // バージョン表示を更新
  var vEl = document.getElementById('appVersionLabel');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;

  // 初回のみガイドを自動表示
  if (localStorage.getItem(GUIDE_SEEN_KEY) !== 'skip') {
    setTimeout(openGuide, 600);
  }
});
