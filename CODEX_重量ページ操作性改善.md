# 重量ページ操作性改善 実装指示

## 対象ファイル
- `weight.js`
- `index.html`
- `style.css`

---

## 変更① 鋼材検索を CMD_PREFIX_MAP 方式に変更（計算タブと同一操作）

### 1-A. `index.html` — wCmdInput のプレースホルダーと onfocus を変更

```html
<input
  type="text"
  id="wCmdInput"
  placeholder="H100 / F9 / RB32"
  autocomplete="off"
  oninput="wCmdFilter()"
  onkeydown="wCmdKey(event)"
  onfocus="this.select()"
  style="flex:1;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;padding:8px 10px;font-size:12px;color:#1a1a2e;outline:none;font-family:inherit;box-sizing:border-box;transition:.15s"
>
```

### 1-B. `weight.js` — wCmdFilter を CMD_PREFIX_MAP 方式に全置換

**変更前：**
```js
function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var q = input.value.trim().toLowerCase();
  var qNum = q.replace(/[^0-9]/g, '');

  if (!q) {
    dd.style.display = 'none';
    _wCmdIdx = -1;
    return;
  }

  _wCmdVisible = _wCmdAll.filter(function(it) {
        var specNum = String(it.spec || '').replace(/[^0-9]/g, '');
        return it.label.toLowerCase().indexOf(q) >= 0 ||
               String(it.spec || '').toLowerCase().indexOf(q) >= 0 ||
               (qNum && specNum.indexOf(qNum) >= 0);
      });
  // ... 略
}
```

**変更後：**
```js
function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var raw = (input.value || '').trim();
  var q = raw.toLowerCase();

  if (!q) {
    dd.style.display = 'none';
    _wCmdIdx = -1;
    return;
  }

  // CMD_PREFIX_MAP（main.js で定義済みのグローバル変数を参照）
  var prefixMap = typeof CMD_PREFIX_MAP !== 'undefined' ? CMD_PREFIX_MAP : [];
  var kindFilter = null;
  var numQuery = '';
  for (var pi = 0; pi < prefixMap.length; pi++) {
    var pm = prefixMap[pi];
    if (q.indexOf(pm.prefix) === 0) {
      kindFilter = pm.kinds;
      numQuery = q.slice(pm.prefix.length).replace(/[^0-9]/g, '');
      break;
    }
  }

  var filtered;
  if (kindFilter) {
    filtered = _wCmdAll.filter(function(it) {
      if (kindFilter.indexOf(it.kind) < 0) return false;
      if (!numQuery) return true;
      return it.spec.replace(/[^0-9]/g, '').indexOf(numQuery) >= 0;
    });
  } else {
    filtered = _wCmdAll.filter(function(it) {
      return it.kind.toLowerCase().indexOf(q) >= 0 ||
             it.spec.toLowerCase().indexOf(q) >= 0 ||
             it.spec.replace(/[^0-9]/g, '').indexOf(q.replace(/[^0-9]/g, '')) >= 0;
    });
  }

  _wCmdVisible = filtered;

  dd.innerHTML = '';
  if (filtered.length === 0) {
    dd.innerHTML = '<div style="padding:12px;font-size:12px;color:#aaa;text-align:center">見つかりません</div>';
    dd.style.display = 'block';
    _wCmdIdx = -1;
    document.addEventListener('mousedown', wCmdOutside);
    return;
  }

  var lastKind = '';
  filtered.slice(0, 60).forEach(function(it, idx) {
    if (it.kind !== lastKind) {
      var cat = document.createElement('div');
      cat.className = 'cmd-cat';
      cat.textContent = it.kind;
      dd.appendChild(cat);
      lastKind = it.kind;
    }
    var row = document.createElement('div');
    row.className = 'cmd-item';
    row.dataset.widx = idx;
    row.innerHTML = '<span>' + _esc(it.spec) + '</span><span class="cmd-sub">' + _esc(String(it.kgm)) + ' kg/m</span>';
    row.onmousedown = (function(item) {
      return function(e) { e.preventDefault(); e.stopPropagation(); wCmdSelect(item); };
    })(it);
    dd.appendChild(row);
  });
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('mousedown', wCmdOutside);
}
```

