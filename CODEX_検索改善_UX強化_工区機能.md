# 検索改善・UX強化・工区機能 実装指示

## 対象ファイル
- `index.html`
- `main.js`
- `style.css`

---

## 変更① ハンバーガーメニューの「お問い合わせ」を削除

`index.html` の `id="hamMenu"` 内、**お問い合わせボタンのみ削除**する。

**削除対象（この要素だけ取り除く）：**
```html
<button class="hm-row" type="button" onclick="closeHeaderMenu(); goPage('contact');">
  <span class="hm-txt">お問い合わせ</span>
  <span class="hm-arr">›</span>
</button>
```

ナビバーの `<a id="nc">お問い合わせ</a>` タブ、お問い合わせページ本体（`id="cop"`）は**そのまま残す**。

---

## 変更② 鋼材検索をプレフィックス方式に変更

### 2-A. `main.js` — `cmdFilter()` を置き換える

`cmdFilter()` 関数の**前**に以下の定数を追加する：

```js
// 鋼材種類 プレフィックスマップ（長い順に並べて先に評価）
var CMD_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] }
];
```

`cmdFilter()` 関数本体を以下に**置き換える**：

```js
function cmdFilter() {
  var input = document.getElementById('cmdInput');
  var dd = document.getElementById('cmdDropdown');
  if (!input || !dd) return;
  var raw = (input.value || '').trim();
  var q = raw.toLowerCase();
  if (!q) {
    dd.style.display = 'none';
    return;
  }

  var all = cmdBuildAll();
  var filtered;

  // プレフィックスで種類を絞り込む
  var kindFilter = null;
  var numQuery = '';
  for (var pi = 0; pi < CMD_PREFIX_MAP.length; pi++) {
    var pm = CMD_PREFIX_MAP[pi];
    if (q.indexOf(pm.prefix) === 0) {
      kindFilter = pm.kinds;
      numQuery = q.slice(pm.prefix.length).replace(/[^0-9]/g, '');
      break;
    }
  }

  if (kindFilter) {
    filtered = all.filter(function(it) {
      if (kindFilter.indexOf(it.kind) < 0) return false;
      if (!numQuery) return true;
      var specNums = it.spec.replace(/[^0-9]/g, '');
      return specNums.indexOf(numQuery) >= 0;
    });
  } else {
    // 数字のみ or 未知入力：全種類から検索
    filtered = all.filter(function(it) {
      return it.kind.toLowerCase().indexOf(q) >= 0 ||
             it.spec.toLowerCase().indexOf(q) >= 0 ||
             it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
    });
  }

  dd.innerHTML = '';
  if (filtered.length === 0) {
    dd.innerHTML = '<div style="padding:12px;font-size:12px;color:#aaa;text-align:center">見つかりません</div>';
    dd.style.display = 'block';
    document.addEventListener('mousedown', cmdOutside);
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
    row.dataset.idx = idx;
    row.innerHTML = '<span>' + it.spec + '</span><span class="cmd-sub">' + it.kgm + ' kg/m</span>';
    row.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cmdSelect(it);
    };
    dd.appendChild(row);
  });
  dd.style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}
```

### 2-B. `index.html` — `id="cmdInput"` を更新

```html
<input
  type="text"
  id="cmdInput"
  placeholder="H100 / F9 / RB32"
  autocomplete="off"
  oninput="cmdFilter()"
  onkeydown="cmdKey(event)"
  onfocus="this.select()"
  style="flex:1;box-sizing:border-box;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;transition:.15s;"
>
```

変更点は2つ：
- `placeholder` を `H100 / F9 / RB32` に変更（漢字なし、アルファベット+数字のみ）
- `onfocus="this.select()"` を追加（フォーカス時に全選択 → 即上書き入力可能）

---

## 変更③ ドロップダウン1件のとき Enter で即選択

`main.js` の `cmdKey()` 関数、`Enter` キーの処理を以下に変更：

```js
} else if (e.key === 'Enter') {
  e.preventDefault();
  // 候補が1件だけなら即選択（矢印キー不要）
  if (items.length === 1) {
    if (items[0].onmousedown) items[0].onmousedown(e);
  } else if (focused && focused.onmousedown) {
    focused.onmousedown(e);
  }
}
```

---

## 変更④ アンドゥ/リドゥ（Ctrl+Z / Ctrl+Shift+Z）+ Ctrl+Enter で計算実行

