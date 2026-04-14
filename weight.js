// weight.js - weight simulator
// Depends on STEEL global defined in calc.js / main.js

// ── グローバル変数 ─────────────────────────────────────────────
var _wInited    = false;
var _wRows      = [];
var _wUndoStack = [];
var _wRedoStack = [];
var _wOpts      = { price: false, name: false, rev: false, paint: false, m2: false, co2: false };
var _wEditIdx   = -1;
var _wCartAdded = false;
var _wSavedCalcs = (function() {
  try { return JSON.parse(localStorage.getItem('wSavedCalcs') || '[]'); }
  catch (e) { return []; }
})();
var _wJobName = (function() {
  try { return localStorage.getItem('wJobName') || ''; }
  catch (e) { return ''; }
})();
var _wJobClient = (function() {
  try { return localStorage.getItem('wJobClient') || ''; }
  catch (e) { return ''; }
})();

// コマンドパレット
var _wCmdAll = [];
var _wCmdIdx = -1;

// ── スタイル定数 ───────────────────────────────────────────────
var _tdL = 'padding:8px 10px;text-align:left;white-space:nowrap;';
var _tdR = 'padding:8px 10px;text-align:right;white-space:nowrap;font-family:monospace;';

// ── ヘルパー ──────────────────────────────────────────────────
function _wSpecName(row) { return row[0]; }
function _wSpecKgm(row)  { return row[1]; }

/**
 * JIS Z 8401 偶数丸め
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
function jisRound(value, decimals) {
  var factor = Math.pow(10, decimals);
  var shifted = value * factor;
  var floor = Math.floor(shifted);
  var diff = shifted - floor;
  if (Math.abs(diff - 0.5) < 1e-10) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

/**
 * 重量 kg を JIS丸めで有効数字3桁（1t以上は整数）に丸める
 * @param {number} kg
 * @returns {number}
 */
function jisRoundKg(kg) {
  if (kg <= 0) return 0;
  return jisRound(kg, 0);
}

