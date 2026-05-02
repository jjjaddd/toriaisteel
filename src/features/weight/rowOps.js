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

  if (_wEditIdx >= 0 && _wSelected.length >= 2) {
    // 複数選択中：全選択行に長さ・本数・単価を一括適用
    _wSelected.forEach(function(idx) {
      var r = _wRows[idx];
      if (!r) return;
      var myKg1 = jisRound(r.kgm * len / 1000, 1);
      var myKg  = myKg1 * qty;
      var myPpm = wGetPaintPerM(r.kind, r.spec);
      var myM2  = myPpm * len / 1000 * qty;
      _wRows[idx] = Object.assign({}, r, {
        len: len, qty: qty,
        kg1: myKg1, kgTotal: myKg,
        m2_1: myPpm * len / 1000, m2Total: myM2,
        price: price,
        amount: price > 0 ? myKg * price : null,
        paintPrice: paintPrice,
        paintAmount: paintPrice > 0 ? myM2 * paintPrice : null,
        memo: _wOpts.name ? memo : r.memo
      });
    });
    _wSelected = [];
    _wEditIdx = -1;
    _wLastClickIdx = -1;
  } else if (_wEditIdx >= 0) {
    // 単行編集モード：既存行を上書き
    _wRows[_wEditIdx] = rowData;
    _wEditIdx = -1;
  } else {
    _wRows.push(rowData);
  }
  var addBtn = document.getElementById('wAddBtn');
  if (addBtn) addBtn.innerHTML = '＋ リストに追加 <span class="arr">→</span>';
  var cancelBtn = document.getElementById('wCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';

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
  if (kgmDisp)  kgmDisp.textContent = (cmdInput && (cmdInput.value || '').trim() && r.kgm) ? (r.kgm + ' kg/m') : '';

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
  } else if (_wOpts.name) {
    var emptyMemo = document.getElementById('wMemo'); if (emptyMemo) emptyMemo.value = '';
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
  if (addBtn) addBtn.innerHTML = '＋ リストに追加 <span class="arr">→</span>';
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

// ── 行クリック（編集 or Shift範囲選択） ──────────────────────────
function wRowClick(e, i) {
  // ボタン・チェックボックスのクリックは無視
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
  e.stopPropagation();
  if (e.shiftKey && _wLastClickIdx !== -1 && _wLastClickIdx !== i) {
    // Shift+クリック：範囲選択
    var lo = Math.min(_wLastClickIdx, i), hi = Math.max(_wLastClickIdx, i);
    _wSelected = [];
    for (var j = lo; j <= hi; j++) _wSelected.push(j);
    wRenderRows();
    wUpdateBulkBar();
  } else {
    // 通常クリック：編集モード
    _wSelected = [];
    _wLastClickIdx = i;
    wRenderRows();
    wUpdateBulkBar();
    wEditRow(i);
  }
}

// ── 行選択・一括編集 ───────────────────────────────────────────
function wToggleSelect(e, i) {
  if (e) e.stopPropagation();
  var idx = _wSelected.indexOf(i);
  if (idx === -1) _wSelected.push(i);
  else _wSelected.splice(idx, 1);
  wRenderRows();
  wUpdateBulkBar();
}

function wEditOrBulk(e, i) {
  e.stopPropagation();
  if (e.shiftKey || _wSelected.length > 0) {
    wToggleSelect(null, i);
  } else {
    wEditRow(i);
  }
}

function wUpdateBulkBar() {
  // 下部バー非使用。選択状態はテーブルの黄色ハイライトで表示
  var lbl = document.getElementById('wSelCount');
  if (lbl) {
    lbl.textContent = _wSelected.length >= 2 ? _wSelected.length + '行選択中 — 更新で一括適用' : '';
    lbl.style.color = '#b45309';
    lbl.style.fontWeight = '700';
    lbl.style.fontSize = '11px';
  }
}

function wBulkEdit() {
  if (_wSelected.length < 2) return;
  var modal = document.getElementById('wBulkModal');
  if (modal) { modal.style.display = 'flex'; return; }
  var m = document.createElement('div');
  m.id = 'wBulkModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2000;display:flex;align-items:center;justify-content:center';
  m.innerHTML =
    '<div style="background:#fff;border-radius:14px;padding:24px;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.18)">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:16px">一括編集 — ' + _wSelected.length + '行</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="font-size:12px;color:#555;display:block;margin-bottom:4px">単価 (円/kg)</label>' +
        '<input id="wBulkPrice" type="number" placeholder="空欄=変更なし" min="0" style="width:100%;padding:8px 10px;border:1px solid #d4d4dc;border-radius:8px;font-size:13px;box-sizing:border-box">' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;color:#555;display:block;margin-bottom:4px">塗装単価 (円/m²)</label>' +
        '<input id="wBulkPaint" type="number" placeholder="空欄=変更なし" min="0" style="width:100%;padding:8px 10px;border:1px solid #d4d4dc;border-radius:8px;font-size:13px;box-sizing:border-box">' +
      '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button onclick="document.getElementById(\'wBulkModal\').style.display=\'none\'" style="padding:8px 16px;border:1px solid #d4d4dc;background:#fff;border-radius:8px;cursor:pointer;font-family:inherit">キャンセル</button>' +
        '<button onclick="wApplyBulk()" style="padding:8px 16px;background:#333333;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">適用</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function wApplyBulk() {
  var price = parseFloat((document.getElementById('wBulkPrice') || {}).value);
  var paint = parseFloat((document.getElementById('wBulkPaint') || {}).value);
  wPushUndo();
  _wSelected.forEach(function(i) {
    if (!_wRows[i]) return;
    if (!isNaN(price) && price >= 0) {
      _wRows[i].price  = price;
      _wRows[i].amount = price > 0 ? _wRows[i].kgTotal * price : null;
    }
    if (!isNaN(paint) && paint >= 0) {
      _wRows[i].paintPrice  = paint;
      _wRows[i].paintAmount = paint > 0 ? _wRows[i].m2Total * paint : null;
    }
  });
  _wSelected = [];
  var m = document.getElementById('wBulkModal');
  if (m) m.style.display = 'none';
  wRenderRows();
  wUpdateBulkBar();
}

// ── 殴り書きノート ───────────────────────────────────────────────
var _wNotes = (_wPersistedState && _wPersistedState.notes && typeof _wPersistedState.notes === 'object')
  ? _wPersistedState.notes
  : {};

function wNoteSave(spec) {
  if (_wStore && typeof _wStore.saveNotes === 'function') {
    _wStore.saveNotes(_wNotes);
    return;
  }
  try { localStorage.setItem('toriai_wnotes', JSON.stringify(_wNotes)); } catch(e) {}
}

function wNoteOpen(e, i) {
  e.stopPropagation();
  var r = _wRows[i];
  if (!r) return;
  var key = r.spec;
  var existing = document.getElementById('wNoteModal');
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'wNoteModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2000;display:flex;align-items:center;justify-content:center';
  var notes = _wNotes[key] || [];
  var chatHtml = notes.length
    ? notes.map(function(n) {
        return '<div style="background:#f8f8fc;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12px">' +
          '<div style="color:#aaa;font-size:10px;margin-bottom:2px">' + n.ts + '</div>' +
          '<div>' + _esc(n.text) + '</div></div>';
      }).join('')
    : '<div style="color:#ccc;font-size:12px;text-align:center;padding:16px">まだメモなし</div>';
  m.innerHTML =
    '<div style="background:#fff;border-radius:14px;padding:20px;width:320px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.18)">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">✍️ ' + r.spec + ' メモ</div>' +
      '<div style="flex:1;overflow-y:auto;margin-bottom:10px;max-height:240px">' + chatHtml + '</div>' +
      '<textarea id="wNoteInput" placeholder="殴り書きOK..." style="width:100%;height:64px;padding:8px;border:1px solid #d4d4dc;border-radius:8px;font-size:13px;resize:none;box-sizing:border-box;font-family:inherit"></textarea>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">' +
        '<button onclick="document.getElementById(\'wNoteModal\').remove()" style="padding:6px 14px;border:1px solid #d4d4dc;background:#fff;border-radius:8px;cursor:pointer;font-family:inherit">閉じる</button>' +
        '<button onclick="wNotePost(\'' + key.replace(/'/g, "\\'") + '\')" style="padding:6px 14px;background:#333333;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">送信</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function wNotePost(key) {
  var input = document.getElementById('wNoteInput');
  if (!input || !input.value.trim()) return;
  if (!_wNotes[key]) _wNotes[key] = [];
  _wNotes[key].push({
    ts: new Date().toLocaleString('ja-JP'),
    text: input.value.trim()
  });
  wNoteSave(key);
  var m = document.getElementById('wNoteModal');
  if (m) m.remove();
}

function wClearAll() {
  if (_wRows.length === 0) return;
  if (!confirm('リストをすべてクリアしますか？')) return;
  _wCartAdded = false;
  wPushUndo();
  _wRows = [];
  wRenderRows();
}

