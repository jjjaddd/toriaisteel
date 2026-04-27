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
    var focusMap = { price:'wPrice', name:'wMemo', paint:'wPaintPrice', title:'wDocTitle', rev:'wRevKg' };
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
    var qtyNeeded = Math.ceil(target / (kgm * len / 1000));
    var actualKg  = Math.round(qtyNeeded * kgm * len / 1000 * 10) / 10;
    revQtyEl.textContent = qtyNeeded.toLocaleString() + ' 本（実重量 ' + actualKg.toLocaleString() + ' kg）';
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