### 4-A. `main.js` — アプリ状態変数ブロックの直後に追記

`var ROWS = 10;` などアプリ状態変数の直後（`parseDateValue` 関数より前）に以下を**追記する**：

```js
// ── アンドゥ/リドゥ ─────────────────────────────────────
var _undoStack = [];
var _redoStack = [];
var _preEditSnap = null;  // フォーカス時に保存した変更前スナップショット

/** 部材リストの現在状態をスナップショットとして返す */
function _snapParts() {
  var rows = [];
  for (var i = 0; i < totalRows; i++) {
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    rows.push({ l: l ? l.value : '', q: q ? q.value : '', z: z ? z.value : '' });
  }
  return rows;
}

/** スナップショットを部材リストに復元する */
function _restoreParts(rows) {
  var ptl = document.getElementById('ptList');
  if (!ptl) return;
  ptl.innerHTML = '';
  totalRows = 0;
  rows.forEach(function(row, i) {
    addPartRowAt(i);
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    if (l) l.value = row.l;
    if (q) q.value = row.q;
    if (z) z.value = row.z;
  });
  totalRows = rows.length;
  while (totalRows < ROWS) { addPartRowAt(totalRows); totalRows++; }
  updKg();
}

/** 手動でアンドゥスタックにプッシュ（clearParts・executePaste 前に呼ぶ） */
function pushUndoManual() {
  _undoStack.push(_snapParts());
  if (_undoStack.length > 50) _undoStack.shift();
  _redoStack = [];
}

/** pt-row入力フォーカス時：変更前状態を保存 */
function ptUndoFocus() {
  if (_preEditSnap === null) {
    _preEditSnap = _snapParts();
  }
}

/** pt-row入力ブラー時：変更があればアンドゥスタックに積む */
function ptUndoBlur() {
  if (_preEditSnap === null) return;
  var cur = _snapParts();
  if (JSON.stringify(cur) !== JSON.stringify(_preEditSnap)) {
    _undoStack.push(_preEditSnap);
    if (_undoStack.length > 50) _undoStack.shift();
    _redoStack = [];
  }
  _preEditSnap = null;
}

/** Ctrl+Z：アンドゥ */
function undoAction() {
  if (!_undoStack.length) return;
  _redoStack.push(_snapParts());
  _restoreParts(_undoStack.pop());
}

/** Ctrl+Shift+Z：リドゥ */
function redoAction() {
  if (!_redoStack.length) return;
  _undoStack.push(_snapParts());
  _restoreParts(_redoStack.pop());
}

// ── グローバルキーボードショートカット ────────────────────
document.addEventListener('keydown', function(e) {
  var tag = document.activeElement ? document.activeElement.tagName : '';
  var isInPtRow = document.activeElement && document.activeElement.closest &&
                  document.activeElement.closest('.pt-row');

  // Ctrl+Z：アンドゥ（pt-row内 or ページフォーカス時のみ。他のinputはブラウザ既定）
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !isInPtRow) return;
    e.preventDefault();
    undoAction();
    return;
  }
  // Ctrl+Shift+Z：リドゥ
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !isInPtRow) return;
    e.preventDefault();
    redoAction();
    return;
  }
  // Ctrl+Enter：計算実行（計算ページ表示中のみ）
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    var cp = document.getElementById('cp');
    if (cp && cp.classList.contains('show')) {
      e.preventDefault();
      runCalc();
    }
  }
});
```

### 4-B. `main.js` — `addPartRowAt()` を更新

`pl` と `pq` の input に `onfocus` / `onblur` を追加する：

```js
function addPartRowAt(i) {
  var pl = document.getElementById('ptList');
  var d = document.createElement('div');
  d.className = 'pt-row';
  d.id = 'pr' + i;
  var kuikuEnabled = document.getElementById('useKuiku') && document.getElementById('useKuiku').checked;
  d.innerHTML =
    '<span class="pt-n">' + (i+1) + '</span>' +
    '<input type="number" id="pl' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'l\')" style="text-align:right">' +
    '<input type="number" id="pq' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'q\')" style="text-align:right">' +
    '<input type="text" id="pz' + i + '" placeholder="工区" style="' + (kuikuEnabled ? '' : 'display:none') + '">' +
    '<span class="pt-kg" id="pk' + i + '">—</span>';
  pl.appendChild(d);
}
```

