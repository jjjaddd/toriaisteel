# 行選択削除・ヒントUI修正・工区クリアバグ・準備中設定 実装指示

## 対象ファイル
- `main.js`
- `calc.js`
- `index.html`
- `style.css`

---

## 変更① 工区（pz）が × ボタンで消えないバグを修正

`main.js` の `clearParts()` に `pz` フィールドのクリアを追加する。

```js
function clearParts() {
  pushUndoManual();
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    var zEl = document.getElementById('pz' + i);
    var kEl = document.getElementById('pk' + i);
    if (lEl) lEl.value = '';
    if (qEl) qEl.value = '';
    if (zEl) zEl.value = '';
    if (kEl) kEl.textContent = '—';
  }
  document.getElementById('totkg').textContent = '—';
}
```

---

## 変更② Ctrl+A 全選択 ＋ Delete で行データをクリア

### 2-A. `main.js` — 行選択ヘルパー変数と関数を追加

アプリ状態変数ブロック（`var ROWS = 10;` の付近）に追記する：

```js
// ── 行選択（Ctrl+A / Delete） ────────────────────────────
var _selectedRows = [];   // 選択中の行インデックス

/** 切り出し部材リストの全行を選択状態にする */
function ptSelectAll() {
  ptDeselect();
  for (var i = 0; i < totalRows; i++) {
    var row = document.getElementById('pr' + i);
    if (row) { row.classList.add('pt-selected'); _selectedRows.push(i); }
  }
}

/** 選択行のデータをすべてクリアする */
function ptClearSelected() {
  if (!_selectedRows.length) return;
  pushUndoManual();
  for (var si = 0; si < _selectedRows.length; si++) {
    var i = _selectedRows[si];
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    var k = document.getElementById('pk' + i);
    if (l) l.value = '';
    if (q) q.value = '';
    if (z) z.value = '';
    if (k) k.textContent = '—';
    var row = document.getElementById('pr' + i);
    if (row) row.classList.remove('pt-selected');
  }
  _selectedRows = [];
  updKg();
}

/** 選択状態を解除する */
function ptDeselect() {
  for (var i = 0; i < _selectedRows.length; i++) {
    var row = document.getElementById('pr' + _selectedRows[i]);
    if (row) row.classList.remove('pt-selected');
  }
  _selectedRows = [];
}
```

### 2-B. `main.js` — グローバルキーボードショートカット `document.addEventListener('keydown', ...)` に追記

既存のショートカットハンドラ（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Enter を処理している `document.addEventListener('keydown', function(e) {...})` ）の**先頭部分**に以下を追加する：

```js
// Ctrl+A：切り出し部材リスト全行を選択（ptList内にフォーカスがある場合）
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
  if (isInPtRow) {
    e.preventDefault();
    ptSelectAll();
    var ptList = document.getElementById('ptList');
    if (ptList) ptList.focus();
    return;
  }
}

// Delete / Backspace：選択行をクリア（行が選択されているとき優先処理）
if ((e.key === 'Delete' || e.key === 'Backspace') && _selectedRows.length > 0) {
  e.preventDefault();
  ptClearSelected();
  return;
}

// その他のキーを押したら行選択を解除
if (_selectedRows.length > 0 && e.key !== 'Delete' && e.key !== 'Backspace') {
  ptDeselect();
}
```

---

## 変更③ Ctrl+Enter ヒントをキーキャップ風スタイルに変更し、計算後も消えないようにする

### 3-A. `index.html` — runBtn のヒント span を `.run-hint` クラスに変更

```html
<button class="run" id="runBtn" onclick="runCalc()">
  計算を実行する <span class="arr">→</span><span class="run-hint">⌃↵</span>
</button>
```

### 3-B. `calc.js` — `btn.innerHTML` の復元箇所を全置換

`calc.js` 内にある以下の文字列を**すべて**（`replace_all`）置換する：

**変更前：**
```
btn.innerHTML = '計算を実行する <span class="arr">→</span>';
```

**変更後：**
```
btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">⌃↵</span>';
```

※ この文字列は `calc.js` 内に複数箇所（エラー復帰・計算完了など）あるため、すべての箇所を置換すること。

### 3-C. `style.css` — `.run-hint` クラスと `.pt-selected` クラスを追加

`.pt-row:last-child` の定義の直後に追記：

```css
/* Ctrl+A 全選択状態 */
.pt-row.pt-selected { background: rgba(109,40,217,.07); }
.pt-row.pt-selected input { background: rgba(109,40,217,.06); }

/* 計算ボタン Ctrl+Enter ヒント（キーキャップ風） */
.run-hint {
  font-size: 9px;
  font-weight: 500;
  opacity: .4;
  margin-left: 8px;
  border: 1px solid rgba(26,26,46,.25);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: monospace;
  letter-spacing: .02em;
  text-transform: none;
}
```

---

## 変更④ カーボンフットプリント計算を「準備中」に戻す

`index.html` の `id="useCarbonFootprint"` を含むトグル行に `wip-block` クラスを追加する。

**変更前：**
```html
<div class="ds-toggle-row" onclick="document.getElementById('useCarbonFootprint').click()">
```

**変更後：**
```html
<div class="ds-toggle-row wip-block" onclick="document.getElementById('useCarbonFootprint').click()">
```

---

## 確認事項

1. 部材リストの入力欄にカーソルがある状態で `Ctrl+A` → 全行が薄紫にハイライトされフォーカスが外れる
2. そのまま `Delete` キーを押すと全行のデータ（長さ・数量・工区）がクリアされる
3. `Ctrl+Z` でクリア前の状態に戻る（アンドゥ対応）
4. 他のキーを押すと選択ハイライトが解除される
5. ヘッダー右側の `✕` ボタンを押すと工区フィールドも含めてすべてクリアされる
6. 「計算を実行する」ボタンの右端に `⌃↵` がキー風の枠で表示される
7. 計算完了・エラー復帰後もヒントが消えず表示されている
8. 詳細設定の「カーボンフットプリント計算」が「準備中」（薄くなって操作不可）になっている

## 注意事項

- `_selectedRows` 変数はファイルのスコープ最上部（他のグローバル変数と同じ場所）に宣言する
- `ptSelectAll` / `ptClearSelected` / `ptDeselect` は既存の `pushUndoManual` / `updKg` に依存するため、それらより後に定義すること
- `calc.js` の `btn.innerHTML = '<span class="sp"></span> 計算中...'` は**変更しない**（計算中の表示はそのまま）
- `id="useCarbonFootprint"` の checkbox 自体は変更しない（wip-block は親 div に付ける）
- 他ページ（重量・データ・履歴・在庫）は**一切変更しない**