### 1-C. `weight.js` — wCmdKey を 1件即選択対応に全置換

**変更前：**
```js
function wCmdKey(e) {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd || dd.style.display === 'none') return;
  var items = dd.querySelectorAll('.cmd-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _wCmdIdx = Math.min(_wCmdIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _wCmdIdx = Math.max(_wCmdIdx - 1, 0);
  } else if (e.key === 'Enter' && _wCmdIdx >= 0) {
    e.preventDefault();
    items[_wCmdIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return;
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
    _wCmdIdx = -1;
    return;
  } else {
    return;
  }

  items.forEach(function(el) { el.classList.remove('cmd-focus'); });
  if (_wCmdIdx >= 0) {
    items[_wCmdIdx].classList.add('cmd-focus');
    items[_wCmdIdx].scrollIntoView({ block: 'nearest' });
  }
}
```

**変更後：**
```js
function wCmdKey(e) {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd || dd.style.display === 'none') return;
  var items = dd.querySelectorAll('.cmd-item');
  if (!items.length) return;

  var focused = dd.querySelector('.cmd-item.cmd-focus');
  var idx = focused ? Array.from(items).indexOf(focused) : -1;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (focused) focused.classList.remove('cmd-focus');
    var next = items[Math.min(idx + 1, items.length - 1)];
    if (next) { next.classList.add('cmd-focus'); next.scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (focused) focused.classList.remove('cmd-focus');
    var prev = items[Math.max(idx - 1, 0)];
    if (prev) { prev.classList.add('cmd-focus'); prev.scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // 候補が1件だけなら即選択
    if (items.length === 1) {
      if (items[0].onmousedown) items[0].onmousedown(e);
    } else if (focused && focused.onmousedown) {
      focused.onmousedown(e);
    }
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
    _wCmdIdx = -1;
  }
}
```

### 1-D. `weight.js` — wCmdSelect で選択後に長さ欄へフォーカス

`wCmdSelect` の末尾（`document.removeEventListener` の直後）に追記：

```js
  document.removeEventListener('mousedown', wCmdOutside);
  // 選択後に長さ欄へフォーカス
  setTimeout(function() {
    var wLen = document.getElementById('wLen');
    if (wLen) { wLen.focus(); wLen.select(); }
  }, 50);
```

また `wCmdOutside` 内の `removeEventListener('click', ...)` を `mousedown` に揃える：
```js
function wCmdOutside(e) {
  var wrap = document.getElementById('wCmdWrap');
  if (wrap && !wrap.contains(e.target)) {
    var dd = document.getElementById('wCmdDropdown');
    if (dd) dd.style.display = 'none';
    document.removeEventListener('mousedown', wCmdOutside);
  }
}
```

---

## 変更② 長さ→本数→Enter でリスト追加のキーループ実装

### 2-A. `weight.js` — wSetupEnter を全置換

```js
function wSetupEnter() {
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');

  // 長さ → Enter → 本数
  if (lenEl) {
    lenEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
      }
    });
    lenEl.addEventListener('input', wPreview);
  }

  // 本数 → Enter → リストに追加（カーソルは wAddRow 内で wLen に戻る）
  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        wAddRow();
      }
    });
    qtyEl.addEventListener('input', wPreview);
  }

  // オプションフィールドも Enter でリストに追加
  ['wPrice', 'wMemo', 'wKuiku', 'wRevKg'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'wRevKg') {
      el.addEventListener('input', wCalcReverse);
    } else {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); wAddRow(); }
      });
    }
  });
}
```

---

## 変更③ アンドゥ/リドゥ実装

### 3-A. `weight.js` — ファイル先頭の変数ブロックに追記

```js
// ── アンドゥ/リドゥ ─────────────────────────────────────
var _wUndoStack = [];
var _wRedoStack = [];

// ── オプションチップ状態 ─────────────────────────────────
var _wOpts = { price: false, name: false, kuiku: false, rev: false };
```

### 3-B. `weight.js` — wTogglePrice 関数を以下の関数群に**置換**