function _wFmt(v, dec) {
  var rounded = jisRound(v, dec);
  return rounded.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function _wFmtKg(kg) {
  var rounded = jisRoundKg(kg);
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
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

  // 作業情報入力欄に保存値を反映
  var wci = document.getElementById('wJobClient');
  if (wci) wci.value = _wJobClient;
  var wni = document.getElementById('wJobNameInput');
  if (wni) wni.value = _wJobName;
}

// ── Enter フロー ──────────────────────────────────────────────
function wNextOptOrAdd(from) {
  var order    = ['price', 'name'];
  var fieldMap = { price: 'wPrice', name: 'wMemo' };
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

  // Shift+Enter: 計算結果をリストに追加してから検索欄へ戻る
  function shiftEnterToCmd(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // まず行を追加（計算結果をリストに表示）
      if (typeof wAddRow === 'function') wAddRow();
      // 鋼材規格検索欄へフォーカス
      var cmdInput = document.getElementById('wCmdInput');
      if (cmdInput) {
        cmdInput.focus();
        setTimeout(function() { cmdInput.select(); }, 50);
      }
    }
  }

  if (lenEl) {
    lenEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
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
      if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        wNextOptOrAdd('qty');
      }
    });
    qtyEl.addEventListener('input', wPreview);
    qtyEl.addEventListener('focus', function() { this.select(); });
  }

  [['wPrice','price'], ['wMemo','name']].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    var optKey = pair[1];
    if (el) {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
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
    var focusMap = { price:'wPrice', name:'wMemo', paint:'wPaintPrice', rev:'wRevKg' };
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
  _wCartAdded = false;
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
  var paintPriceEl = document.getElementById('wPaintPrice');
  var price      = (_wOpts.price && priceEl)      ? (parseFloat(priceEl.value)       || 0) : 0;
  var memo       = (_wOpts.name  && memoEl)       ? (memoEl.value   || '')            : '';
  var paintPrice = (_wOpts.paint && paintPriceEl) ? (parseFloat(paintPriceEl.value)  || 0) : 0;

  var kg1  = jisRound(kgm * len / 1000, 1);  // JIS: 1本ずつ小数第1位で丸めてから合計
  var kg   = kg1 * qty;
  var ppm  = wGetPaintPerM(kind, spec);
  var m2_1 = ppm * len / 1000;
  var m2   = m2_1 * qty;

  wPushUndo();

  var rowData = {
    kind: kind, spec: spec, memo: memo,
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
  _wCartAdded = false;
  wPushUndo();
  _wRows.splice(idx, 1);
  wRenderRows();
}

function wClearAll() {
  if (_wRows.length === 0) return;
  if (!confirm('リストをすべてクリアしますか？')) return;
  _wCartAdded = false;
  wPushUndo();
  _wRows = [];
  wRenderRows();
}

// ── レンダリング ───────────────────────────────────────────────
function wRenderRows() {
  var CO2_FACTOR = 2.1; // kg-CO2 per kg
  var empty       = document.getElementById('wEmpty');
  var tableWrap   = document.getElementById('wTableWrap');
  var tbody       = document.getElementById('wTbody');
  var tfoot       = document.getElementById('wTfoot');
  var cartBtn     = document.getElementById('wCartBtn');
  var mainHd      = document.getElementById('wMainHd');
  var thM2        = document.getElementById('wThM2');
  var thCo2       = document.getElementById('wThCo2');
  var thName      = document.getElementById('wThName');
  var thAmt       = document.getElementById('wThAmt');
  var thPaint     = document.getElementById('wThPaint');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  // 行が変わったときにボタンをリセット
  if (cartBtn && !_wCartAdded) {
    cartBtn.textContent = '＋ カートへ';
    cartBtn.classList.remove('added');
    cartBtn.disabled = false;
  }

  if (_wRows.length === 0) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    if (cartBtn) cartBtn.style.display = 'none';
    if (mainHd)  mainHd.style.display  = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  if (cartBtn) cartBtn.style.display = '';
  if (mainHd)  mainHd.style.display  = 'flex';

  if (thM2)    thM2.style.display    = _wOpts.m2 ? '' : 'none';
  if (thCo2)   thCo2.style.display   = _wOpts.co2 ? '' : 'none';
  if (thName)  thName.style.display  = _wOpts.name ? '' : 'none';
  if (thAmt)   thAmt.style.display   = _wOpts.price ? '' : 'none';
  if (thPaint) thPaint.style.display = _wOpts.paint ? '' : 'none';

  var anyPrice    = _wRows.some(function(r) { return r.amount !== null; });
  var anyPaintAmt = _wRows.some(function(r) { return r.paintAmount !== null; });
  var sumKg = 0;
  var sumCo2 = 0;
  var sumM2v = 0;
  var sumAmt = 0;
  var sumPaint = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    sumM2v += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;

    var memoTitle = _esc(r.memo || '');
    var m2Cell = '<td style="' + _tdR + 'color:#111111;font-weight:700;' + (_wOpts.m2 ? '' : 'display:none;') + '">' + _wFmt(r.m2Total, 2) + '</td>';
    var co2Disp = _wOpts.co2 ? '' : 'display:none;';
    var co2Cell = '<td style="' + _tdR + co2Disp + 'color:#2d6a2d;font-weight:700">' +
      (r.kgTotal * CO2_FACTOR).toFixed(1) + '</td>';
    var amtDisp = _wOpts.price ? '' : 'display:none;';
    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + amtDisp + 'color:#111111;font-weight:700">' + _wFmt(r.amount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.price + '円/kg</span></td>'
      : '<td style="' + _tdR + amtDisp + 'color:#ccc">—</td>';
    var paintDisp = _wOpts.paint ? '' : 'display:none;';
    var paintAmtCell = r.paintAmount !== null
      ? '<td style="' + _tdR + paintDisp + 'color:#111111;font-weight:700">' + _wFmt(r.paintAmount, 0) +
        '<br><span style="font-size:9px;color:#aaa;font-weight:400">@' + r.paintPrice + '円/m²</span></td>'
      : '<td style="' + _tdR + paintDisp + 'color:#ccc">—</td>';
    var rowBg = (_wEditIdx === i) ? 'background:#fffde7;' : (i % 2 === 1 ? 'background:#fafafa;' : '');

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + rowBg + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
        (_wOpts.name ? '' : 'display:none') + '" title="' + memoTitle + '">' +
        _esc(r.memo || '—') +
      '</td>' +
      '<td style="' + _tdL + '">' + _esc(r.kind) + '</td>' +
      '<td style="' + _tdL + 'font-weight:600">' + _esc(r.spec) + '</td>' +
      '<td style="' + _tdR + '">' + r.len.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + r.qty.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + _wFmtKg(r.kg1) + '</td>' +
      '<td style="' + _tdR + 'color:#111111;font-weight:700">' + _wFmtKg(r.kgTotal) + '</td>' +
      co2Cell +
      m2Cell +
      amtCell +
      paintAmtCell +
      '<td style="padding:4px 2px;text-align:center">' +
        '<button onclick="wEditRow(' + i + ')" ' +
          'class="w-edit-btn" title="編集">✎</button>' +
      '</td>' +
      '<td style="padding:4px 2px;text-align:center">' +
        '<button onclick="wDeleteRow(' + i + ')" ' +
          'class="w-del-btn" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  var totalAmtCell = _wOpts.price
    ? (anyPrice
        ? '<td style="' + _tdR + 'color:#111111;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
        : '<td style="' + _tdR + 'color:#ccc">—</td>')
    : '';
  var totalPaintCell = _wOpts.paint
    ? (anyPaintAmt
        ? '<td style="' + _tdR + 'color:#111111;font-weight:800;font-size:13px">' + _wFmt(sumPaint, 0) + '</td>'
        : '<td style="' + _tdR + 'color:#ccc">—</td>')
    : '';
  var totalCo2Cell = _wOpts.co2
    ? '<td style="' + _tdR + 'color:#2d6a2d;font-weight:800;font-size:13px">' + sumCo2.toFixed(1) + ' kg-CO2</td>'
    : '';
  var totalM2Cell = _wOpts.m2
    ? '<td style="' + _tdR + 'color:#111111;font-weight:800;font-size:13px">' + _wFmt(sumM2v, 2) + ' m²</td>'
    : '';
  var nameCols = _wOpts.name ? 1 : 0;

  tfoot.innerHTML =
    '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
    '<td colspan="' + (5 + nameCols) + '" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
    '<td style="' + _tdR + 'color:#111111;font-weight:800;font-size:14px">' + _wFmtKg(sumKg) + ' kg</td>' +
    totalCo2Cell +
    totalM2Cell +
    totalAmtCell +
    totalPaintCell +
    '<td></td><td></td>' +
    '</tr>';
}

// ── 印刷 ──────────────────────────────────────────────────────
function wSaveCalc() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  var defaultName = (function() {
    var specs = [];
    _wRows.forEach(function(r) { if (specs.indexOf(r.spec) < 0) specs.push(r.spec); });
    var d = new Date();
    return specs.slice(0, 2).join('/') + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
  })();
  var name = prompt('保存名を入力してください', defaultName);
  if (!name) return;
  var rec = {
    id: 'wc_' + Date.now(),
    name: name,
    savedAt: new Date().toISOString(),
    rows: JSON.parse(JSON.stringify(_wRows)),
    opts: JSON.parse(JSON.stringify(_wOpts)),
    jobName: _wJobName,
    jobClient: _wJobClient
  };
  _wSavedCalcs.unshift(rec);
  if (_wSavedCalcs.length > 20) _wSavedCalcs.pop();
  try { localStorage.setItem('wSavedCalcs', JSON.stringify(_wSavedCalcs)); } catch (e) {}
  if (typeof sbUpsert === 'function') sbUpsert('weight_calcs', _wSavedCalcs);
  renderWSavedList();
  alert('「' + name + '」を保存しました。');
}

// ── 作業情報（重量タブ独立） ──────────────────────────
function wSaveJobInfo() {
  var clientEl = document.getElementById('wJobClient');
  var nameEl   = document.getElementById('wJobNameInput');
  _wJobClient = clientEl ? clientEl.value : _wJobClient;
  _wJobName   = nameEl   ? nameEl.value   : _wJobName;
  try {
    localStorage.setItem('wJobClient', _wJobClient);
    localStorage.setItem('wJobName',   _wJobName);
  } catch (e) {}
}

function wGetJobForHistory() {
  return {
    client: _wJobClient || '',
    name:   _wJobName   || ''
  };
}

function wLoadCalc(id) {
  var rec = _wSavedCalcs.find(function(r) { return r.id === id; });
  if (!rec) return;
  if (!confirm('「' + rec.name + '」を読み込みます。現在のリストは置き換えられます。')) return;
  _wRows = JSON.parse(JSON.stringify(rec.rows));
  _wJobName = (rec.jobName || '').trim();
  _wJobClient = (rec.jobClient || '').trim();
  try {
    localStorage.setItem('wJobName',   _wJobName);
    localStorage.setItem('wJobClient', _wJobClient);
  } catch (e) {}
  Object.keys(rec.opts || {}).forEach(function(key) {
    if (_wOpts[key] !== rec.opts[key]) wToggleOpt(key);
  });
  _wCartAdded = false;
  var wci = document.getElementById('wJobClient');
  if (wci) wci.value = _wJobClient;
  var wni = document.getElementById('wJobNameInput');
  if (wni) wni.value = _wJobName;
  wRenderRows();
}

function wRecallFromHistory(rows, opts, job) {
  if (!rows || !rows.length) return;
  _wRows = JSON.parse(JSON.stringify(rows));
  var defaultOpts = { price: false, name: false, rev: false, paint: false, m2: false, co2: false };
  opts = opts || {};
  Object.keys(defaultOpts).forEach(function(key) {
    if (_wOpts[key] !== !!opts[key]) wToggleOpt(key);
  });
  if (job && job.client) {
    _wJobClient = job.client;
    try { localStorage.setItem('wJobClient', _wJobClient); } catch (e) {}
  }
  if (job && job.name) {
    _wJobName = job.name;
    try { localStorage.setItem('wJobName', _wJobName); } catch (e) {}
  }
  _wCartAdded = false;
  wRenderRows();
}

function wDeleteSavedCalc(id) {
  _wSavedCalcs = _wSavedCalcs.filter(function(r) { return r.id !== id; });
  try { localStorage.setItem('wSavedCalcs', JSON.stringify(_wSavedCalcs)); } catch (e) {}
  if (typeof sbUpsert === 'function') sbUpsert('weight_calcs', _wSavedCalcs);
  renderWSavedList();
}

function renderWSavedList() {
  var cont = document.getElementById('wSavedList');
  if (!cont) return;
  if (_wSavedCalcs.length === 0) {
    cont.innerHTML = '<div style="font-size:11px;color:var(--ink3);padding:4px 0">保存済みなし</div>';
    return;
  }
  cont.innerHTML = _wSavedCalcs.map(function(rec) {
    var d = new Date(rec.savedAt);
    var dateStr = (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
                  ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return '<div class="w-saved-item">' +
      '<div class="w-saved-info" onclick="wLoadCalc(\'' + rec.id + '\')" title="クリックで読み込み">' +
        '<div class="w-saved-name">' + _esc(rec.name) + '</div>' +
        '<div class="w-saved-date">' + dateStr + '　' + rec.rows.length + '行</div>' +
      '</div>' +
      '<button class="w-saved-del" onclick="wDeleteSavedCalc(\'' + rec.id + '\')" title="削除">✕</button>' +
    '</div>';
  }).join('');
}

function wPrint() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }

  var CO2_FACTOR = 2.1;
  var sumKg = 0, sumAmt = 0, sumPaint = 0, sumCo2 = 0;
  var rows = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    if (r.amount      !== null) sumAmt   += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;
    var memoStr = r.memo ? _esc(r.memo) : '—';
    return '<tr>' +
      '<td style="text-align:center">' + (i+1) + '</td>' +
      '<td>' + memoStr + '</td>' +
      '<td>' + _esc(r.kind) + '</td>' +
      '<td>' + _esc(r.spec) + '</td>' +
      '<td style="text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="text-align:right">' + r.qty + '</td>' +
      '<td style="text-align:right;font-weight:700">' + _wFmtKg(r.kgTotal) + '</td>' +
      (_wOpts.co2 ? '<td style="text-align:right" class="co2">' + (r.kgTotal * CO2_FACTOR).toFixed(1) + ' kg-CO₂</td>' : '') +
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
    '<td style="text-align:right">' + _wFmtKg(sumKg) + ' kg</td>' +
    '<td style="text-align:right">' + (sumAmt   > 0 ? _wFmt(sumAmt,   0) + ' 円' : '—') + '</td>' +
    '<td style="text-align:right">' + (sumPaint > 0 ? _wFmt(sumPaint, 0) + ' 円' : '—') + '</td>' +
    '</tr></tfoot>' +
    '</table></body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}

function wAddToCart() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  var btn = document.getElementById('wCartBtn');
  var sumKg = 0, sumAmt = 0, sumM2 = 0, anyPrice = false;
  _wRows.forEach(function(r) {
    sumKg += r.kgTotal;
    sumM2 += (r.m2Total || 0);
    if (r.amount !== null) { sumAmt += r.amount; anyPrice = true; }
  });

  var specs = [];
  _wRows.forEach(function(r) {
    if (specs.indexOf(r.spec) === -1) specs.push(r.spec);
  });
  var title = specs.slice(0, 2).join(' / ') + (specs.length > 2 ? ' 他' : '') +
              '（' + _wRows.length + '行）';

  var data = {
    isWeight: true,
    title: title,
    job: wGetJobForHistory(),
    rows: _wRows.slice(),
    sumKg: sumKg,
    sumM2: sumM2,
    sumAmt: sumAmt,
    anyPrice: anyPrice
  };

  if (typeof addToCart === 'function') addToCart('weight_' + Date.now(), data);
  if (typeof saveWeightHistory === 'function') {
    saveWeightHistory(
      JSON.parse(JSON.stringify(_wRows)),
      JSON.parse(JSON.stringify(_wOpts)),
      wGetJobForHistory()
    );
  }
  if (typeof updateCartBadge === 'function') updateCartBadge();
  _wCartAdded = true;
  if (btn) {
    btn.textContent = '✓ 追加済み';
    btn.classList.add('added');
    btn.disabled = true;
  }
}

