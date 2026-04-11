# 重量タブ 列表示最適化

## 概要
- **リスト合計ボックスを削除**（入力のたびに画面がずれる問題を解消）
- **部材名・概算金額・塗装金額の列をデフォルト非表示**にし、
  チップ選択時のみ表示（塗装面積列と同じ仕組みに統一）

---

## 変更① `index.html` — wSumBox ブロックを完全削除

以下のブロックをまるごと削除する。

```html
<div id="wSumBox" style="display:none;background:#fff;border:1.5px solid #c4b5fd; ...">
  <div style="font-size:10px;color:#6d28d9; ...">リスト合計</div>
  <div style="display:flex; ...">
    <span style="opacity:.85">合計重量</span>
    <span id="wSumKg" ...>— kg</span>
  </div>
  <div style="display:flex; ...">
    <span style="opacity:.85">塗装面積</span>
    <span id="wSumM2" ...>— m2</span>
  </div>
  <div id="wSumAmtRow" style="display:none; ..."> ... </div>
  <div id="wSumPaintRow" style="display:none; ..."> ... </div>
</div>
```

---

## 変更② `index.html` — thead 列に id と `display:none` を追加

`id="wTable"` の `<thead>` 内、以下の3列を変更する。

**変更前：**
```html
<th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">部材名</th>
...
<th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
<th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
```

**変更後：**
```html
<th id="wThName"  style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78;display:none">部材名</th>
...
<th id="wThAmt"   style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a;display:none">概算金額(円)</th>
<th id="wThPaint" style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;display:none">塗装金額(円)</th>
```

---

## 変更③ `weight.js` — wRenderRows の sumBox 参照をすべて削除

`wRenderRows` 関数の先頭の変数宣言から以下の行を削除する：

```js
var sumBox      = document.getElementById('wSumBox');
var sumKgEl     = document.getElementById('wSumKg');
var sumM2El     = document.getElementById('wSumM2');
var sumAmtRow   = document.getElementById('wSumAmtRow');
var sumAmtEl    = document.getElementById('wSumAmt');
var sumPaintRow = document.getElementById('wSumPaintRow');
var sumPaintEl  = document.getElementById('wSumPaint');
```

また、行ゼロのときの以下の行も削除する：
```js
if (sumBox)  sumBox.style.display  = 'none';
```

また、行があるときの sumBox 更新ブロックをまるごと削除する：
```js
if (sumBox) {
  sumBox.style.display = 'block';
  if (sumKgEl)     sumKgEl.textContent       = ...;
  if (sumM2El)     sumM2El.textContent       = ...;
  if (sumAmtRow)   sumAmtRow.style.display   = ...;
  if (sumAmtEl)    sumAmtEl.textContent      = ...;
  if (sumPaintRow) sumPaintRow.style.display = ...;
  if (sumPaintEl)  sumPaintEl.textContent    = ...;
}
```

---

## 変更④ `weight.js` — wRenderRows の thead 列表示切替を追加

変数宣言に以下を追加する（`thM2` の宣言の直後）：

```js
var thM2    = document.getElementById('wThM2');
var thName  = document.getElementById('wThName');
var thAmt   = document.getElementById('wThAmt');
var thPaint = document.getElementById('wThPaint');
```

列表示切替のブロック（`// 塗装面積列 thead 表示切替` のあたり）を以下に置き換える：

**変更前：**
```js
// 塗装面積列 thead 表示切替
if (thM2) thM2.style.display = _wOpts.m2 ? '' : 'none';
```

**変更後：**
```js
// thead 列表示切替（オプション選択時のみ表示）
if (thM2)    thM2.style.display    = _wOpts.m2    ? '' : 'none';
if (thName)  thName.style.display  = _wOpts.name  ? '' : 'none';
if (thAmt)   thAmt.style.display   = _wOpts.price ? '' : 'none';
if (thPaint) thPaint.style.display = _wOpts.paint ? '' : 'none';
```

---

## 変更⑤ `weight.js` — tbody の各 td に display 切替を追加

