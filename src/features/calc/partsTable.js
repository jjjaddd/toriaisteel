function ptSelectAll() {
  ptDeselect(); // 既存選択をリセット
  for (var i = 0; i < totalRows; i++) {
    var row = document.getElementById('pr' + i);
    if (row) { row.classList.add('pt-selected'); _selectedRows.push(i); }
  }
}

/** 選択行のデータをすべてクリアする */
function ptClearSelected() {
  if (!_selectedRows.length) return;
  pushUndoManual();
  for (var si = 0; si < _selectedRows.length; si++) {
    var i = _selectedRows[si];
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    var k = document.getElementById('pk' + i);
    if (l) l.value = '';
    if (q) q.value = '';
    if (z) z.value = '';
    if (k) k.textContent = '—';
    var row = document.getElementById('pr' + i);
    if (row) row.classList.remove('pt-selected');
  }
  _selectedRows = [];
  updKg();
}

/** 選択状態を解除する */
function ptDeselect() {
  for (var i = 0; i < _selectedRows.length; i++) {
    var row = document.getElementById('pr' + _selectedRows[i]);
    if (row) row.classList.remove('pt-selected');
  }
  _selectedRows = [];
}

// ── アンドゥ/リドゥ ─────────────────────────────────────
var _undoStack = [];
var _redoStack = [];
var _preEditSnap = null;  // フォーカス時に保存した変更前スナップショット

/** 部材リストの現在状態をスナップショットとして返す */
function _snapParts() {
  var rows = [];
  for (var i = 0; i < totalRows; i++) {
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    rows.push({ l: l ? l.value : '', q: q ? q.value : '', z: z ? z.value : '' });
  }
  return rows;
}

/** スナップショットを部材リストに復元する */
function _restoreParts(rows) {
  var ptl = document.getElementById('ptList');
  if (!ptl) return;
  ptl.innerHTML = '';
  totalRows = 0;
  rows.forEach(function(row, i) {
    addPartRowAt(i);
    var l = document.getElementById('pl' + i);
    var q = document.getElementById('pq' + i);
    var z = document.getElementById('pz' + i);
    if (l) l.value = row.l;
    if (q) q.value = row.q;
    if (z) z.value = row.z;
  });
  totalRows = rows.length;
  // 最低ROWS行を確保
  while (totalRows < ROWS) { addPartRowAt(totalRows); totalRows++; }
  updKg();
}

/** 手動でアンドゥスタックにプッシュ（clearParts・executePaste 前に呼ぶ） */
function pushUndoManual() {
  _undoStack.push(_snapParts());
  if (_undoStack.length > 50) _undoStack.shift();
  _redoStack = [];
}

/** pt-row入力フォーカス時：変更前状態を保存 */
function ptUndoFocus() {
  if (_preEditSnap === null) {
    _preEditSnap = _snapParts();
  }
}

/** pt-row入力ブラー時：変更があればアンドゥスタックに積む */
function ptUndoBlur() {
  if (_preEditSnap === null) return;
  var cur = _snapParts();
  if (JSON.stringify(cur) !== JSON.stringify(_preEditSnap)) {
    _undoStack.push(_preEditSnap);
    if (_undoStack.length > 50) _undoStack.shift();
    _redoStack = [];
  }
  _preEditSnap = null;
}

/** Ctrl+Z：アンドゥ */
function undoAction() {
  if (!_undoStack.length) return;
  _redoStack.push(_snapParts());
  _restoreParts(_undoStack.pop());
}

/** Ctrl+Shift+Z：リドゥ */
function redoAction() {
  if (!_redoStack.length) return;
  _undoStack.push(_snapParts());
  _restoreParts(_redoStack.pop());
}

// ── 工区トグル ───────────────────────────────────────────
/** 詳細設定「工区を入力する」チェックボックス変更時に呼ぶ */
function toggleKuiku() {
  var cb = document.getElementById('useKuiku');
  var enabled = cb && cb.checked;
  var wrap = document.querySelector('.pt-wrap');
  var hdKuiku = document.getElementById('ptHdKuiku');
  if (wrap) wrap.classList.toggle('kuiku-on', enabled);
  if (hdKuiku) hdKuiku.style.display = enabled ? '' : 'none';
  for (var i = 0; i < totalRows; i++) {
    var pz = document.getElementById('pz' + i);
    if (pz) pz.style.display = enabled ? '' : 'none';
  }
}

