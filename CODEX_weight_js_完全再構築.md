# weight.js 完全再構築 + index.html チップ・テーブル修正

## 背景・理由

現在の `weight.js` は以下の問題がある：
1. `wInit`, `wSetupEnter`, `wToggleOpt`, `wAddRow`, `wRenderRows` が重複定義されている
2. ファイル末尾の `wPrint` 関数が途中で切れており不完全
3. `wCmdBuildAll`, `wCmdSelect` など コマンドパレット関数が未定義
4. `_wEditIdx`, `m2` オプション, `wEditRow`, `wCancelEdit` が未実装

## 対象ファイル
- `weight.js` — **ファイル全体を以下の内容で完全置換する**
- `index.html` — チップブロック・追加ボタン・thead の3か所を変更

---

## 変更A: weight.js を以下の内容で**ファイルごと完全置換**

```js
// weight.js - weight simulator
// Depends on STEEL global defined in calc.js / main.js

// ── グローバル変数 ─────────────────────────────────────────────
var _wInited    = false;
var _wRows      = [];
var _wUndoStack = [];
var _wRedoStack = [];
var _wOpts      = { price: false, name: false, kuiku: false, rev: false, paint: false, m2: false };
var _wEditIdx   = -1;

// コマンドパレット
var _wCmdAll = [];
var _wCmdIdx = -1;

// ── スタイル定数 ───────────────────────────────────────────────
var _tdL = 'padding:8px 10px;text-align:left;white-space:nowrap;';
var _tdR = 'padding:8px 10px;text-align:right;white-space:nowrap;font-family:monospace;';

// ── ヘルパー ──────────────────────────────────────────────────
function _wSpecName(row) { return row[0]; }
function _wSpecKgm(row)  { return row[1]; }

function _wFmt(v, dec) {
  return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escAttr(s) {
  return '\'' + String(s).replace(/\\/g,'\\\\').replace(/'/g,'\\\'').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\'';
}

// ── 初期化 ────────────────────────────────────────────────────
function wInit() {
  var kindEl = document.getElementById('wKind');
  if (!kindEl || typeof STEEL !== 'object' || !STEEL) return;

  if (!_wInited) {
    kindEl.innerHTML = '';
    Object.keys(STEEL).forEach(function(kind) {
      var opt = document.createElement('option');
      opt.value = kind;
      opt.textContent = kind;
      kindEl.appendChild(opt);
    });
    _wInited = true;
    wSetupEnter();
  }

  wOnKind();
  wRenderRows();
  wCmdBuildAll();

  var cmdInput = document.getElementById('wCmdInput');
  if (cmdInput && !cmdInput.value && Object.keys(STEEL).length > 0) {
    var firstKind = Object.keys(STEEL)[0];
    var firstSpec = Array.isArray(STEEL[firstKind]) && STEEL[firstKind].length > 0 ? STEEL[firstKind][0] : null;
    if (firstSpec) {
      wCmdSelect({
        kind:  firstKind,
        spec:  _wSpecName(firstSpec),
        kgm:   _wSpecKgm(firstSpec),
        label: firstKind + ' ' + _wSpecName(firstSpec)
      });
      cmdInput.value = '';
      cmdInput.placeholder = 'H100 / F9 / RB32';
    }
  }

  // タブを開いた時は鋼材検索欄にフォーカス
  setTimeout(function() {
    var el = document.getElementById('wCmdInput');
    if (el) el.focus();
  }, 80);
}

// ── Enter フロー ──────────────────────────────────────────────
function wNextOptOrAdd(from) {
  var order    = ['price', 'name', 'kuiku'];
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

  if (lenEl) {
    lenEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
      }
    });
    lenEl.addEventListener('input', wPreview);
    lenEl.addEventListener('focus', function() { this.select(); });
  }

  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        wNextOptOrAdd('qty');
      }
    });
    qtyEl.addEventListener('input', wPreview);
    qtyEl.addEventListener('focus', function() { this.select(); });
  }

  [['wPrice','price'], ['wMemo','name'], ['wKuiku','kuiku']].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    var optKey = pair[1];
    if (el) {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); wNextOptOrAdd(optKey); }
      });
    }
  });

  var revKgEl = document.getElementById('wRevKg');
  if (revKgEl) revKgEl.addEventListener('input', wCalcReverse);
}

// ── アンドゥ/リドゥ ───────────────────────────────────────────
function wSnapRows() { return JSON.parse(JSON.stringify(_wRows)); }

function wPushUndo() {
  _wUndoStack.push(wSnapRows());
  if (_wUndoStack.length > 50) _wUndoStack.shift();
  _wRedoStack = [];
}

function wUndoAction() {
  if (!_wUndoStack.length) return;
  _wRedoStack.push(wSnapRows());
  _wRows = _wUndoStack.pop();
  wRenderRows();
}

function wRedoAction() {
  if (!_wRedoStack.length) return;
  _wUndoStack.push(wSnapRows());
  _wRows = _wRedoStack.pop();
  wRenderRows();
}

// ── オプションチップ ──────────────────────────────────────────
function wToggleOpt(opt) {
  _wOpts[opt] = !_wOpts[opt];
  var chip = document.getElementById('wChip_' + opt);
  if (chip) chip.classList.toggle('w-opt-chip--on', _wOpts[opt]);
  var panel = document.getElementById('wPanel_' + opt);
  if (panel) panel.style.display = _wOpts[opt] ? '' : 'none';

  // m2 は列表示切替のみ（パネルなし）
  if (opt === 'm2') { wRenderRows(); return; }

  if (_wOpts[opt]) {
    // チップ ON → その欄にフォーカス
    var focusMap = { price:'wPrice', name:'wMemo', kuiku:'wKuiku', paint:'wPaintPrice', rev:'wRevKg' };
    var focusId  = focusMap[opt];
    if (focusId) {
      setTimeout(function() {
        var el = document.getElementById(focusId);
        if (el) el.focus();
      }, 30);
    }
  } else {
    // チップ OFF → 値クリア
    if (opt === 'price') { var pe  = document.getElementById('wPrice');       if (pe)  pe.value  = ''; }
    if (opt === 'name')  { var me  = document.getElementById('wMemo');        if (me)  me.value  = ''; }
    if (opt === 'kuiku') { var ke  = document.getElementById('wKuiku');       if (ke)  ke.value  = ''; }
    if (opt === 'paint') { var ppe = document.getElementById('wPaintPrice');  if (ppe) ppe.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
}

// ── 重量逆算 ──────────────────────────────────────────────────
function wCalcReverse() {
  var kgmEl    = document.getElementById('wKgm');
  var lenEl    = document.getElementById('wLen');
  var qtyEl    = document.getElementById('wQty');
  var revKgEl  = document.getElementById('wRevKg');
  var revQtyEl = document.getElementById('wRevQty');
  var revLenEl = document.getElementById('wRevLen');
  if (!kgmEl || !revKgEl) return;

  var kgm    = parseFloat(kgmEl.value)  || 0;
  var len    = parseFloat(lenEl  ? lenEl.value  : 0) || 0;
  var qty    = parseFloat(qtyEl  ? qtyEl.value  : 1) || 1;
  var target = parseFloat(revKgEl.value) || 0;

  if (kgm <= 0 || target <= 0) {
    if (revQtyEl) revQtyEl.textContent = '—';
    if (revLenEl) revLenEl.textContent = '—';
    return;
  }
  if (len > 0 && revQtyEl) {
    revQtyEl.textContent = Math.ceil(target / (kgm * len / 1000)).toLocaleString() + ' 本';
  }
  if (qty > 0 && revLenEl) {
    revLenEl.textContent = Math.ceil((target / qty) / kgm * 1000).toLocaleString() + ' mm';
  }
}

function wClearReverse() {
  var el = document.getElementById('wRevKg'); if (el) el.value = '';
  var q  = document.getElementById('wRevQty'); if (q) q.textContent = '—';
  var l  = document.getElementById('wRevLen'); if (l) l.textContent = '—';
}

// ── 鋼材選択 ──────────────────────────────────────────────────
function wOnKind() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (!kindEl || !specEl || !STEEL) return;
  var specs = Array.isArray(STEEL[kindEl.value]) ? STEEL[kindEl.value] : [];
  specEl.innerHTML = '';
  specs.forEach(function(item) {
    var opt = document.createElement('option');
    opt.value = item[0];
    opt.textContent = item[0];
    specEl.appendChild(opt);
  });
  wOnSpec();
}

function wOnSpec() {
  var kindEl   = document.getElementById('wKind');
  var specEl   = document.getElementById('wSpec');
  var kgmEl    = document.getElementById('wKgm');
  var kgmValEl = document.getElementById('wKgmVal');
  if (!kindEl || !specEl || !kgmEl || !STEEL) return;
  var list = Array.isArray(STEEL[kindEl.value]) ? STEEL[kindEl.value] : [];
  var hit  = list.find(function(item) { return item[0] === specEl.value; });
  var kgm  = hit ? Number(hit[1]) : 0;
  kgmEl.value = kgm > 0 ? String(kgm) : '';
  if (kgmValEl) kgmValEl.textContent = kgm > 0 ? kgm + ' kg/m' : '';
  wPreview();
}

// ── 塗装面積計算 ───────────────────────────────────────────────
function wGetPaintPerM(kind, specName) {
  var name = String(specName || '').trim().toUpperCase();
  var nums = (name.match(/[\d.]+/g) || []).map(parseFloat);
  if (!nums.length || nums.some(isNaN)) return 0;
  if (name.indexOf('H-')  === 0 && nums.length >= 2) return (2*nums[0] + 4*nums[1]) / 1000;
  if (name.indexOf('C-')  === 0 && nums.length >= 3) return (nums[0] + 4*nums[1] - 2*nums[2]) / 1000;
  if (name.indexOf('I-')  === 0 && nums.length >= 2) return (2*nums[0] + 4*nums[nums.length-1]) / 1000;
  if (name.indexOf('FB-') === 0 && nums.length >= 2) return (2*nums[0] + 2*nums[1]) / 1000;
  if (name.indexOf('RB-') === 0 && nums.length >= 1) return Math.PI * nums[0] / 1000;
  if (name.indexOf('L-')  === 0 && nums.length >= 3) {
    return nums[0] === nums[1]
      ? (4*nums[0] - 2*nums[2]) / 1000
      : (2*nums[0] + 2*nums[1] - 2*nums[2]) / 1000;
  }
  return 0;
}

// ── プレビュー ────────────────────────────────────────────────
function wPreview() {
  var kgmEl = document.getElementById('wKgm');
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  if (!kgmEl || !lenEl || !qtyEl) return;
  // （プレビュー表示：必要に応じて拡張可能）
}

// ── 行追加・編集 ───────────────────────────────────────────────
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

  var kind = kindEl.value;
  var spec = specEl.value;

  var priceEl      = document.getElementById('wPrice');
  var memoEl       = document.getElementById('wMemo');
  var kuikuEl      = document.getElementById('wKuiku');
  var paintPriceEl = document.getElementById('wPaintPrice');
  var price      = (_wOpts.price && priceEl)      ? (parseFloat(priceEl.value)       || 0) : 0;
  var memo       = (_wOpts.name  && memoEl)       ? (memoEl.value   || '')            : '';
  var kuiku      = (_wOpts.kuiku && kuikuEl)      ? (kuikuEl.value  || '')            : '';
  var paintPrice = (_wOpts.paint && paintPriceEl) ? (parseFloat(paintPriceEl.value)  || 0) : 0;

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
  setTimeout(function() { lenEl.focus(); lenEl.select(); }, 0);
}

function wEditRow(idx) {
  var r = _wRows[idx];
  if (!r) return;
  _wEditIdx = idx;

  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (kindEl) { kindEl.value = r.kind; wOnKind(); }
  if (specEl) { specEl.value = r.spec; wOnSpec(); }

  var cmdInput = document.getElementById('wCmdInput');
  var kgmDisp  = document.getElementById('wCmdKgm');
  if (cmdInput) cmdInput.value = r.kind + '　' + r.spec;
  if (kgmDisp)  kgmDisp.textContent = r.kgm ? r.kgm + ' kg/m' : '';

  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  if (lenEl) lenEl.value = r.len;
  if (qtyEl) qtyEl.value = r.qty;

  if (r.price > 0) {
    if (!_wOpts.price) wToggleOpt('price');
    var pe = document.getElementById('wPrice'); if (pe) pe.value = r.price;
  }
  if (r.memo) {
    if (!_wOpts.name) wToggleOpt('name');
    var me = document.getElementById('wMemo'); if (me) me.value = r.memo;
  }
  if (r.kuiku) {
    if (!_wOpts.kuiku) wToggleOpt('kuiku');
    var ke = document.getElementById('wKuiku'); if (ke) ke.value = r.kuiku;
  }
  if (r.paintPrice > 0) {
    if (!_wOpts.paint) wToggleOpt('paint');
    var ppe = document.getElementById('wPaintPrice'); if (ppe) ppe.value = r.paintPrice;
  }

  var addBtn = document.getElementById('wAddBtn');
  if (addBtn) addBtn.innerHTML = '✓ 更新';
  var cancelBtn = document.getElementById('wCancelBtn');
  if (cancelBtn) cancelBtn.style.display = '';

  wRenderRows();
  setTimeout(function() { if (lenEl) { lenEl.focus(); lenEl.select(); } }, 50);
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

// ── レンダリング ───────────────────────────────────────────────
function wRenderRows() {
  var empty       = document.getElementById('wEmpty');
  var tableWrap   = document.getElementById('wTableWrap');
  var tbody       = document.getElementById('wTbody');
  var tfoot       = document.getElementById('wTfoot');
  var cartBtn     = document.getElementById('wCartBtn');
  var mainHd      = document.getElementById('wMainHd');
  var sumBox      = document.getElementById('wSumBox');
  var sumKgEl     = document.getElementById('wSumKg');
  var sumM2El     = document.getElementById('wSumM2');
  var sumAmtRow   = document.getElementById('wSumAmtRow');
  var sumAmtEl    = document.getElementById('wSumAmt');
  var sumPaintRow = document.getElementById('wSumPaintRow');
  var sumPaintEl  = document.getElementById('wSumPaint');
  var thM2        = document.getElementById('wThM2');
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

  // 塗装面積列 thead 表示切替
  if (thM2) thM2.style.display = _wOpts.m2 ? '' : 'none';

  var anyPrice    = _wRows.some(function(r) { return r.amount      !== null; });
  var anyPaintAmt = _wRows.some(function(r) { return r.paintAmount !== null; });
  var sumKg = 0, sumM2v = 0, sumAmt = 0, sumPaint = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg    += r.kgTotal;
    sumM2v   += r.m2Total;
    if (r.amount      !== null) sumAmt   += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;

    var kuikuTag = r.kuiku
      ? ' <span style="display:inline-block;font-size:9px;font-weight:600;padding:1px 5px;border-radius:10px;background:#ede9fe;color:#7c3aed;margin-left:3px">' + _esc(r.kuiku) + '</span>'
      : '';

    var m2Cell = '<td style="' + _tdR + 'color:#0891b2;font-weight:700;' + (_wOpts.m2 ? '' : 'display:none') + '">' + _wFmt(r.m2Total, 2) + '</td>';

    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.price + '円/kg</span></td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    var paintAmtCell = r.paintAmount !== null
      ? '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.paintAmount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.paintPrice + '円/m²</span></td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    var rowBg = (_wEditIdx === i) ? 'background:#fffde7;' : (i % 2 === 1 ? 'background:#fafafa;' : '');

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + rowBg + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i+1) + '</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(r.memo) + (r.kuiku ? '　'+_esc(r.kuiku) : '') + '">' +
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

  if (sumBox) {
    sumBox.style.display = 'block';
    if (sumKgEl)     sumKgEl.textContent       = Math.round(sumKg).toLocaleString() + ' kg';
    if (sumM2El)     sumM2El.textContent       = _wFmt(sumM2v, 2) + ' m²';
    if (sumAmtRow)   sumAmtRow.style.display   = anyPrice    ? 'flex' : 'none';
    if (sumAmtEl)    sumAmtEl.textContent      = _wFmt(sumAmt, 0)   + ' 円';
    if (sumPaintRow) sumPaintRow.style.display = anyPaintAmt ? 'flex' : 'none';
    if (sumPaintEl)  sumPaintEl.textContent    = _wFmt(sumPaint, 0) + ' 円';
  }

  var totalAmtCell = anyPrice
    ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';
  var totalPaintCell = anyPaintAmt
    ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';
  var totalM2Cell = _wOpts.m2
    ? '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:13px">' + _wFmt(sumM2v, 2) + ' m²</td>'
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
    '<td></td><td></td>' +
    '</tr>';
}

// ── 印刷 ──────────────────────────────────────────────────────
function wPrint() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }

  var sumKg = 0, sumAmt = 0, sumPaint = 0;
  var rows = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    if (r.amount      !== null) sumAmt   += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;
    var memoStr = r.memo ? _esc(r.memo) : '—';
    if (r.kuiku) memoStr += '　<span style="font-size:9px;background:#ede9fe;color:#7c3aed;padding:1px 5px;border-radius:8px">' + _esc(r.kuiku) + '</span>';
    return '<tr>' +
      '<td style="text-align:center">' + (i+1) + '</td>' +
      '<td>' + memoStr + '</td>' +
      '<td>' + _esc(r.kind) + '</td>' +
      '<td>' + _esc(r.spec) + '</td>' +
      '<td style="text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="text-align:right">' + r.qty + '</td>' +
      '<td style="text-align:right;font-weight:700">' + _wFmt(r.kgTotal, 0) + '</td>' +
      (r.amount      !== null ? '<td style="text-align:right">' + _wFmt(r.amount, 0)      + '<br><small>@' + r.price      + '円/kg</small></td>' : '<td style="text-align:center;color:#ccc">—</td>') +
      (r.paintAmount !== null ? '<td style="text-align:right">' + _wFmt(r.paintAmount, 0) + '<br><small>@' + r.paintPrice + '円/m²</small></td>' : '<td style="text-align:center;color:#ccc">—</td>') +
      '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>重量リスト</title>' +
    '<style>*{box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:16px}' +
    'h2{font-size:13px;margin-bottom:8px}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{border:1px solid #ddd;padding:5px 8px}' +
    'th{background:#f4f4fa;font-size:10px;font-weight:600}' +
    'tfoot td{font-weight:700;background:#f8f8fc}' +
    'small{color:#aaa}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h2>重量リスト</h2>' +
    '<table><thead><tr>' +
    '<th>#</th><th>部材名</th><th>種類</th><th>規格</th>' +
    '<th>長さ(mm)</th><th>本数</th><th>合計重量(kg)</th>' +
    '<th>概算金額(円)</th><th>塗装金額(円)</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr>' +
    '<td colspan="6" style="text-align:right">合　計</td>' +
    '<td style="text-align:right">' + _wFmt(sumKg, 0) + ' kg</td>' +
    '<td style="text-align:right">' + (sumAmt   > 0 ? _wFmt(sumAmt,   0) + ' 円' : '—') + '</td>' +
    '<td style="text-align:right">' + (sumPaint > 0 ? _wFmt(sumPaint, 0) + ' 円' : '—') + '</td>' +
    '</tr></tfoot>' +
    '</table></body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}

// ── コマンドパレット ──────────────────────────────────────────
function wCmdBuildAll() {
  _wCmdAll = [];
  if (typeof STEEL !== 'object' || !STEEL) return;
  Object.keys(STEEL).forEach(function(kind) {
    (STEEL[kind] || []).forEach(function(row) {
      _wCmdAll.push({ kind: kind, spec: row[0], kgm: row[1], label: kind + ' ' + row[0] });
    });
  });
}

function wCmdOpenBrowse() {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd) return;
  var html = '';
  Object.keys(STEEL).forEach(function(kind) {
    html += '<div class="cmd-cat" style="cursor:pointer;color:#1a1a2e;font-size:11px" ' +
            'onmousedown="event.preventDefault();wCmdShowKind(\'' + kind + '\')">' +
            kind + ' <span style="color:#bbb;font-size:10px">▶</span></div>';
  });
  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

function wCmdShowKind(kind) {
  var dd   = document.getElementById('wCmdDropdown');
  var list = STEEL[kind] || [];
  if (!dd) return;
  var html = '<div class="cmd-cat" style="cursor:pointer;color:#aaa;display:flex;align-items:center;gap:4px" ' +
             'onmousedown="event.preventDefault();wCmdOpenBrowse()">◀ 戻る　<strong style="color:#5a5a78">' + kind + '</strong></div>';
  list.forEach(function(row) {
    var it = { kind: kind, spec: row[0], kgm: row[1] };
    html += '<div class="cmd-item" onmousedown="event.preventDefault();wCmdSelect(' + JSON.stringify(it) + ')">' +
            '<span>' + row[0] + '</span>' +
            '<span style="color:#aaa;font-size:10px">' + row[1] + ' kg/m</span>' +
            '</div>';
  });
  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
}

function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd    = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var q = input.value.trim().toLowerCase();
  if (!q) { dd.style.display = 'none'; return; }

  var filtered = _wCmdAll.filter(function(it) {
    return it.label.toLowerCase().indexOf(q) >= 0 ||
           it.spec.toLowerCase().indexOf(q)  >= 0 ||
           it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
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
      html += '<div class="cmd-item" onmousedown="event.preventDefault();wCmdSelect(' + JSON.stringify(it) + ')">' +
              '<span>' + it.spec + '</span>' +
              '<span style="color:#aaa;font-size:10px">' + it.kgm + ' kg/m</span>' +
              '</div>';
    });
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

function wCmdSelect(it) {
  var kindEl  = document.getElementById('wKind');
  var specEl  = document.getElementById('wSpec');
  var kgmDisp = document.getElementById('wCmdKgm');
  var input   = document.getElementById('wCmdInput');
  var dd      = document.getElementById('wCmdDropdown');
  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl) { specEl.value = it.spec; wOnSpec(); }
  if (input)   input.value            = it.kind + '　' + it.spec;
  if (kgmDisp) kgmDisp.textContent   = it.kgm + ' kg/m';
  if (dd)      dd.style.display       = 'none';
  _wCmdIdx = -1;
  document.removeEventListener('click', wCmdOutside);
}

function wCmdOutside(e) {
  var wrap = document.getElementById('wCmdWrap');
  if (wrap && !wrap.contains(e.target)) {
    var dd = document.getElementById('wCmdDropdown');
    if (dd) dd.style.display = 'none';
    document.removeEventListener('click', wCmdOutside);
  }
}

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

## 変更B: index.html — チップブロック置換

**変更前：**
```html
      <!-- オプションチップ -->
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
      <!-- オプションチップ -->
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

