# 重量ページ 結果反映・Enterフロー改善・塗装単価追加 実装指示

## 対象ファイル
- `weight.js`
- `index.html`

---

## 変更① weight.js — _wOpts に paint を追加

**変更前：**
```js
var _wOpts = { price: false, name: false, kuiku: false, rev: false };
```

**変更後：**
```js
var _wOpts = { price: false, name: false, kuiku: false, rev: false, paint: false };
```

---

## 変更② weight.js — wSetupEnter を全置換（wNextOptOrAdd 関数を追加）

**変更前（wSetupEnter 関数全体）：**
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
        e.stopPropagation();
        wAddRow();
      }
    });
    qtyEl.addEventListener('input', wPreview);
  }

  // 逆算欄はinputで即時計算のみ（Enterはキーボードフロー外）
  var revKgEl = document.getElementById('wRevKg');
  if (revKgEl) revKgEl.addEventListener('input', wCalcReverse);
}
```

**変更後（wNextOptOrAdd を追加し、wSetupEnter を書き換え）：**
```js
// チップONの欄を順番に辿り、なければwAddRow
function wNextOptOrAdd(from) {
  var order    = ['price', 'name', 'kuiku']; // 逆算・塗装単価はEnterフロー外
  var fieldMap = { price: 'wPrice', name: 'wMemo', kuiku: 'wKuiku' };
  var startIdx = (from === 'qty') ? 0 : order.indexOf(from) + 1;
  for (var i = startIdx; i < order.length; i++) {
    var opt = order[i];
    if (_wOpts[opt]) {
      var el = document.getElementById(fieldMap[opt]);
      if (el) { el.focus(); el.select(); return; }
    }
  }
  wAddRow();
}

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

  // 本数 → Enter → ONのオプション欄 or 追加
  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        wNextOptOrAdd('qty');
      }
    });
    qtyEl.addEventListener('input', wPreview);
  }

  // オプション欄のEnter → 次のON欄 or 追加（tabindex=-1でも動的リスナーは有効）
  [['wPrice', 'price'], ['wMemo', 'name'], ['wKuiku', 'kuiku']].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    var optKey = pair[1];
    if (el) {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          wNextOptOrAdd(optKey);
        }
      });
    }
  });

  // 逆算欄はinputで即時計算のみ（Enterはキーボードフロー外）
  var revKgEl = document.getElementById('wRevKg');
  if (revKgEl) revKgEl.addEventListener('input', wCalcReverse);
}
```

---

## 変更③ weight.js — wToggleOpt に塗装単価クリアを追加

**変更前：**
```js
  if (!_wOpts[opt]) {
    if (opt === 'price') { var pe = document.getElementById('wPrice'); if (pe) pe.value = ''; }
    if (opt === 'name')  { var me = document.getElementById('wMemo');  if (me) me.value = ''; }
    if (opt === 'kuiku') { var ke = document.getElementById('wKuiku'); if (ke) ke.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
```

**変更後：**
```js
  if (!_wOpts[opt]) {
    if (opt === 'price') { var pe = document.getElementById('wPrice');      if (pe) pe.value = ''; }
    if (opt === 'name')  { var me = document.getElementById('wMemo');       if (me) me.value = ''; }
    if (opt === 'kuiku') { var ke = document.getElementById('wKuiku');      if (ke) ke.value = ''; }
    if (opt === 'paint') { var ppe = document.getElementById('wPaintPrice');if (ppe) ppe.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
```

---

## 変更④ weight.js — wAddRow に塗装単価・工区を追加

**変更前（オプション読み取り部分）：**
```js
  var priceEl = document.getElementById('wPrice');
  var memoEl  = document.getElementById('wMemo');
  var kuikuEl = document.getElementById('wKuiku');
  var price   = (_wOpts.price  && priceEl)  ? (parseFloat(priceEl.value)  || 0) : 0;
  var memo    = (_wOpts.name   && memoEl)   ? (memoEl.value  || '') : '';
  var kuiku   = (_wOpts.kuiku  && kuikuEl)  ? (kuikuEl.value || '') : '';
```

**変更後：**
```js
  var priceEl      = document.getElementById('wPrice');
  var memoEl       = document.getElementById('wMemo');
  var kuikuEl      = document.getElementById('wKuiku');
  var paintPriceEl = document.getElementById('wPaintPrice');
  var price      = (_wOpts.price && priceEl)      ? (parseFloat(priceEl.value)      || 0) : 0;
  var memo       = (_wOpts.name  && memoEl)        ? (memoEl.value   || '') : '';
  var kuiku      = (_wOpts.kuiku && kuikuEl)       ? (kuikuEl.value  || '') : '';
  var paintPrice = (_wOpts.paint && paintPriceEl)  ? (parseFloat(paintPriceEl.value) || 0) : 0;
```

**変更前（_wRows.push の中身）：**
```js
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
```

**変更後：**
```js
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
    amount: price > 0 ? kg * price : null,
    paintPrice: paintPrice,
    paintAmount: paintPrice > 0 ? m2 * paintPrice : null
  });
```

---

## 変更⑤ weight.js — wRenderRows を全置換（列ズレ修正・工区表示・塗装金額列追加）

`wRenderRows` 関数全体を以下に置き換える。

変更点：
- tfoot の列ズレ修正（「1本重量」列の `<td>—</td>` を追加）
- 部材名セルに工区を小タグで追記
- 塗装金額列を追加（anyPaintAmount が true の場合）
- wSumBox に塗装金額行を追加

```js
function wRenderRows() {
  var empty      = document.getElementById('wEmpty');
  var tableWrap  = document.getElementById('wTableWrap');
  var tbody      = document.getElementById('wTbody');
  var tfoot      = document.getElementById('wTfoot');
  var cartBtn    = document.getElementById('wCartBtn');
  var mainHd     = document.getElementById('wMainHd');
  var sumBox     = document.getElementById('wSumBox');
  var sumKgEl    = document.getElementById('wSumKg');
  var sumM2El    = document.getElementById('wSumM2');
  var sumAmtRow  = document.getElementById('wSumAmtRow');
  var sumAmtEl   = document.getElementById('wSumAmt');
  var sumPaintRow= document.getElementById('wSumPaintRow');
  var sumPaintEl = document.getElementById('wSumPaint');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  if (_wRows.length === 0) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    if (cartBtn)     cartBtn.style.display = 'none';
    if (mainHd)      mainHd.style.display = 'none';
    if (sumBox)      sumBox.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  if (cartBtn) cartBtn.style.display = '';
  if (mainHd)  mainHd.style.display = 'flex';

  var anyPrice      = _wRows.some(function(r) { return r.amount !== null; });
  var anyPaintAmt   = _wRows.some(function(r) { return r.paintAmount !== null; });
  var sumKg   = 0;
  var sumM2   = 0;
  var sumAmt  = 0;
  var sumPaint= 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg    += r.kgTotal;
    sumM2    += r.m2Total;
    if (r.amount      !== null) sumAmt   += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;

    // 部材名セル（工区を小タグで併記）
    var kuikuTag = r.kuiku
      ? ' <span style="display:inline-block;font-size:9px;font-weight:600;padding:1px 5px;border-radius:10px;background:#ede9fe;color:#7c3aed;margin-left:3px">' + _esc(r.kuiku) + '</span>'
      : '';
    var memoCell =
      '<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(r.memo) + (r.kuiku ? '　' + _esc(r.kuiku) : '') + '">' +
      _esc(r.memo || '—') + kuikuTag + '</td>';

    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) + '</td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    var paintAmtCell = anyPaintAmt
      ? (r.paintAmount !== null
          ? '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.paintAmount, 0) + '</td>'
          : '<td style="' + _tdR + 'color:#ccc">—</td>')
      : '';

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + (i % 2 === 1 ? 'background:#fafafa' : '') + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i + 1) + '</td>' +
      memoCell +
      '<td style="' + _tdL + '">' + _esc(r.kind) + '</td>' +
      '<td style="' + _tdL + 'font-weight:600">' + _esc(r.spec) + '</td>' +
      '<td style="' + _tdR + '">' + r.len.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + r.qty.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + _wFmt(r.kg1, 0) + '</td>' +
      '<td style="' + _tdR + 'color:#6d28d9;font-weight:700">' + _wFmt(r.kgTotal, 0) + '</td>' +
      '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.m2Total, 2) + '</td>' +
      amtCell +
      paintAmtCell +
      '<td style="padding:6px;text-align:center">' +
        '<button onclick="wDeleteRow(' + i + ')" ' +
          'style="background:none;border:1px solid #e0e0ea;border-radius:6px;cursor:pointer;color:#aaa;font-size:11px;padding:2px 6px;line-height:1" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  // サマリーボックス更新
  if (sumBox) {
    sumBox.style.display = 'block';
    if (sumKgEl)  sumKgEl.textContent  = Math.round(sumKg).toLocaleString() + ' kg';
    if (sumM2El)  sumM2El.textContent  = _wFmt(sumM2, 2) + ' m²';
    if (sumAmtRow)   sumAmtRow.style.display   = anyPrice    ? 'flex' : 'none';
    if (sumAmtEl)    sumAmtEl.textContent       = _wFmt(sumAmt, 0)   + ' 円';
    if (sumPaintRow) sumPaintRow.style.display  = anyPaintAmt ? 'flex' : 'none';
    if (sumPaintEl)  sumPaintEl.textContent     = _wFmt(sumPaint, 0) + ' 円';
  }

  // 合計行（tfoot）
  // 列構成: # | 部材名 | 種類 | 規格 | 長さ | 本数 | 1本重量 | 合計重量 | 塗装合計 | 概算金額 | [塗装金額] | ×
  var totalAmtCell = anyPrice
    ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';

  var totalPaintCell = anyPaintAmt
    ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
    : '';

  tfoot.innerHTML =
    '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
    '<td colspan="5" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +                                                    // 本数
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +                                                    // 1本重量（集計なし）
    '<td style="' + _tdR + 'color:#6d28d9;font-weight:800;font-size:14px">' + _wFmt(sumKg, 0) + ' kg</td>' +  // 合計重量
    '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:14px">' + _wFmt(sumM2, 2) + ' m²</td>' +  // 塗装合計
    totalAmtCell +                                                                                        // 概算金額
    totalPaintCell +                                                                                      // 塗装金額（列が存在する場合のみ）
    '<td></td>' +                                                                                         // × ボタン列
    '</tr>';
}
```

---

## 変更⑥ index.html — theadに塗装金額列を追加

`id="wTable"` の `<thead>` 内、概算金額の `<th>` の**直後**（× の `<th>` の前）に追加：

```html
<th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
```

追加後の列順（概算金額の後）：
```
# | 部材名 | 種類 | 規格 | 長さ(mm) | 本数 | 1本重量(kg) | 合計重量(kg) | 塗装合計(m2) | 概算金額(円) | 塗装金額(円) | [×]
```

ただし、`anyPaintAmt` が false のときは tbody/tfoot に塗装金額セルが出力されないため、thead との列数がずれる。これを避けるため、thead の塗装金額列も動的に制御するか、または **常に列を出力**して `anyPaintAmt` が false の場合は全行 `—` を出力する方式にする。

→ **シンプルな実装方針：thead の塗装金額列は常に表示、値がない行は `—` とする。**

変更後の thead（塗装金額 th を追加）：
```html
<tr style="background:#f4f4fa;border-bottom:2px solid #e0e0ea">
  <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">#</th>
  <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">部材名</th>
  <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">種類</th>
  <th style="padding:8px 10px;text-align:left;font-size:10px;color:#5a5a78">規格</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">長さ(mm)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">本数</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#5a5a78">1本重量(kg)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#6d28d9;font-weight:700">合計重量(kg)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;font-weight:700">塗装合計(m2)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
  <th style="padding:8px 6px;width:28px"></th>
