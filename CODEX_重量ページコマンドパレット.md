# コマンドパレット UI改善（計算ページ＋重量ページ共通）

## 対象ファイル
- `index.html`
- `main.js`
- `weight.js`
- `style.css`（追記のみ）

---

## 変更①：詳細設定タブの「設定」→「切断条件」に名称変更

`id="sbPanel2"` 内の `.ds-title` で「設定」と表示している箇所を「切断条件」に変更する。

---

## 変更②：計算ページのコマンドパレットに🔍ボタン追加

### 動作仕様
- **🔍ボタン（左）を押す** → 全鋼材種類をグループ表示 → 種類をクリック → その規格一覧 → 選択で確定
- **入力欄（右）に文字を打つ** → リアルタイム絞り込み → 候補一覧から選択

### index.html の変更

`id="cmdPaletteWrap"` の `div` の中身を以下に置き換える：

```html
<div style="position:relative" id="cmdPaletteWrap">
  <div style="display:flex;gap:6px;align-items:center">
    <!-- 🔍ボタン：左側。押すと種類ブラウズモード -->
    <button
      type="button"
      onclick="cmdOpenBrowse()"
      style="flex-shrink:0;width:34px;height:34px;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-family:inherit"
      onmouseover="this.style.background='#faf5ff'"
      onmouseout="this.style.background='#f8f8fc'"
    >🔍</button>
    <!-- 入力欄：右側。タイプで絞り込み -->
    <input
      type="text"
      id="cmdInput"
      placeholder="例：H100、平9、丸32"
      autocomplete="off"
      oninput="cmdFilter()"
      onkeydown="cmdKey(event)"
      style="flex:1;box-sizing:border-box;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;transition:.15s;"
    >
  </div>
  <div id="cmdDropdown"
    style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e0e0ea;border-radius:10px;max-height:260px;overflow-y:auto;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.1)">
  </div>
</div>
```

### main.js の変更

#### 既存の `cmdOpen()` 関数を削除し、以下2関数に置き換える

```js
// 🔍ボタン：全種類をグループ表示（ブラウズモード）
function cmdOpenBrowse() {
  var dd = document.getElementById('cmdDropdown');
  if (!dd) return;

  var html = '';
  Object.keys(STEEL).forEach(function(kind) {
    html += '<div class="cmd-cat" style="cursor:pointer;color:#1a1a2e;font-size:11px" '
          + 'onmousedown="event.preventDefault();cmdShowKind(\'' + kind + '\')">'
          + kind + ' <span style="color:#bbb;font-size:10px">▶</span></div>';
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}

// ブラウズモード：種類クリック→規格一覧
function cmdShowKind(kind) {
  var dd   = document.getElementById('cmdDropdown');
  var list = STEEL[kind] || [];
  if (!dd) return;

  var html = '<div class="cmd-cat" style="cursor:pointer;color:#aaa;display:flex;align-items:center;gap:4px" '
           + 'onmousedown="event.preventDefault();cmdOpenBrowse()">◀ 戻る　<strong style="color:#5a5a78">' + kind + '</strong></div>';

  list.forEach(function(row) {
    var it = { kind: kind, spec: row[0], kgm: row[1] };
    html += '<div class="cmd-item" onmousedown="event.preventDefault();cmdSelect(' + JSON.stringify(it) + ')">'
          + '<span>' + row[0] + '</span>'
          + '<span class="cmd-sub">' + row[1] + ' kg/m</span>'
          + '</div>';
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
}
```

#### 既存の `cmdFilter()` を以下に置き換える

```js
function cmdFilter() {
  var input = document.getElementById('cmdInput');
  var dd = document.getElementById('cmdDropdown');
  if (!input || !dd) return;
  var q = (input.value || '').trim().toLowerCase();

  if (!q) {
    dd.style.display = 'none';
    return;
  }

  var all = cmdBuildAll();
  var filtered = all.filter(function(it) {
    return it.kind.toLowerCase().indexOf(q) >= 0 ||
           it.spec.toLowerCase().indexOf(q) >= 0 ||
           it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
  });

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
    row.onmousedown = function(e) { e.preventDefault(); cmdSelect(it); };
    dd.appendChild(row);
  });
  dd.style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}
```

