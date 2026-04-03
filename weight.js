// weight.js - weight simulator
// Depends on calc.js being loaded first and defining the global STEEL object.

var _wInited = false;
var _wRows = [];

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
}

function wSetupEnter() {
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  var priceEl = document.getElementById('wPrice');

  if (lenEl) {
    lenEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        qtyEl.focus();
        qtyEl.select();
      }
    });
  }

  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var priceOn = document.getElementById('wPriceOn');
        if (priceOn && priceOn.checked) {
          priceEl.focus();
          priceEl.select();
        } else {
          wAddRow();
        }
      }
    });
  }

  if (priceEl) {
    priceEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        wAddRow();
      }
    });
  }

  ['wLen', 'wQty', 'wPrice'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', wPreview);
  });
}

function wTogglePrice() {
  var cb = document.getElementById('wPriceOn');
  var priceEl = document.getElementById('wPrice');
  if (!cb || !priceEl) return;
  priceEl.disabled = !cb.checked;
  priceEl.style.opacity = cb.checked ? '1' : '.4';
  if (!cb.checked) priceEl.value = '';
  wPreview();
}

function wOnKind() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (!kindEl || !specEl || !STEEL) return;

  var kind = kindEl.value;
  var specs = Array.isArray(STEEL[kind]) ? STEEL[kind] : [];
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
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  var kgmEl = document.getElementById('wKgm');
  var kgmValEl = document.getElementById('wKgmVal');
  if (!kindEl || !specEl || !kgmEl || !STEEL) return;

  var kind = kindEl.value;
  var specName = specEl.value;
  var list = Array.isArray(STEEL[kind]) ? STEEL[kind] : [];
  var hit = list.find(function(item) { return item[0] === specName; });
  var kgm = hit ? Number(hit[1]) : 0;

  kgmEl.value = kgm > 0 ? String(kgm) : '';
  if (kgmValEl) kgmValEl.textContent = kgm > 0 ? kgm + ' kg/m' : '';
  wPreview();
}

