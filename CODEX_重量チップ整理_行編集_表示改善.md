# 重量ページ チップ整理・行編集・表示改善 実装指示

## 対象ファイル
- `weight.js`
- `index.html`
- `style.css`

---

## 変更① weight.js — グローバル変数追加

ファイル先頭の変数ブロックに追加する。

**変更前：**
```js
var _wOpts = { price: false, name: false, kuiku: false, rev: false, paint: false };
```

**変更後：**
```js
var _wOpts = { price: false, name: false, kuiku: false, rev: false, paint: false, m2: false };

// 編集モード
var _wEditIdx = -1;
```

---

## 変更② weight.js — wInit に初期フォーカス追加

`wInit()` 末尾（`// メモ入力チェックマーク` の直前）に追記：

```js
  // 重量タブを開いた時は鋼材検索欄にフォーカス
  setTimeout(function() {
    var cmdInput = document.getElementById('wCmdInput');
    if (cmdInput) cmdInput.focus();
  }, 80);
```

---

## 変更③ weight.js — wToggleOpt 全置換（チップON時のフォーカス + m2対応）

```js
function wToggleOpt(opt) {
  _wOpts[opt] = !_wOpts[opt];
  var chip = document.getElementById('wChip_' + opt);
  if (chip) chip.classList.toggle('w-opt-chip--on', _wOpts[opt]);
  var panel = document.getElementById('wPanel_' + opt);
  if (panel) panel.style.display = _wOpts[opt] ? '' : 'none';

  // m2は列表示切替のみ（パネルなし）
  if (opt === 'm2') {
    wRenderRows();
    return;
  }

  if (_wOpts[opt]) {
    // チップON → その欄にフォーカス
    var focusMap = {
      price: 'wPrice',
      name:  'wMemo',
      kuiku: 'wKuiku',
      paint: 'wPaintPrice',
      rev:   'wRevKg'
    };
    var focusId = focusMap[opt];
    if (focusId) {
      setTimeout(function() {
        var el = document.getElementById(focusId);
        if (el) el.focus();
      }, 30);
    }
  } else {
    // チップOFF → 値をクリア
    if (opt === 'price') { var pe  = document.getElementById('wPrice');       if (pe)  pe.value  = ''; }
    if (opt === 'name')  { var me  = document.getElementById('wMemo');        if (me)  me.value  = ''; }
    if (opt === 'kuiku') { var ke  = document.getElementById('wKuiku');       if (ke)  ke.value  = ''; }
    if (opt === 'paint') { var ppe = document.getElementById('wPaintPrice');  if (ppe) ppe.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
}
```

---