```js
// ── アンドゥ/リドゥ ─────────────────────────────────────

function wSnapRows() {
  return JSON.parse(JSON.stringify(_wRows));
}

function wPushUndo() {
  _wUndoStack.push(wSnapRows());
  if (_wUndoStack.length > 50) _wUndoStack.shift();
  _wRedoStack = [];
}

function wUndoAction() {
  if (_wUndoStack.length === 0) return;
  _wRedoStack.push(wSnapRows());
  _wRows = _wUndoStack.pop();
  wRenderRows();
}

function wRedoAction() {
  if (_wRedoStack.length === 0) return;
  _wUndoStack.push(wSnapRows());
  _wRows = _wRedoStack.pop();
  wRenderRows();
}

// ── オプションチップトグル ────────────────────────────────

function wToggleOpt(opt) {
  _wOpts[opt] = !_wOpts[opt];
  var chip = document.getElementById('wChip_' + opt);
  if (chip) chip.classList.toggle('w-opt-chip--on', _wOpts[opt]);
  var panel = document.getElementById('wPanel_' + opt);
  if (panel) panel.style.display = _wOpts[opt] ? '' : 'none';
  // チップOFF時は値をクリア
  if (!_wOpts[opt]) {
    if (opt === 'price') { var pe = document.getElementById('wPrice'); if (pe) pe.value = ''; }
    if (opt === 'name')  { var me = document.getElementById('wMemo');  if (me) me.value = ''; }
    if (opt === 'kuiku') { var ke = document.getElementById('wKuiku'); if (ke) ke.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
}

// ── 重量逆算 ─────────────────────────────────────────────

function wCalcReverse() {
  var kgmEl   = document.getElementById('wKgm');
  var lenEl   = document.getElementById('wLen');
  var qtyEl   = document.getElementById('wQty');
  var revKgEl = document.getElementById('wRevKg');
  var revQtyEl= document.getElementById('wRevQty');
  var revLenEl= document.getElementById('wRevLen');
  if (!kgmEl || !revKgEl) return;

  var kgm    = parseFloat(kgmEl.value)   || 0;
  var len    = parseFloat(lenEl ? lenEl.value : 0)   || 0;
  var qty    = parseFloat(qtyEl ? qtyEl.value : 1)   || 1;
  var target = parseFloat(revKgEl.value) || 0;

  if (kgm <= 0 || target <= 0) {
    if (revQtyEl) revQtyEl.textContent = '—';
    if (revLenEl) revLenEl.textContent = '—';
    return;
  }

  if (len > 0 && revQtyEl) {
    var kg1 = kgm * len / 1000;
    revQtyEl.textContent = Math.ceil(target / kg1).toLocaleString() + ' 本';
  }
  if (qty > 0 && revLenEl) {
    var needLen = Math.ceil((target / qty) / kgm * 1000);
    revLenEl.textContent = needLen.toLocaleString() + ' mm';
  }
}

function wClearReverse() {
  var el = document.getElementById('wRevKg');
  if (el) el.value = '';
  var q = document.getElementById('wRevQty');
  var l = document.getElementById('wRevLen');
  if (q) q.textContent = '—';
  if (l) l.textContent = '—';
}
```

### 3-C. `weight.js` — wDeleteRow・wClearAll に wPushUndo を追加

```js
function wDeleteRow(idx) {
  wPushUndo();
  _wRows.splice(idx, 1);
  wRenderRows();
}

function wClearAll() {
  if (_wRows.length === 0) return;
  if (!confirm('リストをすべてクリアしますか？')) return;
  wPushUndo();
  _wRows = [];
  wRenderRows();
}
```

### 3-D. `weight.js` — ファイル末尾に重量ページ用キーボードショートカットを追加

```js
// ── 重量ページ Ctrl+Z / Ctrl+Shift+Z ─────────────────────
document.addEventListener('keydown', function(e) {
  // 重量ページが表示されているときだけ処理
  var wpp = document.getElementById('wpp');
  if (!wpp || !wpp.classList.contains('show')) return;

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    wUndoAction();
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    wRedoAction();
  }
});
```

---

## 変更④ wAddRow をオプションチップ対応に更新

### 4-A. `weight.js` — wAddRow を全置換

