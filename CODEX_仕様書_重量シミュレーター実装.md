# CODEX 実装指示書 — 重量シミュレーター ＋ バグ修正 ＋ UI改善
> 作成日：2026年4月
> 対象リポジトリ：https://github.com/jjjaddd/toriaisteel
> 対象ファイル：`index.html` / `main.js` / `weight.js`（新規）

---

## ⚠️ 前提・重要注意

- **Claude がローカルファイルを直接書き換えている。**
  GitHub Pages の公開バージョン（`main` ブランチ）とローカルファイルは内容が異なる場合がある。
  **この仕様書の指示はすべて GitHub Pages の公開コードを基準として実装すること。**

- 実装後は `main` ブランチに push して GitHub Pages に反映させる。

---

## 1. バグ修正（最優先）

### 1-1. `index.html` の先頭コメント削除

**問題：** `index.html` の1行目に以下のコメントが入っているとローカルファイル扱いになり、Chrome がリソースのロードをブロックする。

```html
<!-- saved from url=(0041)file:///C:/Users/c3pob/Desktop/index.html -->
```

**修正：** この1行を完全に削除する。

---

### 1-2. ハードコードされたファイルパスを削除

**問題：** `<head>` 内に以下の絶対パスが混入している。

```html
<link rel="manifest" href="file:///C:/Users/c3pob/Desktop/manifest.json">
```

**修正：** この行を削除する。`manifest.json` の読み込みは以下の相対パスの記述が既にあるので不要。

```html
<link rel="manifest" href="manifest.json">
```

---

### 1-3. 重複 meta タグの整理

**問題：** `<head>` 内に `theme-color`・`mobile-web-app-capable` などの meta タグが2回書かれている。

**修正：** 重複している側（`file:///` のコメントの直後にある古いブロック）を削除し、以下1セットだけ残す。

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="theme-color" content="#111111">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="鋼材計算">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
```

---

### 1-4. 壊れたフォントリンクを修正

**問題：** 以下のリンクはローカル保存時のゴミファイルを参照しており 404 になる。

```html
<link href="./STEEL.OPTIMIZER β_files/css2" rel="stylesheet">
```

**修正：** この行を削除し、代わりに以下を追加する。

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap">
```

---

### 1-5. NaN・undefined 表示バグ（残材在庫）

**問題：** 初期表示で `333mm × undefined本 (undefined)` や `在庫 NaN本` が表示される。

**修正方針：** 在庫ドロップダウン（`invSelect`）の初期生成時と、在庫バッジ（`invBadge`）の更新処理で、値が `undefined` / `NaN` の場合は `0` または `—` にフォールバックする。

```javascript
// 修正例（updateInvDropdown または関連関数内）
var qty = item.qty != null && !isNaN(item.qty) ? item.qty : 0;
var spec = item.spec || '不明';
```

---

## 2. ナビゲーションタブの順序変更

### 現状
```
在庫 ｜ 重量 ｜ 計算 ｜ 履歴 ｜ カート ｜ 問い合わせ
```

### 目標
```
計算 ｜ 履歴・在庫 ｜ 重量 ｜ カート
```

- 「履歴・在庫」は現行通り1つのタブ（クリックで内側タブ切り替え）を維持する
- 「問い合わせ」はナビから外してフッターリンク等に移動（またはナビ最後尾に小さく残す）
- カートボタン（🛒）はナビの右端に残す

### `index.html` の `<nav>` を以下に書き換える

```html
<nav>
  <a id="na"  onclick="goPage('c')">計算</a>
  <a id="nhi" onclick="goPage('hi'); hiSwitch('h')">履歴・在庫</a>
  <a id="nw"  onclick="goPage('w')">重量</a>
  <button id="cartBadge" class="cart-badge empty" onclick="openCartModal()">🛒 0件</button>
</nav>
```

### `main.js` の `goPage` 関数を以下に合わせる