## 変更④ weight.js — wAddRow 全置換（編集モード対応）

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

  var priceEl      = document.getElementById('wPrice');
  var memoEl       = document.getElementById('wMemo');
  var kuikuEl      = document.getElementById('wKuiku');
  var paintPriceEl = document.getElementById('wPaintPrice');
  var price      = (_wOpts.price && priceEl)      ? (parseFloat(priceEl.value)       || 0) : 0;
  var memo       = (_wOpts.name  && memoEl)        ? (memoEl.value   || '') : '';
  var kuiku      = (_wOpts.kuiku && kuikuEl)       ? (kuikuEl.value  || '') : '';
  var paintPrice = (_wOpts.paint && paintPriceEl)  ? (parseFloat(paintPriceEl.value) || 0) : 0;

  var kg1  = kgm * len / 1000;
  var kg   = kg1 * qty;
  var ppm  = wGetPaintPerM(kind, spec);
  var m2_1 = ppm * len / 1000;
  var m2   = m2_1 * qty;

  wPushUndo();

  var rowData = {
    kind: kind, spec: spec, memo: memo, kuiku: kuiku,
    len: len, qty: qty, kgm: kgm,
    kg1: kg1, kgTotal: kg,
    m2_1: m2_1, m2Total: m2,
    price: price,
    amount: price > 0 ? kg * price : null,
    paintPrice: paintPrice,
    paintAmount: paintPrice > 0 ? m2 * paintPrice : null
  };

  if (_wEditIdx >= 0) {
    // 編集モード：既存行を上書き
    _wRows[_wEditIdx] = rowData;
    _wEditIdx = -1;
    var addBtn = document.getElementById('wAddBtn');
    if (addBtn) addBtn.innerHTML = '＋ リストに追加';
    var cancelBtn = document.getElementById('wCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
    _wRows.push(rowData);
  }

  wRenderRows();
  setTimeout(function() {
    lenEl.focus();
    lenEl.select();
  }, 0);
}
```

---

## 変更⑤ weight.js — wEditRow・wCancelEdit を追加

`wDeleteRow` の直前に以下を追加する：

```js
function wEditRow(idx) {
  var r = _wRows[idx];
  if (!r) return;
  _wEditIdx = idx;

  // 鋼材種類・規格をセット
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (kindEl) { kindEl.value = r.kind; wOnKind(); }
  if (specEl) { specEl.value = r.spec; wOnSpec(); }

  // 検索欄の表示更新
  var cmdInput = document.getElementById('wCmdInput');
  var kgmDisp  = document.getElementById('wCmdKgm');
  if (cmdInput) cmdInput.value = r.kind + '　' + r.spec;
  if (kgmDisp)  kgmDisp.textContent = r.kgm ? r.kgm + ' kg/m' : '';

  // 長さ・本数
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  if (lenEl) lenEl.value = r.len;
  if (qtyEl) qtyEl.value = r.qty;

  // オプションチップON + 値セット（既にONなら値だけセット）
  if (r.price > 0) {
    if (!_wOpts.price) wToggleOpt('price');
    var pe = document.getElementById('wPrice');
    if (pe) pe.value = r.price;
  }
  if (r.memo) {
    if (!_wOpts.name) wToggleOpt('name');
    var me = document.getElementById('wMemo');
    if (me) me.value = r.memo;
  }
  if (r.kuiku) {
    if (!_wOpts.kuiku) wToggleOpt('kuiku');
    var ke = document.getElementById('wKuiku');
    if (ke) ke.value = r.kuiku;
  }
  if (r.paintPrice > 0) {
    if (!_wOpts.paint) wToggleOpt('paint');
    var ppe = document.getElementById('wPaintPrice');
    if (ppe) ppe.value = r.paintPrice;
  }

  // ボタンを「更新」に変更
  var addBtn = document.getElementById('wAddBtn');
  if (addBtn) addBtn.innerHTML = '✓ 更新';
  var cancelBtn = document.getElementById('wCancelBtn');
  if (cancelBtn) cancelBtn.style.display = '';

  // 編集行ハイライト更新
  wRenderRows();

  // 長さ欄にフォーカス
  setTimeout(function() {
    if (lenEl) { lenEl.focus(); lenEl.select(); }
  }, 50);
}