// ── コマンドパレット ──────────────────────────────────────────
function wPrint() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }

  var CO2_FACTOR = 2.1;
  var sumKg = 0, sumAmt = 0, sumPaint = 0, sumCo2 = 0;
  var rows = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    if (r.amount !== null) sumAmt += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;
    var memoStr = r.memo ? _esc(r.memo) : '—';
    return '<tr>' +
      '<td style="text-align:center">' + (i + 1) + '</td>' +
      '<td>' + memoStr + '</td>' +
      '<td>' + _esc(r.kind) + '</td>' +
      '<td>' + _esc(r.spec) + '</td>' +
      '<td style="text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="text-align:right">' + r.qty + '</td>' +
      '<td style="text-align:right;font-weight:700">' + _wFmtKg(r.kgTotal) + '</td>' +
      (_wOpts.co2 ? '<td style="text-align:right" class="co2">' + (r.kgTotal * CO2_FACTOR).toFixed(1) + ' kg-CO₂</td>' : '') +
      (r.amount !== null ? '<td style="text-align:right">' + _wFmt(r.amount, 0) + '<br><small>@' + r.price + '円/kg</small></td>' : '<td style="text-align:center;color:#ccc">—</td>') +
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
    '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr>' +
    '<td colspan="6" style="text-align:right">合　計</td>' +
    '<td style="text-align:right">' + _wFmtKg(sumKg) + ' kg</td>' +
    '<td style="text-align:right">' + (sumAmt > 0 ? _wFmt(sumAmt, 0) + ' 円' : '—') + '</td>' +
    '<td style="text-align:right">' + (sumPaint > 0 ? _wFmt(sumPaint, 0) + ' 円' : '—') + '</td>' +
    '</tr></tfoot></table></body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}