---

## 変更③：重量ページのコマンドパレットも同仕様に実装

### index.html の変更

重量ページ（`id="wpp"`）サイドバー内の `<select id="wKind">` と `<select id="wSpec">` が含まれる2つの `<section>` を、以下の1ブロックに**まるごと置き換える**：

```html
<section>
  <div style="position:relative" id="wCmdWrap">
    <div style="display:flex;gap:6px;align-items:center">
      <!-- 🔍ボタン：左側。押すと種類ブラウズモード -->
      <button
        type="button"
        onclick="wCmdOpenBrowse()"
        style="flex-shrink:0;width:34px;height:34px;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-family:inherit"
        onmouseover="this.style.background='#faf5ff'"
        onmouseout="this.style.background='#f8f8fc'"
      >🔍</button>
      <!-- 入力欄：右側。タイプで絞り込み -->
      <input
        type="text"
        id="wCmdInput"
        placeholder="例：H100、平9、丸32"
        autocomplete="off"
        oninput="wCmdFilter()"
        onkeydown="wCmdKey(event)"
        style="flex:1;background:#f8f8fc;border:1.5px solid #eee;border-radius:8px;padding:8px 10px;font-size:12px;color:#1a1a2e;outline:none;font-family:inherit;box-sizing:border-box;transition:.15s"
      >
    </div>
    <div
      id="wCmdDropdown"
      style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #e0e0ea;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:200;max-height:260px;overflow-y:auto"
    ></div>
  </div>
  <div id="wCmdKgm" style="text-align:right;font-size:11px;color:#aaa;margin-top:3px;min-height:16px;padding-right:2px"></div>

  <!-- 既存selectは非表示で残す（JS互換性維持） -->
  <select id="wKind" onchange="wOnKind()" style="display:none"></select>
  <select id="wSpec" onchange="wOnSpec()" style="display:none"></select>
  <input type="hidden" id="wKgm">
</section>
```

### weight.js の変更

#### `wInit()` の末尾（`wRenderRows()` の後）に追加

```js
wCmdBuildAll();
// 初期値を最初の種類・規格に設定
if (Object.keys(STEEL).length > 0) {
  var firstKind = Object.keys(STEEL)[0];
  var firstRow  = Array.isArray(STEEL[firstKind]) && STEEL[firstKind].length > 0 ? STEEL[firstKind][0] : null;
  if (firstRow) {
    var kindEl = document.getElementById('wKind');
    var specEl = document.getElementById('wSpec');
    if (kindEl) kindEl.value = firstKind;
    wOnKind();
    if (specEl) { specEl.value = firstRow[0]; wOnSpec(); }
    var kgmDisp = document.getElementById('wCmdKgm');
    if (kgmDisp) kgmDisp.textContent = firstRow[1] + ' kg/m';
    var inputEl = document.getElementById('wCmdInput');
    if (inputEl) inputEl.value = firstKind + '　' + firstRow[0];
  }
}
```

#### weight.js 末尾に以下を追加