`tbody.innerHTML = _wRows.map(...)` 内の各セル生成を以下のように変更する。

### 部材名セル（変更前）：
```js
'<td style="padding:7px 10px;font-size:11px;color:#5a5a78; ..." title="...">' +
  _esc(r.memo || '—') + kuikuTag +
'</td>' +
```

### 部材名セル（変更後）：
```js
'<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
  (_wOpts.name ? '' : 'display:none') + '" title="' + _esc(r.memo) + (r.kuiku ? '　'+_esc(r.kuiku) : '') + '">' +
  _esc(r.memo || '—') + kuikuTag +
'</td>' +
```

### amtCell（変更前）：
```js
var amtCell = r.amount !== null
  ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">...</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
```

### amtCell（変更後）：
```js
var amtDisp = _wOpts.price ? '' : 'display:none;';
var amtCell = r.amount !== null
  ? '<td style="' + _tdR + amtDisp + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) +
    '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.price + '円/kg</span></td>'
  : '<td style="' + _tdR + amtDisp + 'color:#ccc">—</td>';
```

### paintAmtCell（変更前）：
```js
var paintAmtCell = r.paintAmount !== null
  ? '<td style="' + _tdR + 'color:#0891b2;font-weight:700">...</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
```

### paintAmtCell（変更後）：
```js
var paintDisp = _wOpts.paint ? '' : 'display:none;';
var paintAmtCell = r.paintAmount !== null
  ? '<td style="' + _tdR + paintDisp + 'color:#0891b2;font-weight:700">' + _wFmt(r.paintAmount, 0) +
    '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.paintPrice + '円/m²</span></td>'
  : '<td style="' + _tdR + paintDisp + 'color:#ccc">—</td>';
```

---

## 変更⑥ `weight.js` — tfoot の合計行も同様に非表示対応

`tfoot.innerHTML = ...` のブロックを以下に変更する。

**変更前（totalAmtCell, totalPaintCell）：**
```js
var totalAmtCell = anyPrice
  ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
var totalPaintCell = anyPaintAmt
  ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
```

**変更後：**
```js
var totalAmtCell = _wOpts.price
  ? (anyPrice
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>')
  : '';
var totalPaintCell = _wOpts.paint
  ? (anyPaintAmt
      ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>')
  : '';
```

また tfoot の `colspan="5"` の合計行先頭セルも、
`_wOpts.name` が false のとき列数が1つ減るため `colspan` を動的にする：

```js
'<td colspan="' + (4 + (_wOpts.name ? 1 : 0)) + '" style="padding:10px;font-size:11px;font-weight:700; ...">合　計</td>' +
```

※ 現在の列構成（name非表示時）: #・種類・規格・長さ・本数 = 5列 → colspan=5
   name表示時: #・部材名・種類・規格・長さ・本数 = 6列 → colspan=6
   （現状は colspan="5" のため name列が消えたときは colspan="5" のままでOK、
    name列が出たときは colspan="6" に変更）

**修正版：**
```js
var nameCols = _wOpts.name ? 1 : 0;
tfoot.innerHTML =
  '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
  '<td colspan="' + (5 + nameCols) + '" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
  '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
  '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
  '<td style="' + _tdR + 'color:#6d28d9;font-weight:800;font-size:14px">' + _wFmt(sumKg, 0) + ' kg</td>' +
  totalM2Cell +
  totalAmtCell +
  totalPaintCell +
  '<td></td><td></td>' +
  '</tr>';
```

---

## 期待される動作

| 状態 | 表示される列 |
|---|---|
| デフォルト（チップ未選択） | #・種類・規格・長さ・本数・1本重量・合計重量 |
| 「単価」チップON | + 概算金額 |
| 「塗装単価」チップON | + 塗装金額 |
| 「塗装面積」チップON | + 塗装面積(m²) |
| 「部材名」チップON | + 部材名 |
| 「工区」チップON | 部材名セル内に工区バッジ表示（列追加なし・現状維持） |