function wPrint() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  if (typeof saveWeightHistory === 'function') {
    saveWeightHistory(
      JSON.parse(JSON.stringify(_wRows)),
      JSON.parse(JSON.stringify(_wOpts)),
      wGetJobForHistory()
    );
  }

  var CO2_FACTOR = 2.1;
  var sumKg = 0, sumAmt = 0, sumPaint = 0, sumCo2 = 0;
  var rows = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    if (r.amount !== null) sumAmt += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;
    var memoStr = r.memo ? _esc(r.memo) : '—';
    return '<tr>' +
      '<td style="text-align:center">' + (i + 1) + '</td>' +
      '<td>' + memoStr + '</td>' +
      '<td>' + _esc(r.kind) + '</td>' +
      '<td>' + _esc(r.spec) + '</td>' +
      '<td style="text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="text-align:right">' + r.qty + '</td>' +
      '<td style="text-align:right;font-weight:700">' + _wFmtKg(r.kgTotal) + '</td>' +
      (_wOpts.co2 ? '<td style="text-align:right" class="co2">' + (r.kgTotal * CO2_FACTOR).toFixed(1) + ' kg-CO₂</td>' : '') +
      (r.amount !== null ? '<td style="text-align:right">' + _wFmt(r.amount, 0) + '<br><small>@' + r.price + '円/kg</small></td>' : '<td style="text-align:center;color:#ccc">—</td>') +
      (r.paintAmount !== null ? '<td style="text-align:right">' + _wFmt(r.paintAmount, 0) + '<br><small>@' + r.paintPrice + '円/m²</small></td>' : '<td style="text-align:center;color:#ccc">—</td>') +
      '</tr>';
  }).join('');

  var jobHeader = '';
  if (_wJobClient || _wJobName) {
    jobHeader = '<p style="margin:0 0 6px;font-size:11px;color:#555">' +
      (_wJobClient ? '顧客名: ' + _esc(_wJobClient) + '　' : '') +
      (_wJobName   ? '工事名: ' + _esc(_wJobName)   : '') +
      '</p>';
  }

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>重量リスト</title>' +
    '<style>*{box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:16px}' +
    'h2{font-size:13px;margin-bottom:4px}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{border:1px solid #ddd;padding:5px 8px}' +
    'th{background:#f4f4fa;font-size:10px;font-weight:600}' +
    'tfoot td{font-weight:700;background:#f8f8fc}' +
    'small{color:#aaa}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h2>重量リスト</h2>' + jobHeader +
    '<table><thead><tr>' +
    '<th>#</th><th>部材名</th><th>種類</th><th>規格</th>' +
    '<th>長さ(mm)</th><th>本数</th><th>合計重量(kg)</th>' +
    (_wOpts.co2 ? '<th>CO₂(kg-CO₂)</th>' : '') +
    '<th>概算金額(円)</th><th>塗装金額(円)</th>' +
    '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr>' +
    '<td colspan="6" style="text-align:right">合　計</td>' +
    '<td style="text-align:right">' + _wFmtKg(sumKg) + ' kg</td>' +
    (_wOpts.co2 ? '<td style="text-align:right">' + sumCo2.toFixed(1) + ' kg-CO₂</td>' : '') +
    '<td style="text-align:right">' + (sumAmt > 0 ? _wFmt(sumAmt, 0) + ' 円' : '—') + '</td>' +
    '<td style="text-align:right">' + (sumPaint > 0 ? _wFmt(sumPaint, 0) + ' 円' : '—') + '</td>' +
    '</tr></tfoot></table></body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}