```javascript
function goPage(p) {
  document.querySelectorAll('.pg').forEach(function(el){ el.classList.remove('show'); });
  ['na','nhi','nw'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  if (p === 'c') {
    document.getElementById('cp').classList.add('show');
    document.getElementById('na').classList.add('active');
  } else if (p === 'w') {
    document.getElementById('wpp').classList.add('show');
    document.getElementById('nw').classList.add('active');
    if (typeof wInit === 'function') wInit();
  } else if (p === 'contact') {
    var cop = document.getElementById('cop');
    if (cop) cop.classList.add('show');
  } else {
    // 'hi' / 'h' / 'i' すべて履歴・在庫ページ
    document.getElementById('hip').classList.add('show');
    document.getElementById('nhi').classList.add('active');
    var showH = (p !== 'i');
    document.getElementById('hiPanelH').style.display = showH ? 'block' : 'none';
    document.getElementById('hiPanelI').style.display = showH ? 'none' : 'block';
    document.getElementById('hiTabH').classList.toggle('hi-tab-active', showH);
    document.getElementById('hiTabI').classList.toggle('hi-tab-active', !showH);
    if (showH) { buildHistSpecDropdown(); renderHistory(); }
    else { buildInvFilterKind(); renderInventoryPage(); }
  }
}
```

---

## 3. 重量シミュレーター 新規実装

### 3-1. ページ構成（計算ページと同じ左右レイアウト）

```
┌─────────────────┬────────────────────────────────────┐
│  左サイドバー    │  右メインエリア                     │
│  （入力）        │  （結果テーブル・複数行リスト）       │
│  310px固定       │  残り全幅                           │
└─────────────────┴────────────────────────────────────┘
```

計算ページと同じ `.layout` / `.sb` / `.mn` クラスを使う。

---

### 3-2. 左サイドバー（入力）の構成

```html
<aside class="sb">

  <!-- 鋼材種類 -->
  <section>
    <div class="shd">鋼材種類</div>
    <select id="wKind" onchange="wOnKind()"></select>
  </section>

  <!-- 規格 -->
  <section>
    <div class="shd">規格</div>
    <select id="wSpec" onchange="wOnSpec()"></select>
    <div id="wKgmDisp" style="font-size:11px;color:#8888a8;margin-top:6px"></div>
  </section>

  <!-- 長さ・本数・単価（Enterキー移動） -->
  <section>
    <div class="field">
      <label>長さ (mm)</label>
      <input type="number" id="wLen" value="6000" min="1">
    </div>
    <div class="field">
      <label>本数</label>
      <input type="number" id="wQty" value="1" min="1">
    </div>
    <!-- 単価：チェックONのときだけ入力欄が有効化される -->
    <div class="field">
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="wPriceOn" onchange="wTogglePrice()">
        単価 (円/kg) を入力する
      </label>
      <input type="number" id="wPrice" placeholder="例：120" min="0"
             disabled style="opacity:.4">
    </div>
    <div class="field">
      <label>kg/m（手動変更可）</label>
      <input type="number" id="wKgm" step="0.01" min="0.01">
    </div>
  </section>

  <!-- プレビュー（Enterで追加する前の確認用） -->
  <section id="wPreviewBox" style="display:none; background:#f4f4fa; border-radius:10px; padding:12px; font-size:12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="color:#5a5a78">1本重量</span>
      <span id="wPrev1kg" style="font-weight:700;color:#1a1a2e">—</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="color:#5a5a78">合計重量</span>
      <span id="wPrevTotalKg" style="font-weight:700;color:#6d28d9">—</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="color:#5a5a78">塗装面積(合計)</span>
      <span id="wPrevTotalM2" style="font-weight:700;color:#0891b2">—</span>
    </div>
    <div id="wPrevPriceRow" style="display:none;justify-content:space-between">
      <span style="color:#5a5a78">概算金額</span>
      <span id="wPrevPrice" style="font-weight:700;color:#16a34a">—</span>
    </div>
  </section>

  <button onclick="wAddRow()"
    style="background:#6d28d9;color:#fff;border:none;border-radius:10px;padding:10px;
           font-size:13px;font-weight:700;cursor:pointer;width:100%;margin-top:4px">
    ＋ リストに追加
  </button>
  <button onclick="wClearAll()"
    style="background:transparent;color:#aaa;border:1px solid #ddd;border-radius:10px;
           padding:7px;font-size:11px;font-weight:600;cursor:pointer;width:100%;margin-top:6px">
    リストをクリア
  </button>

  <p style="font-size:10px;color:#aaaabc;margin-top:6px">
    ※ 重量は JIS kg/m × 長さ。塗装面積は断面周長 × 長さ（概算値）。
  </p>
</aside>
```