function wCancelEdit() {
  _wEditIdx = -1;
  var addBtn = document.getElementById('wAddBtn');
  if (addBtn) addBtn.innerHTML = '＋ リストに追加';
  var cancelBtn = document.getElementById('wCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  wRenderRows();
  setTimeout(function() {
    var lenEl = document.getElementById('wLen');
    if (lenEl) { lenEl.focus(); lenEl.select(); }
  }, 30);
}
```

---

## 変更⑥ weight.js — wRenderRows 全置換

列構成：`# | 部材名(+工区タグ) | 種類 | 規格 | 長さ | 本数 | 1本重量 | 合計重量 | [塗装面積 m2バッジON時] | 概算金額(@単価) | 塗装金額(@塗装単価) | ✎ | ✕`

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
  var thM2       = document.getElementById('wThM2');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  if (_wRows.length === 0) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    if (cartBtn) cartBtn.style.display = 'none';
    if (mainHd)  mainHd.style.display  = 'none';
    if (sumBox)  sumBox.style.display  = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  if (cartBtn) cartBtn.style.display = '';
  if (mainHd)  mainHd.style.display  = 'flex';

  // 塗装面積列 thead の表示切替
  if (thM2) thM2.style.display = _wOpts.m2 ? '' : 'none';

  var anyPrice    = _wRows.some(function(r) { return r.amount !== null; });
  var anyPaintAmt = _wRows.some(function(r) { return r.paintAmount !== null; });
  var sumKg    = 0;
  var sumM2    = 0;
  var sumAmt   = 0;
  var sumPaint = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg    += r.kgTotal;
    sumM2    += r.m2Total;
    if (r.amount      !== null) sumAmt   += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;

    // 部材名セル（工区を薄紫タグで併記）
    var kuikuTag = r.kuiku
      ? ' <span style="display:inline-block;font-size:9px;font-weight:600;padding:1px 5px;border-radius:10px;background:#ede9fe;color:#7c3aed;margin-left:3px">' + _esc(r.kuiku) + '</span>'
      : '';

    // 塗装面積セル（m2バッジOFF時は display:none）
    var m2Cell = '<td style="' + _tdR + 'color:#0891b2;font-weight:700;' + (_wOpts.m2 ? '' : 'display:none') + '">' + _wFmt(r.m2Total, 2) + '</td>';

    // 概算金額セル（単価をサブテキストで表示）
    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.price + '円/kg</span></td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    // 塗装金額セル（塗装単価をサブテキストで表示）
    var paintAmtCell = r.paintAmount !== null
      ? '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.paintAmount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.paintPrice + '円/m²</span></td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    // 編集中の行はハイライト
    var rowBg = (_wEditIdx === i)
      ? 'background:#fffde7;'
      : (i % 2 === 1 ? 'background:#fafafa;' : '');

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + rowBg + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(r.memo) + (r.kuiku ? '　' + _esc(r.kuiku) : '') + '">' +
        _esc(r.memo || '—') + kuikuTag +
      '</td>' +
      '<td style="' + _tdL + '">' + _esc(r.kind) + '</td>' +
      '<td style="' + _tdL + 'font-weight:600">' + _esc(r.spec) + '</td>' +
      '<td style="' + _tdR + '">' + r.len.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + r.qty.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + _wFmt(r.kg1, 0) + '</td>' +
      '<td style="' + _tdR + 'color:#6d28d9;font-weight:700">' + _wFmt(r.kgTotal, 0) + '</td>' +
      m2Cell +
      amtCell +
      paintAmtCell +
      '<td style="padding:4px 2px;text-align:center">' +
        '<button onclick="wEditRow(' + i + ')" ' +
          'style="background:none;border:1px solid #d0d0e0;border-radius:6px;cursor:pointer;color:#8888a8;font-size:12px;padding:2px 6px;line-height:1" title="編集">✎</button>' +
      '</td>' +
      '<td style="padding:4px 2px;text-align:center">' +
        '<button onclick="wDeleteRow(' + i + ')" ' +
          'style="background:none;border:1px solid #e0e0ea;border-radius:6px;cursor:pointer;color:#ccc;font-size:11px;padding:2px 6px;line-height:1" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  // サマリーボックス更新
  if (sumBox) {
    sumBox.style.display = 'block';
    if (sumKgEl)     sumKgEl.textContent             = Math.round(sumKg).toLocaleString() + ' kg';
    if (sumM2El)     sumM2El.textContent             = _wFmt(sumM2, 2) + ' m²';
    if (sumAmtRow)   sumAmtRow.style.display         = anyPrice     ? 'flex' : 'none';
    if (sumAmtEl)    sumAmtEl.textContent            = _wFmt(sumAmt, 0)   + ' 円';
    if (sumPaintRow) sumPaintRow.style.display       = anyPaintAmt  ? 'flex' : 'none';
    if (sumPaintEl)  sumPaintEl.textContent          = _wFmt(sumPaint, 0) + ' 円';
  }

  // tfoot
  // 列: colspan5 | 本数— | 1本重量— | 合計重量 | [塗装面積 m2ON時] | 概算金額 | 塗装金額 | edit空 | del空
  var totalAmtCell = anyPrice
    ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';

  var totalPaintCell = anyPaintAmt
    ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';

  var totalM2Cell = _wOpts.m2
    ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumM2, 2) + ' m²</td>'
    : '';

  tfoot.innerHTML =
    '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
    '<td colspan="5" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
    '<td style="' + _tdR + 'color:#6d28d9;font-weight:800;font-size:14px">' + _wFmt(sumKg, 0) + ' kg</td>' +
    totalM2Cell +
    totalAmtCell +
    totalPaintCell +
    '<td></td>' +
    '<td></td>' +
    '</tr>';
}
```

---

## 変更⑦ index.html — チップ順変更・塗装面積チップ追加

**変更前：**
```html
<div class="w-opt-chips">
  <button class="w-opt-chip" id="wChip_price" onclick="wToggleOpt('price')">単価</button>
  <button class="w-opt-chip" id="wChip_name"  onclick="wToggleOpt('name')">部材名</button>
  <button class="w-opt-chip" id="wChip_kuiku" onclick="wToggleOpt('kuiku')">工区</button>
  <button class="w-opt-chip" id="wChip_paint" onclick="wToggleOpt('paint')">塗装単価</button>
  <button class="w-opt-chip" id="wChip_rev"   onclick="wToggleOpt('rev')">⇄ 逆算</button>
