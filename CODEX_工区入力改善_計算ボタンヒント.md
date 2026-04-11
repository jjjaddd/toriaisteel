# 工区入力改善・計算ボタンCtrl+Enterヒント 実装指示

## 対象ファイル
- `index.html`
- `main.js`
- `style.css`

---

## 変更① 工区入力欄のプレースホルダー「工区」を削除

`main.js` の `addPartRowAt()` 内、`pz` inputから `placeholder="工区"` を取り除く。

**変更前：**
```js
'<input type="text" id="pz' + i + '" placeholder="工区" style="...">'
```

**変更後：**
```js
'<input type="text" id="pz' + i + '" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'z\')" style="' + (kuikuEnabled ? '' : 'display:none') + '">'
```

追加点：
- `placeholder` 属性を削除（空欄のまま）
- `onfocus="ptUndoFocus()"` `onblur="ptUndoBlur()"` を追加（アンドゥ対応）
- `onkeydown="ptEnter(event,i,'z')"` を追加（Enterキーで次の工区へ移動）

---

## 変更② Enterキーナビゲーション：数量 → 工区 → 次行工区

`main.js` の `ptEnter()` 関数を以下に**置き換える**：

```js
function ptEnter(e, i, col) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var kuikuOn = document.getElementById('useKuiku') && document.getElementById('useKuiku').checked;
  if (col === 'l') {
    // 長さ → 数量へ
    var next = document.getElementById('pq' + i);
    if (next) { next.focus(); next.select(); }
  } else if (col === 'q') {
    if (kuikuOn) {
      // 工区ONのとき: 数量 → 同行の工区へ
      var pz = document.getElementById('pz' + i);
      if (pz) { pz.focus(); pz.select(); }
    } else {
      // 工区OFFのとき: 数量 → 次行の長さへ（なければ行追加）
      var nextRow = document.getElementById('pl' + (i+1));
      if (nextRow) {
        nextRow.focus(); nextRow.select();
      } else {
        addPartRow();
        setTimeout(function() {
          var nr = document.getElementById('pl' + (i+1));
          if (nr) { nr.focus(); nr.select(); }
        }, 30);
      }
    }
  } else if (col === 'z') {
    // 工区 → 次行の工区へ（なければ行追加してから工区へ）
    var nextPz = document.getElementById('pz' + (i+1));
    if (nextPz) {
      nextPz.focus(); nextPz.select();
    } else {
      addPartRow();
      setTimeout(function() {
        var nz = document.getElementById('pz' + (i+1));
        if (nz) { nz.focus(); nz.select(); }
      }, 30);
    }
  }
}
```

---

## 変更③ 列ヘッダーと工区列のズレを修正

### 3-A. `index.html` — `pt-hd` の工区ヘッダーから `text-align:right` を削除

```html
<div class="pt-hd">
  <span></span>
  <span>長さ (mm)</span>
  <span style="text-align:right">数量</span>
  <span id="ptHdKuiku" style="display:none">工区</span>
  <span style="text-align:right;padding-right:6px">重量</span>
</div>
```

変更点：`ptHdKuiku` の inline style から `text-align:right;` を削除し `display:none` のみにする。

### 3-B. `main.js` — `toggleKuiku()` の display 修正

```js
if (hdKuiku) hdKuiku.style.display = enabled ? '' : 'none';
```

`'inline-block'` → `''`（空文字）に変更。inline-blockはグリッドアイテムとして意図しない幅計算をするため。

### 3-C. `style.css` — 工区列の幅・配置を修正

工区ON時のグリッド定義と工区セルのスタイルを追記・修正：

```css
/* 工区カラム有効時 */
.pt-wrap.kuiku-on .pt-hd { grid-template-columns: 18px 1fr 54px 64px 56px; }
.pt-wrap.kuiku-on .pt-row { grid-template-columns: 18px 1fr 54px 64px 56px; }
#ptHdKuiku { text-align: center; }
.pt-row input[id^="pz"] { text-align: center; font-size: 11px; }
```

工区列を56px→64pxに広げ、ヘッダー・入力ともに中央揃えにする。

---

## 変更④ 「計算を実行する」ボタンに Ctrl+Enter ヒントを追記

`index.html` の `id="runBtn"` を以下に変更：

```html
<button class="run" id="runBtn" onclick="runCalc()">
  計算を実行する
  <span class="arr">→</span>
  <span style="font-size:9px;font-weight:400;opacity:.45;margin-left:4px">Ctrl+Enter</span>
</button>
```

---

## 確認事項

1. 工区ONにしたとき、工区入力欄に何も表示されない（プレースホルダー「工区」が消えている）
2. 長さ→Enter→数量→Enter→工区→Enter→次行の工区　の順にフォーカスが移動する
3. 工区OFFのときは従来通り　長さ→Enter→数量→Enter→次行の長さ
4. 工区列のヘッダーと入力欄が縦にきれいに揃っている
5. 「計算を実行する」ボタンの右端に薄く「Ctrl+Enter」と表示される

## 注意事項

- `id="useKuiku"` `id="runBtn"` は変更禁止
- `addPartRowAt()` の `pl` / `pq` / `pk` 部分は変更しない（pz のみ変更）
- 他ページ（重量・データ・履歴・在庫）は**一切変更しない**