### 4-C. `main.js` — `clearParts()` の先頭に `pushUndoManual()` を追加

```js
function clearParts() {
  pushUndoManual();   // ← この1行を追加
  for (var i = 0; i < totalRows; i++) {
  // ...（以降は現状のまま）
```

### 4-D. `main.js` — `executePaste()` の先頭に `pushUndoManual()` を追加

```js
function executePaste() {
  pushUndoManual();   // ← この1行を追加
  var text = document.getElementById('pasteText').value.trim();
  // ...（以降は現状のまま）
```

---

## 変更⑤ 工区トグルを「準備中」から解除して機能実装

### 5-A. `index.html` — pt-hdに工区列ヘッダーを追加

```html
<div class="pt-hd">
  <span></span>
  <span>長さ (mm)</span>
  <span style="text-align:right">数量</span>
  <span id="ptHdKuiku" style="text-align:right;display:none">工区</span>
  <span style="text-align:right;padding-right:6px">重量</span>
</div>
```

### 5-B. `index.html` — 工区トグル行から `wip-block` を削除し `toggleKuiku()` を追加

変更前：
```html
<div class="ds-toggle-row wip-block" onclick="document.getElementById('useKuiku').click()">
  ...
  <input type="checkbox" id="useKuiku" onchange="saveSettings()">
```

変更後：
```html
<div class="ds-toggle-row" onclick="document.getElementById('useKuiku').click()">
  ...
  <input type="checkbox" id="useKuiku" onchange="saveSettings(); toggleKuiku()">
```

### 5-C. `main.js` — `toggleKuiku()` 関数を追加

アンドゥ/リドゥの変数ブロックと同じ場所（アプリ状態の初期化付近）に追記：

```js
// ── 工区トグル ───────────────────────────────────────────
function toggleKuiku() {
  var cb = document.getElementById('useKuiku');
  var enabled = cb && cb.checked;
  var wrap = document.querySelector('.pt-wrap');
  var hdKuiku = document.getElementById('ptHdKuiku');
  if (wrap) wrap.classList.toggle('kuiku-on', enabled);
  if (hdKuiku) hdKuiku.style.display = enabled ? 'inline-block' : 'none';
  for (var i = 0; i < totalRows; i++) {
    var pz = document.getElementById('pz' + i);
    if (pz) pz.style.display = enabled ? '' : 'none';
  }
}
```

### 5-D. `style.css` — 工区ON時のグリッド列幅を追加

`.pt-row` の定義の直後に追記：

```css
/* 工区カラム有効時 */
.pt-wrap.kuiku-on .pt-hd { grid-template-columns: 18px 1fr 54px 56px 56px; }
.pt-wrap.kuiku-on .pt-row { grid-template-columns: 18px 1fr 54px 56px 56px; }
```

---

## 確認事項

修正後、以下をすべて確認すること：

1. ハンバーガーメニュー（☰）を開いても「お問い合わせ」が表示されない
2. 検索ボックスに `h` と入力 → H形鋼のみ表示。`l` → 等辺・不等辺山形鋼のみ。`u` → 溝形鋼のみ（C-表記）。`i` → I形鋼のみ。`f` or `fb` → 平鋼のみ。`r` or `rb` → 丸鋼のみ
3. 検索ボックスに `383` と入力 → `FB-38x3` のみ表示（数字一致）
4. 候補が1件の状態で Enter を押すと即選択され、長さ入力欄にフォーカスが移る
5. 検索ボックスをクリックすると中身が全選択される
6. 数値入力欄（長さ・数量）を編集後に Ctrl+Z で変更が元に戻る
7. Ctrl+Shift+Z でリドゥが効く
8. `✕`ボタンで全クリア後に Ctrl+Z で復元できる
9. 計算ページで Ctrl+Enter を押すと「計算を実行する」と同じ動作をする
10. 詳細設定の「工区を入力する」トグルが「準備中」でなく操作可能で、ONにすると切り出し部材リストに工区列が現れる

## 注意事項

- `id="cmdInput"` の `oninput` / `onkeydown` は変更しない
- `addPartRowAt()` 内の `ptEnter()` 呼び出し・`id` 命名規則は変更しない
- `id="useKuiku"`, `id="noAutoRegister"` は変更禁止
- 他ページ（重量・データ・履歴）は**一切変更しない**
- style.css の既存クラスは変更しない（追記のみ）