```js
// ── 重量ページ コマンドパレット ──

var _wCmdAll = [];
var _wCmdIdx = -1;

function wCmdBuildAll() {
  _wCmdAll = [];
  if (typeof STEEL !== 'object' || !STEEL) return;
  Object.keys(STEEL).forEach(function(kind) {
    (STEEL[kind] || []).forEach(function(row) {
      _wCmdAll.push({ kind: kind, spec: row[0], kgm: row[1], label: kind + ' ' + row[0] });
    });
  });
}

// 🔍ボタン：全種類ブラウズモード
function wCmdOpenBrowse() {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd) return;

  var html = '';
  Object.keys(STEEL).forEach(function(kind) {
    html += '<div class="cmd-cat" style="cursor:pointer;color:#1a1a2e;font-size:11px" '
          + 'onmousedown="event.preventDefault();wCmdShowKind(\'' + kind + '\')">'
          + kind + ' <span style="color:#bbb;font-size:10px">▶</span></div>';
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

// ブラウズモード：種類クリック→規格一覧
function wCmdShowKind(kind) {
  var dd   = document.getElementById('wCmdDropdown');
  var list = STEEL[kind] || [];
  if (!dd) return;

  var html = '<div class="cmd-cat" style="cursor:pointer;color:#aaa;display:flex;align-items:center;gap:4px" '
           + 'onmousedown="event.preventDefault();wCmdOpenBrowse()">◀ 戻る　<strong style="color:#5a5a78">' + kind + '</strong></div>';

  list.forEach(function(row) {
    var it = { kind: kind, spec: row[0], kgm: row[1] };
    html += '<div class="cmd-item" onmousedown="event.preventDefault();wCmdSelect(' + JSON.stringify(it) + ')">'
          + '<span>' + row[0] + '</span>'
          + '<span style="color:#aaa;font-size:10px">' + row[1] + ' kg/m</span>'
          + '</div>';
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
}

// 入力欄タイプ：絞り込み表示
function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd    = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var q = input.value.trim().toLowerCase();

  if (!q) { dd.style.display = 'none'; return; }

  var filtered = _wCmdAll.filter(function(it) {
    return it.label.toLowerCase().includes(q) || it.spec.toLowerCase().includes(q) ||
           it.spec.replace(/[^0-9]/g,'').includes(q.replace(/[^0-9]/g,''));
  });

  if (filtered.length === 0) {
    dd.innerHTML = '<div style="padding:12px;font-size:12px;color:#aaa;text-align:center">見つかりません</div>';
    dd.style.display = 'block';
    _wCmdIdx = -1;
    document.addEventListener('click', wCmdOutside);
    return;
  }

  var grouped = {};
  filtered.forEach(function(it) {
    if (!grouped[it.kind]) grouped[it.kind] = [];
    grouped[it.kind].push(it);
  });

  var html = '';
  Object.keys(grouped).forEach(function(kind) {
    html += '<div class="cmd-cat">' + kind + '</div>';
    grouped[kind].forEach(function(it) {
      html += '<div class="cmd-item" onmousedown="event.preventDefault();wCmdSelect(' + JSON.stringify(it) + ')">'
            + '<span>' + it.spec + '</span>'
            + '<span style="color:#aaa;font-size:10px">' + it.kgm + ' kg/m</span>'
            + '</div>';
    });
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

// 選択確定
function wCmdSelect(it) {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmDisp = document.getElementById('wCmdKgm');
  var input   = document.getElementById('wCmdInput');
  var dd      = document.getElementById('wCmdDropdown');

  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl) { specEl.value = it.spec; wOnSpec(); }
  if (input)   input.value   = it.kind + '　' + it.spec;
  if (kgmDisp) kgmDisp.textContent = it.kgm + ' kg/m';
  if (dd)      dd.style.display = 'none';
  _wCmdIdx = -1;
  document.removeEventListener('click', wCmdOutside);
}

// 外クリックで閉じる
function wCmdOutside(e) {
  var wrap = document.getElementById('wCmdWrap');
  if (wrap && !wrap.contains(e.target)) {
    var dd = document.getElementById('wCmdDropdown');
    if (dd) dd.style.display = 'none';
    document.removeEventListener('click', wCmdOutside);
  }
}

// キーボード操作
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
  } else { return; }

  items.forEach(function(el) { el.classList.remove('cmd-focus'); });
  if (_wCmdIdx >= 0) {
    items[_wCmdIdx].classList.add('cmd-focus');
    items[_wCmdIdx].scrollIntoView({ block: 'nearest' });
  }
}
```

---

## style.css の追記

```css
/* 🔍ボタン共通 */
#wCmdInput:hover,
#wCmdInput:focus {
  background: #faf5ff;
  outline: none;
  box-shadow: none;
}
```

---

## 注意事項

- `id="wKind"`, `id="wSpec"`, `id="wKgm"` は `display:none` で残す — **削除しない**
- `wOnKind()`, `wOnSpec()`, `wAddRow()` など既存関数は一切変更しない
- 計算ページの `cmdOpen()` 関数は削除し `cmdOpenBrowse()` / `cmdShowKind()` に置き換える（`onfocus="cmdOpen()"` も `index.html` から削除済み）
- ドロップダウンには既存の `.cmd-item` / `.cmd-cat` / `.cmd-focus` クラスをそのまま流用
- 基本タブの他の部分・履歴在庫ページ・問い合わせページは**一切触らない**