---

### 3-3. 右メインエリア（結果テーブル）

初期は空メッセージを表示。行が追加されたらテーブルを表示。

```html
<main class="mn" id="wMain">

  <!-- 空のときのメッセージ -->
  <div id="wEmpty" style="display:flex;flex-direction:column;align-items:center;
       justify-content:center;flex:1;color:#c0c0d0;gap:12px;min-height:300px">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1" opacity=".35">
      <circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/>
    </svg>
    <p style="font-size:13px">左の入力欄で設定して「リストに追加」を押してください</p>
  </div>

  <!-- 結果テーブル -->
  <div id="wTableWrap" style="display:none;overflow-x:auto">
    <table id="wTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
      <thead>
        <tr style="background:#f4f4fa;border-bottom:2px solid #e0e0ea">
          <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">#</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">種類</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">規格</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">長さ(mm)</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">本数</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">kg/m</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">1本重量(kg)</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#6d28d9;font-weight:700">合計重量(kg)</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装1本(m²)</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;font-weight:700">塗装合計(m²)</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
          <th style="padding:8px 6px;width:28px"></th>
        </tr>
      </thead>
      <tbody id="wTbody"></tbody>
      <tfoot id="wTfoot"></tfoot>
    </table>
  </div>

</main>
```

---

### 3-4. `weight.js` 全体（新規ファイル）

以下をそのままコピーして `weight.js` として保存する。