</div>
```

**変更後：**
```html
<div class="w-opt-chips">
  <button class="w-opt-chip" id="wChip_price" onclick="wToggleOpt('price')">単価</button>
  <button class="w-opt-chip" id="wChip_paint" onclick="wToggleOpt('paint')">塗装単価</button>
  <button class="w-opt-chip" id="wChip_m2"    onclick="wToggleOpt('m2')">塗装面積</button>
  <button class="w-opt-chip" id="wChip_name"  onclick="wToggleOpt('name')">部材名</button>
  <button class="w-opt-chip" id="wChip_kuiku" onclick="wToggleOpt('kuiku')">工区</button>
  <button class="w-opt-chip" id="wChip_rev"   onclick="wToggleOpt('rev')">⇄ 逆算</button>
</div>
```

---

## 変更⑧ index.html — 追加ボタンに id・キャンセルボタン追加

**変更前：**
```html
<button onclick="wAddRow()" class="run" style="margin-top:8px">
  ＋ リストに追加
</button>
```

**変更後：**
```html
<button id="wAddBtn" onclick="wAddRow()" class="run" style="margin-top:8px">
  ＋ リストに追加
</button>
<button id="wCancelBtn" onclick="wCancelEdit()" class="sm-btn" style="width:100%;margin-top:4px;padding:7px;display:none;color:#8888a8">
  キャンセル
</button>
```

---

## 変更⑨ index.html — thead に 塗装面積th と ✎列 を追加

**変更前：**
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

**変更後：**
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
  <th id="wThM2" style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;font-weight:700;display:none">塗装面積(m²)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
  <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
  <th style="padding:8px 6px;width:24px"></th>
  <th style="padding:8px 6px;width:24px"></th>
</tr>
```

変更点：
- `塗装合計(m2)` → `id="wThM2"` を付与・初期 `display:none`（塗装面積バッジON時にJSで表示）
- 末尾に `<th>` を2列に分割（✎ 列 + ✕ 列）

---

## 変更⑩ index.html — wSumBox に塗装金額行を追加

`id="wSumAmtRow"` の div の**直後**に追加：

```html
<div id="wSumPaintRow" style="display:none;justify-content:space-between">
  <span style="opacity:.85">塗装金額</span>
  <span id="wSumPaint" style="font-weight:700;color:#0891b2">— 円</span>
</div>
```

※ 既に追加済みの場合はスキップ

---

## 動作仕様

### チップ一覧（左から順）
| チップ | 役割 |
|-------|------|
| 単価 | 円/kg入力 → 概算金額列に @単価 付きで表示 |
| 塗装単価 | 円/m²入力 → 塗装金額列に @塗装単価 付きで表示 |
| 塗装面積 | ONにすると 塗装面積(m²) 列が出現 |
| 部材名 | 部材名・メモ入力 |
| 工区 | 工区入力 → 部材名セル内に薄紫タグで表示 |
| ⇄ 逆算 | 目標重量から必要本数・長さを逆算 |

### 行編集フロー
1. 結果テーブルの行で `✎` をクリック
2. 左サイドバーの入力欄にその行のデータが読み込まれる
3. 「＋ リストに追加」ボタンが「✓ 更新」に変わる
4. キャンセルボタンが出現
5. 修正後「✓ 更新」押下 → 行が更新されてカーソルが長さ欄に戻る
6. キャンセル押下 → 元の状態に戻る・編集中ハイライト消える

### 全バッジON時の列数
`# | 部材名 | 種類 | 規格 | 長さ | 本数 | 1本重量 | 合計重量 | 塗装面積 | 概算金額 | 塗装金額 | ✎ | ✕` = 13列（塗装面積OFF時は12列）

## 注意事項

- 他ページ（計算・データ・履歴・在庫）は**一切変更しない**
- `wPrint` 関数は今回対象外（別途対応）
- `wSumPaintRow` が既に index.html に存在する場合は変更⑩をスキップ
