# CODEX指示：重量タブ バグ修正 & 印刷ボタン追加

## 修正①　＋追加ボタンが動かないバグ（weight.js）

### 原因
`wCmdSelect(it)` 内で `wOnKind()` → `specEl.value = it.spec` → `wOnSpec()` の順に呼ぶが、
`wOnSpec()` が STEEL 辞書を再検索するため、spec 文字列が完全一致しないと `kgm = 0` になり、
`wAddRow()` 内の `if (kgm <= 0)` → alert で止まる。

### 修正方法
`wCmdSelect` 内で、`it.kgm` を **直接** `wKgm` hidden input にセットする。
STEEL 再検索は不要。

**対象ファイル: `weight.js`**

`wCmdSelect` 関数（703行付近）を以下のように変更する：

```js
// 変更前
function wCmdSelect(it) {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmDisp = document.getElementById('wCmdKgm');
  var input   = document.getElementById('wCmdInput');
  var dd      = document.getElementById('wCmdDropdown');
  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl) { specEl.value = it.spec; wOnSpec(); }
  if (input)   input.value          = it.kind + '　' + it.spec;
  if (kgmDisp) kgmDisp.textContent = it.kgm + ' kg/m';
  ...
}

// 変更後
function wCmdSelect(it) {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmEl   = document.getElementById('wKgm');       // ← 追加
  var kgmDisp = document.getElementById('wCmdKgm');
  var kgmValEl = document.getElementById('wKgmVal');   // ← 追加
  var input   = document.getElementById('wCmdInput');
  var dd      = document.getElementById('wCmdDropdown');
  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl) specEl.value = it.spec;
  // ★ STEEL再検索せず it.kgm を直接セット
  if (kgmEl)   kgmEl.value = String(it.kgm);
  if (kgmValEl) kgmValEl.textContent = it.kgm + ' kg/m';
  if (input)   input.value          = it.kind + '　' + it.spec;
  if (kgmDisp) kgmDisp.textContent = it.kgm + ' kg/m';
  if (dd)      dd.style.display     = 'none';
  _wCmdIdx = -1;
  document.removeEventListener('click', wCmdOutside);
  // 選択後は長さ欄へ自動フォーカス
  setTimeout(function() {
    var lenEl = document.getElementById('wLen');
    if (lenEl) { lenEl.focus(); lenEl.select(); }
  }, 0);
  wPreview();  // ← プレビュー更新
}
```

---

## 修正②　重量タブに印刷ボタンを追加（index.html）

### 現状
`weight.js` に `wPrint()` 関数は実装済みだが、HTML に呼び出しボタンが存在しない。
そのため重量タブから一度も印刷できていない。

### 修正方法
**対象ファイル: `index.html`**

重量タブのサイドバー下部、「リストをクリア」ボタンの直後に印刷ボタンを追加する。

```html
<!-- 追加位置: id="wClearBtn" の button の直後 -->
<button onclick="wPrint()" class="sm-btn"
  style="width:100%;margin-top:6px;padding:8px;background:none;border:1px solid #6d28d9;color:#6d28d9;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
  🖨 印刷
</button>
```

「リストをクリア」ボタンは以下のパターンで見つかる：
```html
<button id="wClearBtn"
```

---

## 動作確認

1. 重量タブで H形鋼などを検索→選択 → 長さ・本数を入力 → ＋ リストに追加 → 行が追加されることを確認
2. 「🖨 印刷」ボタン押下 → 新しいタブで印刷プレビューが開くことを確認
3. リストが空の状態で印刷ボタン → 「リストが空です」のアラートが出ることを確認