// ── グローバルキーボードショートカット ────────────────────
document.addEventListener('keydown', function(e) {
  var tag = document.activeElement ? document.activeElement.tagName : '';
  var isInPtRow = document.activeElement && document.activeElement.closest &&
                  document.activeElement.closest('.pt-row');

  // Ctrl+A：切り出し部材リスト全行を選択（ptList内にフォーカスがある場合）
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    if (isInPtRow) {
      e.preventDefault();
      ptSelectAll();
      // 入力欄からフォーカスを外してDeleteキーが即使えるようにする
      var ptList = document.getElementById('ptList');
      if (ptList) ptList.focus();
      return;
    }
  }

  // Delete / Backspace：選択行をクリア（行が選択されているとき優先処理）
  if ((e.key === 'Delete' || e.key === 'Backspace') && _selectedRows.length > 0) {
    e.preventDefault();
    ptClearSelected();
    return;
  }

  // その他のキーを押したら行選択を解除
  if (_selectedRows.length > 0 && e.key !== 'Delete' && e.key !== 'Backspace') {
    ptDeselect();
  }

  // Ctrl+Z：アンドゥ（pt-row内、またはページフォーカス時）
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !isInPtRow) return; // 他inputはブラウザ既定
    e.preventDefault();
    undoAction();
    return;
  }
  // Ctrl+Shift+Z：リドゥ
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && !isInPtRow) return;
    e.preventDefault();
    redoAction();
    return;
  }
  // Ctrl+Enter：計算実行（計算ページ表示中のみ）
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    var cp = document.getElementById('cp');
    if (cp && cp.classList.contains('show')) {
      e.preventDefault();
      runCalc();
    }
  }
});
var totalRows    = 0;
var remnantCount = 0;
var pieceColorMap = {};
var _lastCalcResult = null;
var _lastAllDP = [], _lastPatA = null, _lastPatB = null;
var HISTORY_PAGE_SIZE = 10;
var INVENTORY_PAGE_SIZE = 12;
var historyPage = 1;
var inventoryPage = 1;

/** ISO タイムスタンプまたは Date を LOCAL の YYYY-MM-DD に変換 */


function buildPartRows(count) {
  var pl = document.getElementById('ptList');
  for (var i = 0; i < count; i++) {
    addPartRowAt(i);
  }
  totalRows = count;
}

function addPartRowAt(i) {
  var pl = document.getElementById('ptList');
  var d = document.createElement('div');
  d.className = 'pt-row';
  d.id = 'pr' + i;
  var kuikuEnabled = document.getElementById('useKuiku') && document.getElementById('useKuiku').checked;
  d.innerHTML =
    '<span class="pt-n">' + String(i+1).padStart(2, '0') + '</span>' +
    '<input type="number" id="pl' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'l\')" style="text-align:right">' +
    '<input type="number" id="pq' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'q\')" style="text-align:right">' +
    '<input type="text" id="pz' + i + '" onfocus="ptUndoFocus()" onblur="ptUndoBlur()" onkeydown="ptEnter(event,' + i + ',\'z\')" style="' + (kuikuEnabled ? '' : 'display:none') + '">' +
    '<span class="pt-kg" id="pk' + i + '">—</span>';
  pl.appendChild(d);
}

function ptCellOrderForRow(i) {
  var order = ['pl' + i, 'pq' + i];
  var kuikuOn = document.getElementById('useKuiku') && document.getElementById('useKuiku').checked;
  if (kuikuOn) order.push('pz' + i);
  return order;
}

function ptFocusCell(id) {
  var el = document.getElementById(id);
  if (!el) return false;
  el.focus();
  if (typeof el.select === 'function') el.select();
  return true;
}

function ptMoveCell(i, col, direction) {
  var rowOrder = ptCellOrderForRow(i);
  var currentId = (col === 'q') ? 'pq' + i : (col === 'z' ? 'pz' + i : 'pl' + i);
  var pos = rowOrder.indexOf(currentId);
  if (pos < 0) return;

  if (direction > 0) {
    if (pos < rowOrder.length - 1) {
      ptFocusCell(rowOrder[pos + 1]);
      return;
    }
    var nextRowFirst = 'pl' + (i + 1);
    if (document.getElementById(nextRowFirst)) {
      ptFocusCell(nextRowFirst);
    } else {
      addPartRow();
      setTimeout(function() { ptFocusCell(nextRowFirst); }, 30);
    }
    return;
  }

  if (pos > 0) {
    ptFocusCell(rowOrder[pos - 1]);
    return;
  }
  if (i <= 0) return;
  var prevOrder = ptCellOrderForRow(i - 1);
  ptFocusCell(prevOrder[prevOrder.length - 1]);
}

/** テンキーEnterで次のセルへ移動 */
function ptEnter(e, i, col) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    ptMoveCell(i, col, e.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (e.shiftKey) {
    var specInput = document.getElementById('dataSpecInput');
    if (specInput) {
      specInput.focus();
      setTimeout(function() { specInput.select(); }, 0);
    }
    return;
  }
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

// ★ 行を動的追加
function addPartRow() {
  var i = totalRows;
  totalRows++;
  addPartRowAt(i);
  // スクロール最下部へ
  var pt = document.getElementById('ptList');
  pt.scrollTop = pt.scrollHeight;
}