</tr>
```

thead が常に塗装金額列を表示するため、wRenderRows の tbody・tfoot も**常に塗装金額セルを出力**するよう変更⑤を調整する（`anyPaintAmt` の条件を外し常に出力）：

tbody の paintAmtCell を常時出力：
```js
var paintAmtCell = r.paintAmount !== null
  ? '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.paintAmount, 0) + '</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
```

tfoot の totalPaintCell も常時出力：
```js
var totalPaintCell = anyPaintAmt
  ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
  : '<td style="' + _tdR + 'color:#ccc">—</td>';
```

---

## 変更⑦ index.html — オプションチップに塗装単価を追加

**変更前：**
```html
<div class="w-opt-chips">
  <button class="w-opt-chip" id="wChip_price" onclick="wToggleOpt('price')">単価</button>
  <button class="w-opt-chip" id="wChip_name"  onclick="wToggleOpt('name')">部材名</button>
  <button class="w-opt-chip" id="wChip_kuiku" onclick="wToggleOpt('kuiku')">工区</button>
  <button class="w-opt-chip" id="wChip_rev"   onclick="wToggleOpt('rev')">⇄ 逆算</button>
</div>
```

**変更後：**
```html
<div class="w-opt-chips">
  <button class="w-opt-chip" id="wChip_price" onclick="wToggleOpt('price')">単価</button>
  <button class="w-opt-chip" id="wChip_name"  onclick="wToggleOpt('name')">部材名</button>
  <button class="w-opt-chip" id="wChip_kuiku" onclick="wToggleOpt('kuiku')">工区</button>
  <button class="w-opt-chip" id="wChip_paint" onclick="wToggleOpt('paint')">塗装単価</button>
  <button class="w-opt-chip" id="wChip_rev"   onclick="wToggleOpt('rev')">⇄ 逆算</button>