function wGetPaintPerM(kind, specName) {
  var name = String(specName || '').trim().toUpperCase();
  var nums = (name.match(/[\d.]+/g) || []).map(parseFloat);
  if (!nums.length || nums.some(isNaN)) return 0;

  if (name.indexOf('H-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 4 * nums[1]) / 1000;
  }
  if (name.indexOf('C-') === 0 && nums.length >= 3) {
    return (nums[0] + 4 * nums[1] - 2 * nums[2]) / 1000;
  }
  if (name.indexOf('I-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 4 * nums[nums.length - 1]) / 1000;
  }
  if (name.indexOf('FB-') === 0 && nums.length >= 2) {
    return (2 * nums[0] + 2 * nums[1]) / 1000;
  }
  if (name.indexOf('RB-') === 0 && nums.length >= 1) {
    return Math.PI * nums[0] / 1000;
  }
  if (name.indexOf('L-') === 0 && nums.length >= 3) {
    if (nums[0] === nums[1]) {
      return (4 * nums[0] - 2 * nums[2]) / 1000;
    }
    return (2 * nums[0] + 2 * nums[1] - 2 * nums[2]) / 1000;
  }
  return 0;
}

function wPreview() {
  var kgmEl = document.getElementById('wKgm');
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  if (!kgmEl || !lenEl || !qtyEl) return;

  var kgm = parseFloat(kgmEl.value) || 0;
  var len = parseFloat(lenEl.value) || 0;
  var qty = parseFloat(qtyEl.value) || 0;
  if (kgm <= 0 || len <= 0 || qty <= 0) return;
}

function wAddRow() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  var kgmEl = document.getElementById('wKgm');
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  var priceEl = document.getElementById('wPrice');
  if (!kindEl || !specEl || !kgmEl || !lenEl || !qtyEl || !priceEl) return;

  var kgm = parseFloat(kgmEl.value) || 0;
  var len = parseFloat(lenEl.value) || 0;
  var qty = parseFloat(qtyEl.value) || 0;
  var price = parseFloat(priceEl.value) || 0;

  if (kgm <= 0 || len <= 0 || qty <= 0) {
    alert('種類・規格・長さ・本数・kg/m を正しく入力してください。');
    return;
  }

  var kind = kindEl.value;
  var spec = specEl.value;
  var memoEl = document.getElementById('wMemo');
  var memo = memoEl ? (memoEl.value || '') : '';
  var kg1 = kgm * len / 1000;
  var kg = kg1 * qty;
  var ppm = wGetPaintPerM(kind, spec);
  var m2_1 = ppm * len / 1000;
  var m2 = m2_1 * qty;

  _wRows.push({
    kind: kind,
    spec: spec,
    memo: memo,
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

  if (memoEl) memoEl.value = '';
  var memoCheck = document.getElementById('wMemoCheck');
  if (memoCheck) memoCheck.style.opacity = '0';
  wRenderRows();
  lenEl.focus();
  lenEl.select();
}

function wDeleteRow(idx) {
  _wRows.splice(idx, 1);
  wRenderRows();
}

function wClearAll() {
  if (_wRows.length === 0) return;
  if (!confirm('リストをすべてクリアしますか？')) return;
  _wRows = [];
  wRenderRows();
}

function wRenderRows() {
  var empty = document.getElementById('wEmpty');
  var tableWrap = document.getElementById('wTableWrap');
  var tbody = document.getElementById('wTbody');
  var tfoot = document.getElementById('wTfoot');
  var cartBtn = document.getElementById('wCartBtn');
  var mainHd = document.getElementById('wMainHd');
  var sumBox = document.getElementById('wSumBox');
  var sumKgEl = document.getElementById('wSumKg');
  var sumM2El = document.getElementById('wSumM2');
  var sumAmtRow = document.getElementById('wSumAmtRow');
  var sumAmtEl = document.getElementById('wSumAmt');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  if (_wRows.length === 0) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    if (cartBtn) cartBtn.style.display = 'none';
    if (mainHd) mainHd.style.display = 'none';
    if (sumBox) sumBox.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  var show = _wRows.length > 0;
  if (cartBtn) cartBtn.style.display = show ? '' : 'none';
  if (mainHd) mainHd.style.display = show ? 'flex' : 'none';

  var anyPrice = _wRows.some(function(r) { return r.amount !== null; });
  var sumKg = 0;
  var sumM2 = 0;
  var sumAmt = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumM2 += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;

    var amtCell = r.amount !== null
      ? '<td style="' + _tdR + 'color:#16a34a;font-weight:700">' + _wFmt(r.amount, 0) + '</td>'
      : '<td style="' + _tdR + 'color:#ccc">—</td>';

    return (
      '<tr style="border-bottom:1px solid #f0f0f6;' + (i % 2 === 1 ? 'background:#fafafa' : '') + '">' +
      '<td style="' + _tdL + 'color:#8888a8;font-size:11px">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#5a5a78;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _esc(r.memo) + '">' + _esc(r.memo || '—') + '</td>' +
      '<td style="' + _tdL + '">' + _esc(r.kind) + '</td>' +
      '<td style="' + _tdL + 'font-weight:600">' + _esc(r.spec) + '</td>' +
      '<td style="' + _tdR + '">' + r.len.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + r.qty.toLocaleString() + '</td>' +
      '<td style="' + _tdR + '">' + _wFmt(r.kg1, 0) + '</td>' +
      '<td style="' + _tdR + 'color:#6d28d9;font-weight:700">' + _wFmt(r.kgTotal, 0) + '</td>' +
      '<td style="' + _tdR + 'color:#0891b2;font-weight:700">' + _wFmt(r.m2Total, 2) + '</td>' +
      amtCell +
      '<td style="padding:6px;text-align:center">' +
        '<button onclick="wDeleteRow(' + i + ')" ' +
          'style="background:none;border:1px solid #e0e0ea;border-radius:6px;cursor:pointer;color:#aaa;font-size:11px;padding:2px 6px;line-height:1" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  if (sumBox) {
    sumBox.style.display = 'block';
    if (sumKgEl) sumKgEl.textContent = Math.round(sumKg).toLocaleString() + ' kg';
    if (sumM2El) sumM2El.textContent = _wFmt(sumM2, 2) + ' m2';
    if (sumAmtRow) sumAmtRow.style.display = anyPrice ? 'flex' : 'none';
    if (sumAmtEl) sumAmtEl.textContent = _wFmt(sumAmt, 0) + ' 円';
  }

  var totalAmtCell = anyPrice
    ? '<td style="' + _tdR + 'color:#16a34a;font-weight:800;font-size:13px">' + _wFmt(sumAmt, 0) + '</td>'
    : '<td style="' + _tdR + 'color:#ccc">—</td>';

  tfoot.innerHTML =
    '<tr style="background:#f4f4fa;border-top:2px solid #e0e0ea">' +
    '<td colspan="5" style="padding:10px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#5a5a78">合　計</td>' +
    '<td style="' + _tdR + 'color:#5a5a78">—</td>' +
    '<td style="' + _tdR + 'color:#6d28d9;font-weight:800;font-size:14px">' + _wFmt(sumKg, 0) + ' kg</td>' +
    '<td style="' + _tdR + 'color:#0891b2;font-weight:800;font-size:14px">' + _wFmt(sumM2, 2) + ' m2</td>' +
    totalAmtCell +
    '<td></td>' +
    '</tr>';
}

var _tdL = 'padding:8px 10px;text-align:left;white-space:nowrap;';
var _tdR = 'padding:8px 10px;text-align:right;white-space:nowrap;font-family:monospace;';

function _wFmt(v, dec) {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wPrint() {
  if (_wRows.length === 0) return;
  var anyPrice = _wRows.some(function(r) { return r.amount !== null; });
  var sumKg = 0;
  var sumM2 = 0;
  var sumAmt = 0;
  _wRows.forEach(function(r) {
    sumKg += r.kgTotal;
    sumM2 += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;
  });

  var rows = _wRows.map(function(r, i) {
    return '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:5px 8px">' + (i + 1) + '</td>' +
      '<td style="padding:5px 8px">' + _esc(r.memo || '—') + '</td>' +
      '<td style="padding:5px 8px">' + _esc(r.kind) + '</td>' +
      '<td style="padding:5px 8px">' + _esc(r.spec) + '</td>' +
      '<td style="padding:5px 8px;text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="padding:5px 8px;text-align:right">' + r.qty + '</td>' +
      '<td style="padding:5px 8px;text-align:right;font-weight:700">' + Math.round(r.kgTotal).toLocaleString() + '</td>' +
      '<td style="padding:5px 8px;text-align:right">' + _wFmt(r.m2Total, 2) + '</td>' +
      (anyPrice ? '<td style="padding:5px 8px;text-align:right" title="単価: ' + (r.price > 0 ? _esc(r.price + '円/kg') : '—') + '">' + (r.amount !== null ? _wFmt(r.amount, 0) : '—') + '</td>' : '') +
      '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">' +
    '<title>重量計算リスト</title>' +
    '<style>body{font-family:sans-serif;font-size:12px;padding:16px}' +
    'h2{font-size:15px;margin-bottom:8px}' +
    'table{width:100%;border-collapse:collapse}' +
    'th{background:#f0f0f6;padding:5px 8px;text-align:left;border-bottom:2px solid #ccc;font-size:11px}' +
    '.tot{font-size:13px;font-weight:800;margin-top:12px;padding:8px 12px;background:#f4f4fa;border-radius:6px}' +
    '@media print{button{display:none}}</style></head><body>' +
    '<h2>重量計算リスト</h2>' +
    '<table><thead><tr>' +
    '<th>#</th><th>部材名</th><th>種類</th><th>規格</th>' +
    '<th style="text-align:right">長さ(mm)</th>' +
    '<th style="text-align:right">本数</th>' +
    '<th style="text-align:right">合計重量(kg)</th>' +
    '<th style="text-align:right">塗装面積(m2)</th>' +
    (anyPrice ? '<th style="text-align:right">概算金額(円)</th>' : '') +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="tot">合計重量：' + Math.round(sumKg).toLocaleString() + ' kg　／　塗装面積：' + _wFmt(sumM2, 2) + ' m2' +
    (anyPrice ? '　／　概算金額：' + _wFmt(sumAmt, 0) + ' 円' : '') + '</div>' +
    (anyPrice ? '<div style="font-size:10px;color:#888;margin-top:6px">※ 単価は行ごとに異なる場合があります</div>' : '') +
    '<script>window.onload=function(){window.print();}<\/script></body></html>';

  var w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function wAddToCart() {
  if (_wRows.length === 0) return;

  var sumKg = 0;
  var sumM2 = 0;
  var sumAmt = 0;
  var anyPrice = _wRows.some(function(r) { return r.amount !== null; });
  _wRows.forEach(function(r) {
    sumKg += r.kgTotal;
    sumM2 += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;
  });

  var cartId = 'weight_' + Date.now();
  var data = {
    cardId: cartId,
    isWeight: true,
    title: '重量計算リスト（' + _wRows.length + '件）',
    rows: JSON.parse(JSON.stringify(_wRows)),
    sumKg: sumKg,
    sumM2: sumM2,
    sumAmt: anyPrice ? sumAmt : null,
    anyPrice: anyPrice
  };

  if (typeof addToCart === 'function') {
    addToCart(cartId, data);
    if (typeof updateCartBadge === 'function') updateCartBadge();

    var btn = document.getElementById('wCartBtn');
    if (btn) {
      btn.textContent = '✓ 追加済み';
      btn.classList.add('added');
      btn.disabled = true;
      setTimeout(function() {
        btn.textContent = '＋ 追加';
        btn.classList.remove('added');
        btn.disabled = false;
      }, 2500);
    }
  }
}

function wMemoInput(el) {
  var check = document.getElementById('wMemoCheck');
  if (check) check.style.opacity = el.value.trim() ? '1' : '0';
}