```js
function wAddRow() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  var kgmEl  = document.getElementById('wKgm');
  var lenEl  = document.getElementById('wLen');
  var qtyEl  = document.getElementById('wQty');
  if (!kindEl || !specEl || !kgmEl || !lenEl || !qtyEl) return;

  var kgm = parseFloat(kgmEl.value) || 0;
  var len = parseFloat(lenEl.value) || 0;
  var qty = parseFloat(qtyEl.value) || 0;

  if (kgm <= 0 || len <= 0 || qty <= 0) {
    alert('種類・規格・長さ・本数・kg/m を正しく入力してください。');
    return;
  }

  var kind  = kindEl.value;
  var spec  = specEl.value;

  // オプションチップ ON の場合のみ値を読む
  var priceEl = document.getElementById('wPrice');
  var memoEl  = document.getElementById('wMemo');
  var kuikuEl = document.getElementById('wKuiku');
  var price   = (_wOpts.price  && priceEl)  ? (parseFloat(priceEl.value)  || 0) : 0;
  var memo    = (_wOpts.name   && memoEl)   ? (memoEl.value  || '') : '';
  var kuiku   = (_wOpts.kuiku  && kuikuEl)  ? (kuikuEl.value || '') : '';

  var kg1  = kgm * len / 1000;
  var kg   = kg1 * qty;
  var ppm  = wGetPaintPerM(kind, spec);
  var m2_1 = ppm * len / 1000;
  var m2   = m2_1 * qty;

  wPushUndo();

  _wRows.push({
    kind: kind,
    spec: spec,
    memo: memo,
    kuiku: kuiku,
    len: len,
    qty: qty,
    kgm: kgm,
    kg1: kg1,
    kgTotal: kg,
    m2_1: m2_1,
    m2Total: m2,
    price: price,
    amount: price > 0 ? kg * price : null
  });

  wRenderRows();
  lenEl.focus();
  lenEl.select();
}
```

---

## 変更⑤ index.html の重量サイドバーを新UI（チップレイアウト）に変更

`<aside class="sb">` 内の `<section>...</section>` × 2 ＋ ボタン ＋ wip-card ２つ を、以下に**全置換**する。

```html
      <section>
        <div class="shd" style="margin-bottom:4px">鋼材種類・規格</div>
        <div style="position:relative" id="wCmdWrap">
          <div style="display:flex;gap:6px;align-items:center">
            <button type="button" onclick="wCmdOpenBrowse()"
              style="flex-shrink:0;width:34px;height:34px;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-family:inherit"
              onmouseover="this.style.background='#faf5ff'"
              onmouseout="this.style.background='#f8f8fc'">🔍</button>
            <input type="text" id="wCmdInput"
              placeholder="H100 / F9 / RB32"
              autocomplete="off"
              oninput="wCmdFilter()"
              onkeydown="wCmdKey(event)"
              onfocus="this.select()"
              style="flex:1;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;padding:8px 10px;font-size:12px;color:#1a1a2e;outline:none;font-family:inherit;box-sizing:border-box;transition:.15s">
          </div>
          <div id="wCmdDropdown"
            style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e0e0ea;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:200;max-height:260px;overflow-y:auto"></div>
        </div>
        <div id="wCmdKgm" style="text-align:right;font-size:11px;color:#aaa;margin-top:3px;min-height:16px;padding-right:2px"></div>
        <select id="wKind" onchange="wOnKind()" style="display:none"></select>
        <select id="wSpec" onchange="wOnSpec()" style="display:none"></select>
        <input type="hidden" id="wKgm">
      </section>

      <section>
        <div class="field">
          <label>長さ (mm)</label>
          <input type="number" id="wLen" value="6000" min="1">
        </div>
        <div class="field">
          <label>本数</label>
          <input type="number" id="wQty" value="1" min="1">
        </div>
      </section>

      <div class="w-opt-chips">
        <button class="w-opt-chip" id="wChip_price" onclick="wToggleOpt('price')">単価</button>
        <button class="w-opt-chip" id="wChip_name"  onclick="wToggleOpt('name')">部材名</button>
        <button class="w-opt-chip" id="wChip_kuiku" onclick="wToggleOpt('kuiku')">工区</button>
        <button class="w-opt-chip" id="wChip_rev"   onclick="wToggleOpt('rev')">⇄ 逆算</button>
      </div>

      <div id="wPanel_price" style="display:none">
        <div class="field" style="margin-top:6px">
          <label>単価 (円/kg)</label>
          <input type="number" id="wPrice" placeholder="例：120" min="0">
        </div>
      </div>

      <div id="wPanel_name" style="display:none">
        <div class="field" style="margin-top:6px">
          <label>部材名・メモ（任意）</label>
          <input type="text" id="wMemo" placeholder="例：柱材、梁材、胴縁など" maxlength="40">
        </div>
      </div>

      <div id="wPanel_kuiku" style="display:none">
        <div class="field" style="margin-top:6px">
          <label>工区</label>
          <input type="text" id="wKuiku" placeholder="例：A工区" maxlength="20">
        </div>
      </div>

      <div id="wPanel_rev" style="display:none">
        <div class="field" style="margin-top:6px">
          <label>目標重量 (kg)</label>
          <input type="number" id="wRevKg" placeholder="例：1000" min="0">
        </div>
        <div style="font-size:11px;color:#5a5a78;background:#f4f4fa;border-radius:8px;padding:8px 10px;margin-top:6px;line-height:2">
          <div style="display:flex;justify-content:space-between">
            <span>必要本数（現在の長さで）</span>
            <span id="wRevQty" style="font-weight:700;color:#6d28d9">—</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>必要長さ（現在の本数で）</span>
            <span id="wRevLen" style="font-weight:700;color:#0891b2">—</span>
          </div>
        </div>
      </div>

      <button onclick="wAddRow()" class="run" style="margin-top:8px">
        ＋ リストに追加
      </button>
      <button onclick="wClearAll()" class="sm-btn del" style="width:100%;margin-top:6px;padding:7px">
        リストをクリア
      </button>
      <p style="font-size:10px;color:#aaaabc;margin-top:8px">
        ※ 重量は JIS kg/m × 長さ。塗装面積は断面周長 × 長さ（概算値）。
      </p>
```