</div>
```

---

## 変更⑧ index.html — 塗装単価パネルを追加

工区パネル（`id="wPanel_kuiku"`）の**直後**に追加：

```html
<!-- 塗装単価パネル -->
<div id="wPanel_paint" style="display:none">
  <div class="field" style="margin-top:6px">
    <label>塗装単価 (円/m²)</label>
    <input type="number" id="wPaintPrice" placeholder="例：800" min="0" tabindex="-1">
  </div>
</div>
```

---

## 変更⑨ index.html — wSumBox に塗装金額行を追加

**変更前：**
```html
<div id="wSumAmtRow" style="display:none;justify-content:space-between">
  <span style="opacity:.85">概算金額</span>
  <span id="wSumAmt" style="font-weight:700;color:#16a34a">— 円</span>
</div>
```

**変更後（塗装金額行を直後に追加）：**
```html
<div id="wSumAmtRow" style="display:none;justify-content:space-between">
  <span style="opacity:.85">概算金額</span>
  <span id="wSumAmt" style="font-weight:700;color:#16a34a">— 円</span>
</div>
<div id="wSumPaintRow" style="display:none;justify-content:space-between">
  <span style="opacity:.85">塗装金額</span>
  <span id="wSumPaint" style="font-weight:700;color:#0891b2">— 円</span>
</div>
```

---

## 動作仕様

### Enterフロー
| 状況 | フロー |
|------|--------|
| チップ全OFF | 長さ → 本数 → 追加 → 長さ（ループ） |
| 単価のみON | 長さ → 本数 → 単価 → 追加 → 長さ |
| 部材名のみON | 長さ → 本数 → 部材名 → 追加 → 長さ |
| 単価＋工区ON | 長さ → 本数 → 単価 → 工区 → 追加 → 長さ |
| 全部ON（逆算除く）| 長さ → 本数 → 単価 → 部材名 → 工区 → 追加 → 長さ |

- 塗装単価・逆算はEnterフロー外（マウスのみ）
- `tabindex="-1"` は維持したまま動的 `addEventListener` でEnterを拾う

### 結果テーブル
- 工区は部材名セル内に薄紫タグで表示（列追加なし）
- 塗装金額列を常時表示（値なし行は `—`）
- tfoot の列ズレを修正（合計重量・塗装合計・概算金額が正しい列に表示）

## 注意事項

- 他ページ（計算・データ・履歴・在庫）は**一切変更しない**
- `wPrint` 関数内も塗装金額列・工区に対応する場合は別途指示