## 変更C: index.html — 追加ボタンに id・キャンセルボタン追加

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

## 変更D: index.html — thead の塗装面積列 id 追加・最終列を2列に分割

**変更前：**
```html
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#6d28d9;font-weight:700">合計重量(kg)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;font-weight:700">塗装合計(m2)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
              <th style="padding:8px 6px;width:28px"></th>
```

**変更後：**
```html
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#6d28d9;font-weight:700">合計重量(kg)</th>
              <th id="wThM2" style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2;font-weight:700;display:none">塗装面積(m²)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#16a34a">概算金額(円)</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:#0891b2">塗装金額(円)</th>
              <th style="padding:8px 6px;width:24px"></th>
              <th style="padding:8px 6px;width:24px"></th>
```

変更点：
- `塗装合計(m2)` 列に `id="wThM2"` を付与し `display:none`（初期非表示）
- 列ヘッダ名を `塗装面積(m²)` に変更
- 末尾の空白 `<th>` を 24px × 2列に分割（✎ 列 + ✕ 列）

---

## 注意事項

- `weight.js` は**ファイル全体を完全に置換**する（既存内容を残さない）
- `index.html` の `id="wSumPaintRow"` は既に存在するため変更不要
- `id="wKind"`, `id="wSpec"`, `id="wKgm"` の非表示 select は index.html に既存のため変更不要
- 他ページ（計算・データ・履歴・在庫）は一切変更しない