function wCmdBuildAll() {
  _wCmdAll = [];
  if (typeof STEEL !== 'object' || !STEEL) return;
  Object.keys(STEEL).forEach(function(kind) {
    (STEEL[kind] || []).forEach(function(row) {
      _wCmdAll.push({ kind: kind, spec: row[0], kgm: row[1], label: kind + ' ' + row[0] });
    });
  });
}

function wCmdHover(el) {
  var dd = document.getElementById('wCmdDropdown');
  if (dd) dd.querySelectorAll('.cmd-item').forEach(function(e) { e.classList.remove('cmd-focus'); });
  if (el) el.classList.add('cmd-focus');
}

function wCmdActivate(el) {
  if (!el) return;
  el.focus();
  if (typeof el.select === 'function') el.select();
  if (el.value && el.value.trim()) {
    wCmdFilter();
  } else {
    wCmdOpenBrowse();
  }
}

function wCmdOpenBrowse() {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd) return;
  var html = '';
  Object.keys(STEEL).forEach(function(kind) {
    html += '<div class="cmd-item cmd-cat-link" onmouseover="wCmdHover(this)" ' +
            'onmousedown="event.preventDefault();wCmdShowKind(\'' + kind + '\')">' +
            '<span>' + kind + '</span><span class="cmd-sub">▶</span></div>';
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
    html += '<div class="cmd-item" data-item=' + _escAttr(JSON.stringify(it)) + ' onmouseover="wCmdHover(this)" onmousedown="event.preventDefault();wCmdSelect(JSON.parse(this.getAttribute(\'data-item\')))">' +
            '<span>' + row[0] + '</span>' +
            '<span style="color:#aaa;font-size:10px">' + row[1] + ' kg/m</span>' +
            '</div>';
  });
  dd.innerHTML = html;
  dd.style.display = 'block';
  _wCmdIdx = -1;
}