---

## 変更⑥ style.css — `.w-opt-chips` / `.w-opt-chip` を追加

`.run-hint` の定義の**直前**に追記：

```css
/* 重量ページ オプションチップ */
.w-opt-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0 2px;
}
.w-opt-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border: 1.5px solid #e0e0ea;
  border-radius: 20px;
  background: #f8f8fc;
  color: #8888a8;
  cursor: pointer;
  transition: .15s;
  font-family: inherit;
  letter-spacing: .02em;
}
.w-opt-chip:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
  background: #faf5ff;
}
.w-opt-chip--on {
  border-color: #6d28d9;
  background: #6d28d9;
  color: #fff;
}
.w-opt-chip--on:hover {
  background: #5b21b6;
  border-color: #5b21b6;
  color: #fff;
}
```

---

## 確認事項

1. 重量タブで `H100` と入力 → H形鋼のみに絞り込まれる
2. `FB38` と入力 → 平鋼 FB-38×3 などが出る（FBがFより優先）
3. 候補が1件のとき Enter を押すと即選択され、長さ欄にフォーカスが移る
4. 長さ `6000` Enter → 本数 `10` Enter → 即座にリスト追加 → カーソルが長さ欄に戻る
5. 同じ操作を繰り返してキーボードのみで連続追加できる
6. `[単価]` チップを押すと単価入力欄が出現、もう一度押すと消える（紫色でON状態表示）
7. `[⇄ 逆算]` チップを押すと目標重量入力欄が出現、値を入力すると必要本数・必要長さがリアルタイム更新される
8. `Ctrl+Z` で追加をアンドゥ、`Ctrl+Shift+Z` でリドゥできる
9. 検索ボックスにフォーカスすると全選択され、即入力で内容が置き換わる

## 注意事項

- `CMD_PREFIX_MAP` は `main.js` のグローバル変数をそのまま参照する（weight.js 側で再定義しない）
- `wPriceOn` チェックボックスと `wTogglePrice` 関数は削除（オプションチップに統合）
- `wMemoCheck` span も削除して構わない
- wip-card（CO₂・逆算の準備中カード）は今回の変更で削除（逆算は実装済みのため）
- 他ページ（計算・データ・履歴・在庫）は**一切変更しない**