```javascript
// weight.js — 重量シミュレーター
// 依存：calc.js が先に読み込まれ STEEL グローバル変数が存在すること

var _wInited = false;
var _wRows   = [];  // 追加された行データの配列

// ─── 初期化 ────────────────────────────────────────────────
function wInit() {
  var kindEl = document.getElementById('wKind');
  if (!kindEl || typeof STEEL !== 'object' || !STEEL) return;

  if (!_wInited) {
    // 種類ドロップダウンを生成
    kindEl.innerHTML = '';
    Object.keys(STEEL).forEach(function(kind) {
      var opt = document.createElement('option');
      opt.value = kind;
      opt.textContent = kind;
      kindEl.appendChild(opt);
    });
    _wInited = true;

    // Enterキー移動の設定
    wSetupEnter();
  }

  wOnKind();
  wRenderRows();
}

// ─── Enterキーナビゲーション ─────────────────────────────────
function wSetupEnter() {
  // 長さ → 本数 → （単価ON時のみ単価 →）kg/m は飛ばして「追加」
  document.getElementById('wLen').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('wQty').focus();
      document.getElementById('wQty').select();
    }
  });

  document.getElementById('wQty').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var priceOn = document.getElementById('wPriceOn');
      if (priceOn && priceOn.checked) {
        document.getElementById('wPrice').focus();
        document.getElementById('wPrice').select();
      } else {
        // 単価なし → そのままリストに追加
        wAddRow();
      }
    }
  });

  document.getElementById('wPrice').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      wAddRow();
    }
  });

  // 入力のたびにプレビュー更新
  ['wLen','wQty','wPrice','wKgm'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', wPreview);
  });
}

// ─── 単価チェックボックス ON/OFF ──────────────────────────────
function wTogglePrice() {
  var cb      = document.getElementById('wPriceOn');
  var priceEl = document.getElementById('wPrice');
  if (!cb || !priceEl) return;
  priceEl.disabled = !cb.checked;
  priceEl.style.opacity = cb.checked ? '1' : '.4';
  if (!cb.checked) priceEl.value = '';
  wPreview();
}

// ─── ドロップダウン連動 ─────────────────────────────────────
function wOnKind() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (!kindEl || !specEl || !STEEL) return;

  var kind  = kindEl.value;
  var specs = Array.isArray(STEEL[kind]) ? STEEL[kind] : [];
  specEl.innerHTML = '';
  specs.forEach(function(item) {
    var opt = document.createElement('option');
    opt.value      = item[0];
    opt.textContent = item[0];
    specEl.appendChild(opt);
  });
  wOnSpec();
}

function wOnSpec() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  var kgmEl  = document.getElementById('wKgm');
  var dispEl = document.getElementById('wKgmDisp');
  if (!kindEl || !specEl || !kgmEl || !dispEl || !STEEL) return;

  var kind     = kindEl.value;
  var specName = specEl.value;
  var list = Array.isArray(STEEL[kind]) ? STEEL[kind] : [];
  var hit  = list.find(function(item) { return item[0] === specName; });
  var kgm  = hit ? Number(hit[1]) : 0;

  kgmEl.value        = kgm > 0 ? String(kgm) : '';
  dispEl.textContent = specName ? specName + (kgm > 0 ? '  (' + kgm + ' kg/m)' : '') : '';
  wPreview();
}

// ─── 塗装面積計算（m²/m）────────────────────────────────────
// 鋼材規格名を文字列解析して断面周長を算出する
// 規格が増えた場合はこの関数に条件を追加するだけでよい
function wGetPaintPerM(kind, specName) {
  var name = String(specName || '').trim().toUpperCase();
  var nums = (name.match(/[\d.]+/g) || []).map(parseFloat);
  if (!nums.length || nums.some(isNaN)) return 0;

  // H形鋼  例: H-400×200×8×13
  if (name.indexOf('H-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 4 * nums[1]) / 1000;
  }
  // 溝形鋼  例: C-200×80×7.5
  if (name.indexOf('C-') === 0 && nums.length >= 3) {
    return (nums[0] + 4 * nums[1] - 2 * nums[2]) / 1000;
  }
  // I形鋼  例: I-300×10×150
  if (name.indexOf('I-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 4 * nums[nums.length - 1]) / 1000;
  }
  // 平鋼  例: FB-100x9
  if (name.indexOf('FB-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 2 * nums[1]) / 1000;
  }
  // 丸鋼  例: RB-50
  if (name.indexOf('RB-') === 0 && nums.length >= 1) {
    return Math.PI * nums[0] / 1000;
  }
  // 山形鋼（等辺・不等辺）  例: L-100×100×10 / L-75×100×10
  if (name.indexOf('L-') === 0 && nums.length >= 3) {
    if (nums[0] === nums[1]) {
      return (4 * nums[0] - 2 * nums[2]) / 1000;   // 等辺
    }
    return (2 * nums[0] + 2 * nums[1] - 2 * nums[2]) / 1000;  // 不等辺
  }
  return 0;
}

// ─── サイドバー プレビュー ───────────────────────────────────
function wPreview() {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmEl   = document.getElementById('wKgm');
  var lenEl   = document.getElementById('wLen');
  var qtyEl   = document.getElementById('wQty');
  var priceEl = document.getElementById('wPrice');
  var box     = document.getElementById('wPreviewBox');
  if (!kindEl || !specEl || !kgmEl || !lenEl || !qtyEl || !priceEl || !box) return;

  var kgm   = parseFloat(kgmEl.value)   || 0;
  var len   = parseFloat(lenEl.value)   || 0;
  var qty   = parseFloat(qtyEl.value)   || 0;
  var price = parseFloat(priceEl.value) || 0;

  if (kgm <= 0 || len <= 0 || qty <= 0) { box.style.display = 'none'; return; }

  var kg1     = kgm * len / 1000;
  var kgTotal = kg1 * qty;
  var ppm     = wGetPaintPerM(kindEl.value, specEl.value);
  var m2Total = ppm * len / 1000 * qty;

  box.style.display = 'block';
  document.getElementById('wPrev1kg').textContent     = _wFmt(kg1, 2) + ' kg';
  document.getElementById('wPrevTotalKg').textContent = _wFmt(kgTotal, 2) + ' kg';
  document.getElementById('wPrevTotalM2').textContent = _wFmt(m2Total, 2) + ' m²';

  var priceRow = document.getElementById('wPrevPriceRow');
  if (price > 0) {
    document.getElementById('wPrevPrice').textContent = _wFmt(kgTotal * price, 0) + ' 円';
    priceRow.style.display = 'flex';
  } else {
    priceRow.style.display = 'none';
  }
}

// ─── 行を追加 ─────────────────────────────────────────────
function wAddRow() {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmEl   = document.getElementById('wKgm');
  var lenEl   = document.getElementById('wLen');
  var qtyEl   = document.getElementById('wQty');
  var priceEl = document.getElementById('wPrice');
  if (!kindEl || !specEl || !kgmEl || !lenEl || !qtyEl || !priceEl) return;

  var kgm   = parseFloat(kgmEl.value)   || 0;
  var len   = parseFloat(lenEl.value)   || 0;
  var qty   = parseFloat(qtyEl.value)   || 0;
  var price = parseFloat(priceEl.value) || 0;

  if (kgm <= 0 || len <= 0 || qty <= 0) {
    alert('種類・規格・長さ・本数・kg/m を正しく入力してください。');
    return;
  }

  var kind  = kindEl.value;
  var spec  = specEl.value;
  var kg1   = kgm * len / 1000;
  var kg    = kg1 * qty;
  var ppm   = wGetPaintPerM(kind, spec);
  var m2_1  = ppm * len / 1000;
  var m2    = m2_1 * qty;

  _wRows.push({
    kind: kind, spec: spec,
    len: len, qty: qty, kgm: kgm,
    kg1: kg1, kgTotal: kg,
    m2_1: m2_1, m2Total: m2,
    amount: price > 0 ? kg * price : null
  });

  wRenderRows();

  // 次の入力のため長さにフォーカスを戻す
  lenEl.focus();
  lenEl.select();
}

// ─── 行を削除 ─────────────────────────────────────────────
function wDeleteRow(idx) {
  _wRows.splice(idx, 1);
  wRenderRows();
}

// ─── 全クリア ────────────────────────────────────────────
function wClearAll() {
  if (_wRows.length === 0) return;
  if (!confirm('リストをすべてクリアしますか？')) return;
  _wRows = [];
  wRenderRows();
}

// ─── テーブル描画 ─────────────────────────────────────────
function wRenderRows() {
  var empty     = document.getElementById('wEmpty');
  var tableWrap = document.getElementById('wTableWrap');
  var tbody     = document.getElementById('wTbody');
  var tfoot     = document.getElementById('wTfoot');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  if (_wRows.length === 0) {
    empty.style.display     = 'flex';
    tableWrap.style.display = 'none';
    return;
  }
  empty.style.display     = 'none';
  tableWrap.style.display = 'block';

  var anyPrice = _wRows.some(function(r) { return r.amount !== null; });
  var sumKg = 0, sumM2 = 0, sumAmt = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg  += r.kgTotal;
    sumM2  += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;

    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) + '</td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + (i % 2 === 1 ? 'background:#fafafa' : '') + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i + 1) + '</td>' +
      '<td style="' + _tdL + '">' + _esc(r.kind) + '</td>' +
      '<td style="' + _tdL + 'font-weight:600">' + _esc(r.spec) + '</td>' +
      '<td style="' + _tdR + '">' + r.len.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + r.qty.toLocaleString() + '</td>' +
      '<td style="' + _tdR + 'color:#8888a8">' + r.kgm + '</td>' +
      '<td style="' + _tdR + '">' + _wFmt(r.kg1, 2) + '</td>' +
      '<td style="' + _tdR + 'color:#6d28d9;font-weight:700">' + _wFmt(r.kgTotal, 2) + '</td>' +
      '<td style="' + _tdR + 'color:#0891b2">' + _wFmt(r.m2_1, 2) + '</td>' +
      '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.m2Total, 2) + '</td>' +
      amtCell +
      '<td style="padding:6px;text-align:center">' +
        '<button onclick="wDeleteRow(' + i + ')" ' +
          'style="background:none;border:1px solid #e0e0ea;border-radius:6px;cursor:pointer;' +
                 'color:#aaa;font-size:11px;padding:2px 6px;line-height:1" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  // 合計行
  var totalAmtCell = anyPrice
    ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';

  tfoot.innerHTML =
    '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
    '<td colspan="6" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
    '<td style="' + _tdR + 'color:#6d28d9;font-weight:800;font-size:14px">' + _wFmt(sumKg, 2) + ' kg</td>' +
    '<td style="' + _tdR + 'color:#8888a8">—</td>' +
    '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:14px">' + _wFmt(sumM2, 2) + ' m²</td>' +
    totalAmtCell +
    '<td></td>' +
    '</tr>';
}

// ─── ヘルパー ────────────────────────────────────────────
var _tdL = 'padding:8px 10px;text-align:left;white-space:nowrap;';
var _tdR = 'padding:8px 10px;text-align:right;white-space:nowrap;font-family:monospace;';

function _wFmt(v, dec) {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

---

### 3-5. `index.html` に重量ページブロックを追加

`</body>` タグの直前（`<script src="weight.js">` の直前）に以下を挿入する。

```html
<!-- 重量シミュレーター -->
<div id="wpp" class="pg">
  <div class="layout">
    <aside class="sb">
      <!-- ↑ セクション 3-2 の内容をここに入れる -->
    </aside>
    <main class="mn" id="wMain">
      <!-- ↑ セクション 3-3 の内容をここに入れる -->
    </main>
  </div>