var W_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] },
  { prefix: 'p',  kinds: ['角パイプ', 'スモール角パイプ'] },
  { prefix: '[',  kinds: ['軽量溝形鋼'] },
  { prefix: 'c',  kinds: ['C形鋼'] }
];

function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd    = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var q = input.value.trim().toLowerCase();
  if (!q) { dd.style.display = 'none'; return; }
  var kindFilter = null;
  for (var pi = 0; pi < W_PREFIX_MAP.length; pi++) {
    var pm = W_PREFIX_MAP[pi];
    if (q.indexOf(pm.prefix) === 0) { kindFilter = pm.kinds; break; }
  }
  var filtered;
  if (kindFilter) {
    filtered = _wCmdAll.filter(function(it) {
      if (kindFilter.indexOf(it.kind) < 0) return false;
      return it.spec.toLowerCase().indexOf(q) >= 0 ||
             it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
    });
  } else {
    filtered = _wCmdAll.filter(function(it) {
      return it.label.toLowerCase().indexOf(q) >= 0 ||
             it.spec.toLowerCase().indexOf(q)  >= 0 ||
             it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
    });
  }
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
      html += '<div class="cmd-item" data-item=' + _escAttr(JSON.stringify(it)) + ' onmouseover="wCmdHover(this)" onmousedown="event.preventDefault();wCmdSelect(JSON.parse(this.getAttribute(\'data-item\')))">' +
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
  var kindEl   = document.getElementById('wKind');
  var specEl   = document.getElementById('wSpec');
  var kgmEl    = document.getElementById('wKgm');
  var kgmDisp  = document.getElementById('wCmdKgm');
  var kgmValEl = document.getElementById('wKgmVal');
  var input    = document.getElementById('wCmdInput');
  var dd       = document.getElementById('wCmdDropdown');
  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl)   specEl.value        = it.spec;
  if (kgmEl)    kgmEl.value         = String(it.kgm);
  if (kgmValEl) kgmValEl.textContent = it.kgm + ' kg/m';
  if (input)    input.value         = it.kind + '　' + it.spec;
  if (kgmDisp)  kgmDisp.textContent = it.kgm + ' kg/m';
  if (dd)       dd.style.display    = 'none';
  _wCmdIdx = -1;
  document.removeEventListener('click', wCmdOutside);
  setTimeout(function() {
    var lenEl = document.getElementById('wLen');
    if (lenEl) { lenEl.focus(); lenEl.select(); }
  }, 0);
  wPreview();
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
  } else if (e.key === 'Enter') {
    e.preventDefault();
    var target = _wCmdIdx >= 0 ? items[_wCmdIdx] : (items.length === 1 ? items[0] : null);
    if (target) { target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }
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