</div>
```

---

### 3-6. スクリプト読み込み順序

`</body>` の直前のスクリプトブロックを以下の順番にする（`calc.js` の後に `weight.js` を置くこと）。

```html
<script src="storage.js"></script>
<script src="calc.js"></script>
<script src="main.js"></script>
<script src="contact.js"></script>
<script src="final-overrides.js"></script>
<script src="weight.js"></script>
```

---

## 4. 鋼材規格の拡張方針

### 現在の STEEL データ構造（`calc.js` 内）

```javascript
var STEEL = {
  'H形鋼':        [['H-100×50×5×7', 9.3], ['H-125×60×6×8', 13.1], ...],
  '等辺山形鋼':   [['L-50×50×5', 3.77], ...],
  '不等辺山形鋼': [['L-65×50×6', 5.21], ...],
  '溝形鋼':       [['C-75×45×5', 5.92], ...],
  'I形鋼':        [['I-100×50×5', 9.2], ...],
  '平鋼':         [['FB-25x3', 0.59], ...],
  '丸鋼':         [['RB-13', 1.04], ...],
  // ← 新しい種類はここに追加するだけでよい
};
```

### 規格を追加するルール

1. `calc.js` の `STEEL` オブジェクトに `[規格名, kg/m値]` の配列で追加するだけ。
2. 規格名の命名規則は既存に合わせる（重量シミュレーターの塗装面積計算が規格名を解析するため）。
3. 新しい**種類**（形状）を追加する場合は、`weight.js` の `wGetPaintPerM` 関数にも対応する条件分岐を追加する。

---

## 5. 動作確認チェックリスト

実装後、以下をすべて確認してから push すること。

```
□ コンソールにエラーが出ない
□ ナビ順が「計算 ｜ 履歴・在庫 ｜ 重量 ｜ 🛒」になっている
□ 「履歴・在庫」をクリックすると内側タブが表示される
□ 重量ページが開く
□ 種類を変えると規格ドロップダウンが更新される
□ 規格を選ぶと kg/m 欄に自動で値が入る
□ 長さ入力後 Enter → 本数にフォーカス移動
□ 本数入力後 Enter（単価チェックOFF）→ リストに行が追加され長さにフォーカスが戻る
□ 本数入力後 Enter（単価チェックON）→ 単価欄にフォーカス移動
□ 単価入力後 Enter → リストに行が追加され長さにフォーカスが戻る
□ 追加した行が右のテーブルに横長で表示される
□ 何行追加しても縦に並んで表示される
□ 合計行が最下部に表示される
□ 削除ボタンで行が消える
□ 「リストをクリア」で全行消える
□ 丸鋼（RB-）の塗装面積が 0 にならない
□ 単価チェックOFFのとき概算金額列は「—」表示
□ NaN / undefined が画面に表示されない
□ GitHub Pages で動作確認済み
```

---

## 6. ファイル変更サマリー

| ファイル | 変更内容 |
|---|---|
| `index.html` | バグ修正（先頭コメント・絶対パス・重複タグ・フォントリンク）、ナビ順変更、重量ページブロック追加 |
| `main.js` | `goPage` 関数をナビ新構成に合わせて修正 |
| `weight.js` | **新規作成**（重量シミュレーター全ロジック） |
| `calc.js` | 変更なし（STEEL変数はそのまま使用） |
| `style.css` | 変更なし（既存の `.layout` `.sb` `.mn` クラスを流用） |
