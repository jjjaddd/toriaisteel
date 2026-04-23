/**
 * main.js  —  UI 操作・DOM 更新・イベントハンドラ・初期化
 *
 * storage.js と calc.js に依存する。
 * DOM を直接操作する関数はすべてここに置く。
 */

// ── アプリ状態 ─────────────────────────────────────────
var ROWS         = 15;   // 部材リスト初期行数
var curKind      = 'H形鋼';

// ── 行選択（Ctrl+A / Delete） ────────────────────────────
var _selectedRows = [];   // 選択中の行インデックス

/** 切り出し部材リストの全行を選択状態にする */
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

/**
 * 任意の日付値を "YYYY-MM-DD" 文字列に正規化（文字列比較用）
 * "2026/4/12" → "2026-04-12"
 * "2026-04-12T06:30:00Z" → "2026-04-12"
 */

function renderPager(targetId, page, totalPages, onChangeName) {
  var el = document.getElementById(targetId);
  if (!el) return;
  if (totalPages <= 1) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML =
    '<button onclick="' + onChangeName + '(' + (page - 1) + ')" ' + (page <= 1 ? 'disabled' : '') + '>前へ</button>' +
    '<span class="pager-info">' + page + ' / ' + totalPages + '</span>' +
    '<button onclick="' + onChangeName + '(' + (page + 1) + ')" ' + (page >= totalPages ? 'disabled' : '') + '>次へ</button>';
}

function setHistoryPage(page) {
  historyPage = page;
  renderHistory();
}

function setInventoryPage(page) {
  inventoryPage = page;
  renderInventoryPage();
}

// ============================================================
// ページ切り替え
// ============================================================
function hiSwitch(tab) {
  var showH = (tab === 'h');
  var panH = document.getElementById('hiPanelH');
  var panI = document.getElementById('hiPanelI');
  if (panH) panH.style.display = showH ? 'block' : 'none';
  if (panI) panI.style.display = showH ? 'none' : 'block';
  var hiTabH = document.getElementById('hiTabH');
  var hiTabI = document.getElementById('hiTabI');
  if (hiTabH) hiTabH.classList.toggle('hi-tab-active', showH);
  if (hiTabI) hiTabI.classList.toggle('hi-tab-active', !showH);
  // ナビもハイライト更新
  ['na','ninv','nhist','nw','nd','nco'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  var navEl = document.getElementById(showH ? 'nhist' : 'ninv');
  if (navEl) navEl.classList.add('active');
  if (showH) { buildHistSidebar(); buildHistSpecDropdown(); renderHistory(); }
  else { buildInvSidebar(); buildInvFilterKind(); buildInvAddKind(); renderInventoryPage(); }
}

// ── サイドバー：詳細パネル開閉 ──
function hiToggleDetail() {
  var panel = document.getElementById('hiDetailPanel');
  var btn = document.getElementById('hiDetailBtn');
  if (!panel) return;
  var open = panel.classList.contains('open');
  // close inv panel if open
  var invPanel = document.getElementById('invDetailPanel');
  if (invPanel) { invPanel.classList.remove('open'); var ib = document.getElementById('invDetailBtn'); if(ib) ib.classList.remove('active'); }
  panel.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('active', !open);
}

function invToggleDetail() {
  var panel = document.getElementById('invDetailPanel');
  var btn = document.getElementById('invDetailBtn');
  if (!panel) return;
  var open = panel.classList.contains('open');
  // close hist panel if open
  var hiPanel = document.getElementById('hiDetailPanel');
  if (hiPanel) { hiPanel.classList.remove('open'); var hb = document.getElementById('hiDetailBtn'); if(hb) hb.classList.remove('active'); }
  panel.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('active', !open);
}

// パネル外クリックで詳細パネルを閉じる
document.addEventListener('click', function(e) {
  ['hi', 'inv'].forEach(function(prefix) {
    var panel = document.getElementById(prefix === 'hi' ? 'hiDetailPanel' : 'invDetailPanel');
    var btn   = document.getElementById(prefix === 'hi' ? 'hiDetailBtn'   : 'invDetailBtn');
    if (!panel || !panel.classList.contains('open')) return;
    if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
    panel.classList.remove('open');
    if (btn) btn.classList.remove('active');
  });
});

// ── サイドバー：鋼材種類リスト構築 ──
function buildHistSidebar() {
  var cont = document.getElementById('hsSbKinds');
  if (!cont) return;
  var hist = getCutHistory ? getCutHistory() : [];
  var kinds = [];
  hist.forEach(function(h) {
    if (h.kind) {
      String(h.kind).split('/').forEach(function(part) {
        var k = part.trim();
        if (k && kinds.indexOf(k) < 0) kinds.push(k);
      });
    }
    if (h.project && Array.isArray(h.project.sections)) {
      h.project.sections.forEach(function(section) {
        var k = section && section.kind ? String(section.kind).trim() : '';
        if (k && kinds.indexOf(k) < 0) kinds.push(k);
      });
    }
  });
  kinds.sort(function(a, b) { return a.localeCompare(b, 'ja'); });
  var currentKind = (document.getElementById('hsKind') || {}).value || '';
  cont.innerHTML = kinds.map(function(k) {
    var on = (k === currentKind) ? ' on' : '';
    return '<div class="hi-sb-item' + on + '" onclick="hiSbKind(\'' + k.replace(/'/g, "\\'") + '\')">' +
      '<span class="hi-sb-dot"></span>' + k + '</div>';
  }).join('');
}

function buildInvSidebar() {
  var cont = document.getElementById('invSbKinds');
  if (!cont) return;
  var inv = getInventory ? getInventory() : [];
  var kinds = [];
  inv.forEach(function(x) { if (x.kind && kinds.indexOf(x.kind) < 0) kinds.push(x.kind); });
  kinds.sort(function(a, b) { return a.localeCompare(b, 'ja'); });
  var currentKind = (document.getElementById('invFilterKind') || {}).value || '';
  cont.innerHTML = kinds.map(function(k) {
    var on = (k === currentKind) ? ' on' : '';
    return '<div class="hi-sb-item' + on + '" onclick="invSbKind(\'' + k.replace(/'/g, "\\'") + '\')">' +
      '<span class="hi-sb-dot"></span>' + k + '</div>';
  }).join('');
}

// ── サイドバー：種類クリック ──
function hiSbKind(kind) {
  var hidden = document.getElementById('hsKind');
  if (!hidden) return;
  var prev = hidden.value;
  hidden.value = (prev === kind) ? '' : kind;
  // サイドバーの .on を更新
  var cont = document.getElementById('hsSbKinds');
  if (cont) {
    cont.querySelectorAll('.hi-sb-item').forEach(function(el) {
      var elKind = el.textContent.trim();
      el.classList.toggle('on', elKind === hidden.value);
    });
  }
  buildHistSpecDropdown();
  historyPage = 1;
  renderHistory();
}

function invSbKind(kind) {
  var hidden = document.getElementById('invFilterKind');
  if (!hidden) return;
  var prev = hidden.value;
  hidden.value = (prev === kind) ? '' : kind;
  var cont = document.getElementById('invSbKinds');
  if (cont) {
    cont.querySelectorAll('.hi-sb-item').forEach(function(el) {
      var elKind = el.textContent.trim();
      el.classList.toggle('on', elKind === hidden.value);
    });
  }
  buildInvFilterSpec();
  inventoryPage = 1;
  renderInventoryPage();
}

// ── サイドバー：在庫 登録日プリセット ──
var _invSbDateActive = '';
function invSbDate(preset) {
  _invSbDateActive = (_invSbDateActive === preset) ? '' : preset;
  // .on クラス更新
  var chipMap = { week: 'invChipW', month: 'invChipM', all: 'invChipA' };
  Object.keys(chipMap).forEach(function(p) {
    var el = document.getElementById(chipMap[p]);
    if (el) el.classList.toggle('on', p === _invSbDateActive);
  });
  var now = new Date();
  var from = '';
  if (_invSbDateActive === 'week') {
    var day = now.getDay();
    var diff = (day === 0) ? -6 : 1 - day;
    var mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    from = mon.toISOString().slice(0, 10);
  } else if (_invSbDateActive === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  // 'all' or '' → from = '' (全件表示)
  var df = document.getElementById('invDateFrom');
  if (df) df.value = from;
  inventoryPage = 1;
  renderInventoryPage();
}

// ── 在庫検索クリア ──
function clearInvSearch() {
  ['invKeyword', 'invFilterSpec', 'invFilterKind', 'invDateFrom'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sortEl = document.getElementById('invSort');
  if (sortEl) sortEl.value = 'date_desc';
  _invSbDateActive = '';
  ['invChipW', 'invChipM', 'invChipA'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  });
  var invSbCont = document.getElementById('invSbKinds');
  if (invSbCont) invSbCont.querySelectorAll('.hi-sb-item').forEach(function(el) { el.classList.remove('on'); });
  inventoryPage = 1;
  renderInventoryPage();
}

// ── 手動追加モーダル ──
function openInvAddModal() {
  buildInvAddKind();
  var m = document.getElementById('invAddModal');
  if (m) m.classList.add('open');
  // 入力リセット
  ['invAddLen','invAddCompany','invAddNote'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
  var qty = document.getElementById('invAddQty'); if(qty) qty.value = '1';
}
function closeInvAddModal() {
  var m = document.getElementById('invAddModal');
  if (m) m.classList.remove('open');
}

// 期間チップ --- DOM input を経由せずグローバル変数で保持
var _hiChipActive = 0;
var _chipDateFrom = '';   // renderHistory が直接参照
var _chipDateTo   = '';
var _histTypeFilter = 'all'; // 'all' | 'cut' | 'weight'
var _histView = 'flat'; // 'flat' | 'group'

// ── appState シム (Phase 1) ─────────────────────────────
// 既存グローバル変数を appState 経由でも参照できるようにする。
// 既存コードはそのまま動く。Phase 2 以降で徐々に移行予定。
var appState = {
  // 鋼材種別
  get curKind()         { return curKind; },
  set curKind(v)        { curKind = v; },
  // 履歴フィルター
  get histTypeFilter()  { return _histTypeFilter; },
  set histTypeFilter(v) { _histTypeFilter = v; },
  get chipDateFrom()    { return _chipDateFrom; },
  set chipDateFrom(v)   { _chipDateFrom = v; },
  get chipDateTo()      { return _chipDateTo; },
  set chipDateTo(v)     { _chipDateTo = v; },
  get histView()        { return _histView; },
  set histView(v)       { _histView = v; },
  get hiChipActive()    { return _hiChipActive; },
  set hiChipActive(v)   { _hiChipActive = v; },
  // ページネーション
  get historyPage()     { return historyPage; },
  set historyPage(v)    { historyPage = v; },
  get inventoryPage()   { return inventoryPage; },
  set inventoryPage(v)  { inventoryPage = v; },
  // 計算結果キャッシュ
  get lastCalcResult()  { return _lastCalcResult; },
  set lastCalcResult(v) { _lastCalcResult = v; },
  get lastPatA()        { return _lastPatA; },
  set lastPatA(v)       { _lastPatA = v; },
  get lastPatB()        { return _lastPatB; },
  set lastPatB(v)       { _lastPatB = v; },
  // Undo/Redo スタック（参照渡し）
  get undoStack()       { return _undoStack; },
  get redoStack()       { return _redoStack; },
};
// ────────────────────────────────────────────────────────

function hiChip(n) {
  _hiChipActive = (_hiChipActive === n) ? 0 : n;
  [1,2,3,4].forEach(function(i) {
    var c = document.getElementById('hChip' + i);
    if (c) c.classList.toggle('on', i === _hiChipActive);
  });
  var now = new Date();
  if (_hiChipActive === 1) {
    _chipDateFrom = toLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    _chipDateTo   = toLocalYMD(now);
  } else if (_hiChipActive === 2) {
    _chipDateFrom = toLocalYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    _chipDateTo   = toLocalYMD(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (_hiChipActive === 3) {
    _chipDateFrom = toLocalYMD(new Date(now.getFullYear(), now.getMonth() - 3, 1));
    _chipDateTo   = toLocalYMD(now);
  } else if (_hiChipActive === 4) {
    _chipDateFrom = now.getFullYear() + '-01-01';
    _chipDateTo   = toLocalYMD(now);
  } else {
    _chipDateFrom = '';
    _chipDateTo   = '';
  }
  historyPage = 1;
  renderHistory();
}

function hiTypeFilter(type) {
  _histTypeFilter = type;
  ['hTypeAll', 'hTypeCut', 'hTypeWeight'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  });
  var active = document.getElementById(
    type === 'cut' ? 'hTypeCut' : type === 'weight' ? 'hTypeWeight' : 'hTypeAll'
  );
  if (active) active.classList.add('on');
  historyPage = 1;
  renderHistory();
}

function hiSetView(view) {
  _histView = view;
  var flatBtn = document.getElementById('hiViewFlat');
  var groupBtn = document.getElementById('hiViewGroup');
  if (flatBtn) flatBtn.classList.toggle('hi-view-btn--on', view === 'flat');
  if (groupBtn) groupBtn.classList.toggle('hi-view-btn--on', view === 'group');
  historyPage = 1;
  renderHistory();
}

/* ============================================================
   詳細設定ポップアップ（段階3: 骨組みのみ）
   ============================================================ */
function openGearPopup() {
  var bd = document.getElementById('gearPopBd');
  if (bd) bd.classList.add('show');
}
function closeGearPopup() {
  var bd = document.getElementById('gearPopBd');
  if (bd) bd.classList.remove('show');
}
// Escキーでポップアップを閉じる
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var bd = document.getElementById('gearPopBd');
    if (bd && bd.classList.contains('show')) {
      closeGearPopup();
    }
  }
});

function goPage(p) {
  document.querySelectorAll('.pg').forEach(function(el){ el.classList.remove('show'); });
  document.body.classList.remove(
    'sidebar-layout-active',
    'page-calc-active',
    'page-weight-active',
    'page-data-active',
    'page-history-active',
    'page-contact-active'
  );
  document.body.classList.toggle('page-contact', p === 'contact');
  // ナビ全リセット
  ['na','ninv','nhist','nw','nd','nco'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  // 歯車ボタンは取り合いタブのみ表示
  var gearBtn = document.getElementById('gearBtn');
  if (gearBtn) gearBtn.style.display = (p === 'c') ? 'flex' : 'none';
  // タブ切替時はポップアップも閉じる
  if (p !== 'c') {
    var gpb = document.getElementById('gearPopBd');
    if (gpb) gpb.classList.remove('show');
  }

  if (p === 'c') {
    var cp = document.getElementById('cp');
    var na = document.getElementById('na');
    if (cp) cp.classList.add('show');
    if (na) na.classList.add('active');
    setTimeout(function() {
      var ci = document.getElementById('cmdInput');
      if (ci) { ci.focus(); ci.select(); }
    }, 50);
  } else if (p === 'w') {
    var wpp = document.getElementById('wpp');
    var nw = document.getElementById('nw');
    if (wpp) wpp.classList.add('show');
    if (nw) nw.classList.add('active');
    if (typeof wInit === 'function') wInit();
  } else if (p === 'data') {
    var dpp = document.getElementById('dpp');
    var nd = document.getElementById('nd');
    if (dpp) dpp.classList.add('show');
    if (nd) nd.classList.add('active');
    if (typeof dataInit === 'function') dataInit();
  } else if (p === 'contact') {
    var cop = document.getElementById('cop');
    var nco = document.getElementById('nco');
    if (cop) cop.classList.add('show');
    if (nco) nco.classList.add('active');
  } else {
    var hip = document.getElementById('hip');
    if (hip) hip.classList.add('show');
    var showH = (p === 'hist' || p === 'hi' || p === 'h');
    var navHi = document.getElementById(showH ? 'nhist' : 'ninv');
    if (navHi) navHi.classList.add('active');
    var hiPanelH = document.getElementById('hiPanelH');
    var hiPanelI = document.getElementById('hiPanelI');
    var hiTabH = document.getElementById('hiTabH');
    var hiTabI = document.getElementById('hiTabI');
    if (hiPanelH) hiPanelH.style.display = showH ? 'block' : 'none';
    if (hiPanelI) hiPanelI.style.display = showH ? 'none' : 'block';
    if (hiTabH) hiTabH.classList.toggle('hi-tab-active', showH);
    if (hiTabI) hiTabI.classList.toggle('hi-tab-active', !showH);
    if (showH) { buildHistSidebar(); buildHistSpecDropdown(); renderHistory(); }
    else {
      buildInvSidebar();
      buildInvFilterKind();
      buildInvAddKind();
      renderInventoryPage();
      setTimeout(function() {
        if (typeof updateInventorySummary === 'function' && typeof getInventory === 'function') {
          updateInventorySummary(getInventory());
        }
      }, 0);
    }
  }
}

// ============================================================
// 初期化
// ============================================================
function init() {
  // 在庫定尺
  rebuildStkList();

  // 部材リスト（重複防止のためクリアしてから生成）
  var ptl = document.getElementById('ptList');
  if (ptl) ptl.innerHTML = '';
  totalRows = 0;
  buildPartRows(ROWS);

  updKg();

  // localStorage読み込み（設定・残材）
  loadSettings();
  syncInventoryToRemnants();  // 在庫から自動同期
  updKg();
  buildJobDatalist();
  updateCartBadge();
  var invSelect = document.getElementById('invSelect');
  if (invSelect) invSelect.addEventListener('change', updateInventoryUseButton);
  var cartBulkPrintBtn = document.querySelector('#cartModal [onclick="cartPrintCutting()"]');
  if (cartBulkPrintBtn) cartBulkPrintBtn.classList.add('cart-bulk-print');
  updateInventoryUseButton();

  // 初期規格を自動選択（H形鋼の最初の規格）
  var firstKind = Object.keys(STEEL)[0];
  if (firstKind && STEEL[firstKind] && STEEL[firstKind][0]) {
    cmdSelect({ kind: firstKind, spec: STEEL[firstKind][0][0], kgm: STEEL[firstKind][0][1] });
    document.getElementById('cmdInput').value = '';
  }

  showCalcOnboardingIfNeeded();
}

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

/** テンキーEnterで次のセルへ移動 */
function ptEnter(e, i, col) {
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

// コマンドパレット：全候補リストを生成
function cmdBuildAll() {
  var items = [];
  Object.keys(STEEL).forEach(function(kind) {
    (STEEL[kind] || []).forEach(function(row) {
      items.push({ kind: kind, spec: row[0], kgm: row[1] });
    });
  });
  return items;
}

// コマンドパレット：検索ボタンで種類一覧を開く
function cmdOpenBrowse() {
  var dd = document.getElementById('cmdDropdown');
  if (!dd) return;

  dd.innerHTML = '';
  Object.keys(STEEL).forEach(function(kind) {
    var row = document.createElement('div');
    row.className = 'cmd-item cmd-cat-link';
    row.innerHTML = '<span>' + kind + '</span><span class="cmd-sub">▶</span>';
    row.onmouseover = function() {
      dd.querySelectorAll('.cmd-item').forEach(function(el) { el.classList.remove('cmd-focus'); });
      this.classList.add('cmd-focus');
    };
    row.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cmdShowKind(kind);
    };
    dd.appendChild(row);
  });

  dd.style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}

// コマンドパレット：種類を選んだら規格一覧を表示
function cmdShowKind(kind) {
  var dd = document.getElementById('cmdDropdown');
  var list = STEEL[kind] || [];
  if (!dd) return;

  dd.innerHTML = '';
  var back = document.createElement('div');
  back.className = 'cmd-cat';
  back.style.cursor = 'pointer';
  back.style.color = '#aaa';
  back.style.display = 'flex';
  back.style.alignItems = 'center';
  back.style.gap = '4px';
  back.innerHTML = '◀ 戻る　<strong style="color:#5a5a78">' + kind + '</strong>';
  back.onmousedown = function(e) {
    e.preventDefault();
    e.stopPropagation();
    cmdOpenBrowse();
  };
  dd.appendChild(back);

  list.forEach(function(rowData) {
    var it = { kind: kind, spec: rowData[0], kgm: rowData[1] };
    var row = document.createElement('div');
    row.className = 'cmd-item';
    row.innerHTML = '<span>' + it.spec + '</span><span class="cmd-sub">' + it.kgm + ' kg/m</span>';
    row.onmouseover = function() {
      dd.querySelectorAll('.cmd-item').forEach(function(el) { el.classList.remove('cmd-focus'); });
      this.classList.add('cmd-focus');
    };
    row.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cmdSelect(it);
    };
    dd.appendChild(row);
  });

  dd.style.display = 'block';
}

// コマンドパレット：外クリックで閉じる
function cmdOutside(e) {
  var wrap = document.getElementById('cmdPaletteWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('cmdDropdown').style.display = 'none';
    document.removeEventListener('mousedown', cmdOutside);
  }
}

// 鋼材種類 プレフィックスマップ（長い順に並べて先に評価）
var CMD_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] }
];

// コマンドパレット：絞り込み描画
function cmdFilter() {
  var input = document.getElementById('cmdInput');
  var dd = document.getElementById('cmdDropdown');
  if (!input || !dd) return;
  var raw = (input.value || '').trim();
  var q = raw.toLowerCase();
  if (!q) {
    dd.style.display = 'none';
    return;
  }

  var all = cmdBuildAll();
  var filtered;

  // プレフィックスで種類を絞り込む
  var kindFilter = null;
  var numQuery = '';
  for (var pi = 0; pi < CMD_PREFIX_MAP.length; pi++) {
    var pm = CMD_PREFIX_MAP[pi];
    if (q.indexOf(pm.prefix) === 0) {
      kindFilter = pm.kinds;
      numQuery = q.slice(pm.prefix.length).replace(/[^0-9]/g, '');
      break;
    }
  }

  if (kindFilter) {
    filtered = all.filter(function(it) {
      if (kindFilter.indexOf(it.kind) < 0) return false;
      if (!numQuery) return true;
      var specNums = it.spec.replace(/[^0-9]/g, '');
      return specNums.indexOf(numQuery) >= 0;
    });
  } else {
    // 数字のみ or 未知の入力: 全種類から数字一致で検索
    filtered = all.filter(function(it) {
      return it.kind.toLowerCase().indexOf(q) >= 0 ||
             it.spec.toLowerCase().indexOf(q) >= 0 ||
             it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
    });
  }

  dd.innerHTML = '';
  if (filtered.length === 0) {
    dd.innerHTML = '<div style="padding:12px;font-size:12px;color:#aaa;text-align:center">見つかりません</div>';
    dd.style.display = 'block';
    document.addEventListener('mousedown', cmdOutside);
    return;
  }

  var lastKind = '';
  filtered.slice(0, 60).forEach(function(it, idx) {
    if (it.kind !== lastKind) {
      var cat = document.createElement('div');
      cat.className = 'cmd-cat';
      cat.textContent = it.kind;
      dd.appendChild(cat);
      lastKind = it.kind;
    }
    var row = document.createElement('div');
    row.className = 'cmd-item';
    row.dataset.idx = idx;
    row.innerHTML = '<span>' + it.spec + '</span><span class="cmd-sub">' + it.kgm + ' kg/m</span>';
    row.onmouseover = function() {
      dd.querySelectorAll('.cmd-item').forEach(function(el) { el.classList.remove('cmd-focus'); });
      this.classList.add('cmd-focus');
    };
    row.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cmdSelect(it);
    };
    dd.appendChild(row);
  });
  dd.style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}

// コマンドパレット：規格を選択
function cmdSelect(it) {
  curKind = it.kind;
  var sel = document.getElementById('spec');
  if (!sel) return;
  sel.innerHTML = '';
  (STEEL[curKind] || []).forEach(function(row) {
    var o = document.createElement('option');
    o.value = o.textContent = row[0];
    sel.appendChild(o);
  });
  sel.value = it.spec;

  var cmdInput = document.getElementById('cmdInput');
  var cmdDropdown = document.getElementById('cmdDropdown');
  var kgmEl = document.getElementById('cmdKgm');
  if (kgmEl) kgmEl.textContent = it.kgm + ' kg/m';
  if (cmdInput) cmdInput.value = it.kind + '　' + it.spec;
  if (cmdDropdown) cmdDropdown.style.display = 'none';
  document.removeEventListener('mousedown', cmdOutside);
  onSpec();
  showRemnantAlert(it.kind, it.spec);
  setTimeout(function() {
    var pl0 = document.getElementById('pl0');
    if (pl0) { pl0.focus(); pl0.select(); }
  }, 50);
}

function showRemnantAlert(kind, spec) {
  var existing = document.getElementById('remAlertToast');
  if (existing) existing.remove();
  if (typeof getInventory !== 'function') return;
  var inv = getInventory().filter(function(item) {
    return item.kind === kind && item.spec === spec && (item.qty || 0) > 0;
  });
  if (!inv.length) return;
  var totalQty = inv.reduce(function(s, i) { return s + (i.qty || 1); }, 0);
  var toast = document.createElement('div');
  toast.id = 'remAlertToast';
  toast.style.cssText = 'position:fixed;bottom:72px;right:16px;z-index:9999;background:#fff;border:2px solid #f59e0b;border-radius:12px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:13px;font-weight:700;color:#92400e;display:flex;align-items:center;gap:10px;max-width:260px;animation:fadeInUp .2s ease';
  toast.innerHTML =
    '<span style="font-size:18px">⚠️</span>' +
    '<div><div>残材あり（' + totalQty + '本）</div>' +
    '<div style="font-size:11px;font-weight:400;color:#b45309;margin-top:2px">' + kind + '　' + spec + '</div></div>' +
    '<button onclick="sbSwitch(1);document.getElementById(\'remAlertToast\').remove()" style="margin-left:auto;background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">使う</button>' +
    '<button onclick="this.closest(\'#remAlertToast\').remove()" style="background:none;border:none;font-size:14px;cursor:pointer;color:#aaa;padding:0 2px">✕</button>';
  document.body.appendChild(toast);
  setTimeout(function() { if (document.getElementById('remAlertToast')) document.getElementById('remAlertToast').remove(); }, 6000);
}

// コマンドパレット：キーボード操作（↑↓Enter）
function cmdKey(e) {
  var dd = document.getElementById('cmdDropdown');
  if (!dd || dd.style.display === 'none') return;
  var items = dd.querySelectorAll('.cmd-item');
  if (!items.length) return;
  var focused = dd.querySelector('.cmd-item.cmd-focus');
  var idx = focused ? Array.from(items).indexOf(focused) : -1;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (focused) focused.classList.remove('cmd-focus');
    var next = items[Math.min(idx + 1, items.length - 1)];
    if (next) { next.classList.add('cmd-focus'); next.scrollIntoView({block:'nearest'}); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (focused) focused.classList.remove('cmd-focus');
    var prev = items[Math.max(idx - 1, 0)];
    if (prev) { prev.classList.add('cmd-focus'); prev.scrollIntoView({block:'nearest'}); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // 候補が1件だけなら即選択
    if (items.length === 1) {
      if (items[0].onmousedown) items[0].onmousedown(e);
    } else if (focused && focused.onmousedown) {
      focused.onmousedown(e);
    }
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
  }
}

function onSpec() {
  updateInvDropdown();
  var spec = document.getElementById('spec').value;
  var row = (typeof getSteelRow === 'function')
    ? getSteelRow(curKind, spec)
    : (STEEL[curKind] || []).find(function(r) { return r[0] === spec; });
  if (row) {
    document.getElementById('kgm').value = row[1];
  }
  updKg();
  buildInventoryDropdown();
  rebuildStkList();
}

// 在庫定尺リストを再構築
// ★ 現在選択中の鋼種・規格の定尺だけ表示（データタブと完全連動）
var _stkRenderKey = '';
function rebuildStkList() {
  var sl = document.getElementById('stkList');
  if (!sl) return;
  var specEl = document.getElementById('spec');
  var currentSpec = specEl ? specEl.value : '';
  var currentKey = (curKind || '') + '__' + currentSpec;
  var preserveCurrent = (_stkRenderKey === currentKey);
  var activeLens = (typeof getKindSTD === 'function')
    ? getKindSTD(curKind, currentSpec)
    : ((typeof getAvailableSTD === 'function') ? getAvailableSTD(curKind) : STD.slice());
  activeLens = (activeLens || []).slice().sort(function(a, b) { return a - b; });

  // 同一規格の再描画時だけ現在のチェック状態を保持する。
  // 鋼種切替や規格切替では前の状態を引きずらない。
  var prevChecked = {};
  var prevMax = {};
  if (preserveCurrent) {
    STD.forEach(function(len, i) {
      var cb = document.getElementById('sc' + i);
      var mx = document.getElementById('sm' + i);
      if (cb) prevChecked[len] = cb.checked;
      if (mx) prevMax[len] = mx.value;
    });
  }

  STD.length = 0;
  activeLens.forEach(function(l) { STD.push(l); });

  sl.innerHTML = '';
  STD.forEach(function(len, i) {
    var d = document.createElement('div');
    d.className = 'stk-row';
    d.id = 'sr' + i;
    d.style.cursor = 'pointer';
    var wasChecked = prevChecked.hasOwnProperty(len) ? prevChecked[len] : true;
    var maxValue = prevMax.hasOwnProperty(len) ? prevMax[len] : '';
    var maxAttr = String(maxValue).replace(/"/g, '&quot;');
    d.innerHTML =
      '<input type="checkbox" id="sc' + i + '"' + (wasChecked ? ' checked' : '') +
        ' onchange="togStk(' + i + ');saveSettings()">' +
      '<span class="stk-nm">' + len.toLocaleString() + '</span>' +
      '<div style="display:flex;align-items:center;gap:2px">' +
        '<button onclick="stkDown(' + i + ')" style="width:18px;height:18px;border:1px solid #d4d4dc;background:#fff;border-radius:4px;cursor:pointer;font-size:11px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0">▼</button>' +
        '<span id="sm_lbl' + i + '" onclick="stkEdit(' + i + ')" style="min-width:22px;text-align:center;font-size:11px;font-weight:600;color:#1a1a2e;cursor:pointer" title="クリックで直接入力">∞</span>' +
        '<input type="number" class="stk-mx" id="sm' + i + '" value="' + maxAttr + '" placeholder="∞" min="1" onchange="stkInputChange(' + i + ')" style="display:none;width:36px">' +
        '<button onclick="stkUp(' + i + ')" style="width:18px;height:18px;border:1px solid #d4d4dc;background:#fff;border-radius:4px;cursor:pointer;font-size:11px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0">▲</button>' +
      '</div>';
    d.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'number') return;
      if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') return;
      if (e.target.tagName === 'BUTTON') return;
      if (e.target.tagName === 'SPAN' && e.target.id && e.target.id.indexOf('sm_lbl') === 0) return;
      document.getElementById('sc' + i).click();
    });
    sl.appendChild(d);
    togStk(i);
    stkInputChange(i);
  });
  _stkRenderKey = currentKey;
}

function togStk(i) {
  var checked = document.getElementById('sc' + i).checked;
  document.getElementById('sr' + i).classList.toggle('off', !checked);
}

function updKg() {
  var kgm = parseFloat(document.getElementById('kgm').value) || 0;
  var tot = 0;
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    if (!lEl) continue;
    var l = parseFloat(lEl.value);
    var q = parseFloat(qEl.value);
    var el = document.getElementById('pk' + i);
    if (l > 0 && q > 0) {
      var kg = (l / 1000) * kgm * q;
      el.textContent = jisRoundKg(kg) + 'kg';
      tot += kg;
    } else {
      el.textContent = '—';
    }
  }
  document.getElementById('totkg').textContent = tot > 0 ? jisRoundKg(tot) + ' kg' : '—';
}

// ============================================================
// ★ コピペ入力機能
// ============================================================
function togglePaste() {
  var area = document.getElementById('pasteArea');
  area.classList.toggle('show');
  if (area.classList.contains('show')) {
    document.getElementById('pasteText').focus();
  }
}

function executePaste() {
  pushUndoManual();
  var text = document.getElementById('pasteText').value.trim();
  if (!text) { alert('データを貼り付けてください'); return; }

  var lines = text.split(/\r?\n/);
  var parsed = [];
  var errors = 0;

  lines.forEach(function(line) {
    line = line.trim();
    if (!line) return;
    // タブ区切り or 複数スペース or カンマ区切り
    var parts = line.split(/\t|,|　/).map(function(s){ return s.trim().replace(/[^0-9.]/g,''); });
    var len = parseFloat(parts[0]);
    var qty = parseFloat(parts[1]);
    if (len > 0 && qty > 0) {
      parsed.push([Math.round(len), Math.round(qty)]);
    } else {
      errors++;
    }
  });

  if (!parsed.length) {
    alert('有効なデータが見つかりません。\n形式: 長さ[TAB]数量（1行1部材）');
    return;
  }

  // 既存の入力をクリア
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    if (lEl) { lEl.value = ''; qEl.value = ''; document.getElementById('pk'+i).textContent = '—'; }
  }

  // 行が足りなければ追加
  while (totalRows < parsed.length) {
    addPartRow();
  }

  // データ入力
  parsed.forEach(function(v, i) {
    document.getElementById('pl' + i).value = v[0];
    document.getElementById('pq' + i).value = v[1];
  });

  updKg();
  togglePaste();
  document.getElementById('pasteText').value = '';

  var msg = parsed.length + '件のデータを入力しました';
  if (errors > 0) msg += '（' + errors + '行をスキップ）';
  // 簡易トースト
  showToast(msg);
}

function showToast(msg) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--br);color:var(--bk);font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em;padding:8px 18px;z-index:9999;animation:fi .2s ease';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2500);
}

function toggleSection(bodyId, btnId, color) {
  var body = document.getElementById(bodyId);
  var btn  = document.getElementById(btnId);
  if (!body || !btn) return;
  var opening = body.style.display === 'none';
  body.style.display = opening ? 'block' : 'none';
  btn.textContent = opening ? '－' : '＋';
  if (opening && bodyId === 'settingBody') {
    setTimeout(function() {
      var blade = document.getElementById('blade');
      if (blade) { blade.focus(); blade.select(); }
    }, 50);
  }
  if (opening && bodyId === 'jobBody') {
    setTimeout(function() {
      var jc = document.getElementById('jobClient');
      if (jc) { jc.focus(); jc.select(); }
    }, 50);
  }
}

function sbSwitch(n) {
  var panel1 = document.getElementById('sbPanel1');
  var panel2 = document.getElementById('sbPanel2');
  var tab1 = document.getElementById('sbTab1');
  var tab2 = document.getElementById('sbTab2');
  if (panel1) panel1.classList.toggle('active', n === 1);
  if (panel2) panel2.classList.toggle('active', n === 2);
  if (tab1) tab1.classList.toggle('active', n === 1);
  if (tab2) tab2.classList.toggle('active', n === 2);
}


// ── 在庫と手持ち残材を完全同期 ──

// 在庫と残材から同時削除

// ── 在庫ページ：フィルタ用種類セレクト構築 ──
function buildInvFilterKind() {
  var sel = document.getElementById('invFilterKind');
  if (!sel) return;
  var kinds = Object.keys(STEEL);
  sel.innerHTML = '<option value="">すべて</option>' +
    kinds.map(function(k){ return '<option value="'+k+'">'+k+'</option>'; }).join('');
  buildInvFilterSpec();
}

function buildInvFilterSpec() {
  var kindSel = document.getElementById('invFilterKind');
  var specSel = document.getElementById('invFilterSpec');
  if (!specSel) return;
  var kind = kindSel ? kindSel.value : '';
  var specs = kind && STEEL[kind] ? STEEL[kind].map(function(s){return s[0];}) : [];
  // 在庫にある規格も追加
  var inv = getInventory();
  inv.forEach(function(x){ if(x.spec && specs.indexOf(x.spec)<0) specs.push(x.spec); });
  specSel.innerHTML = '<option value="">すべて</option>' +
    specs.map(function(s){ return '<option value="'+s+'">'+s+'</option>'; }).join('');
  renderInventoryPage();
}

// ── 在庫ページ描画（フィルタ付き） ──

// ============================================================
// 在庫管理UI
// ============================================================
function buildInvAddKind() {
  var sel = document.getElementById('invAddKind');
  if (!sel) return;
  sel.innerHTML = '';
  Object.keys(STEEL).forEach(function(k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = k;
    if (k === curKind) o.selected = true;
    sel.appendChild(o);
  });
  buildInvAddSpec();
}

function buildInvAddSpec() {
  var kindSel = document.getElementById('invAddKind');
  var specSel = document.getElementById('invAddSpec');
  if (!kindSel || !specSel) return;
  var k = kindSel.value;
  specSel.innerHTML = '';
  (STEEL[k]||[]).forEach(function(row) {
    var o = document.createElement('option');
    o.value = o.textContent = row[0]; specSel.appendChild(o);
  });
}

function manualAddInventory() {
  var kind    = (document.getElementById('invAddKind')||{}).value||'';
  var spec    = (document.getElementById('invAddSpec')||{}).value||'';
  var len     = parseInt((document.getElementById('invAddLen')||{}).value)||0;
  var qty     = parseInt((document.getElementById('invAddQty')||{}).value)||1;
  var company = (document.getElementById('invAddCompany')||{}).value||'';
  var note    = (document.getElementById('invAddNote')||{}).value||'';
  if (!len || len <= 0) { alert('長さを入力してください'); return; }
  var inv = getInventory();
  for (var i=0; i<qty; i++) {
    inv.push({ id:Date.now()+i+Math.random(), len:len, spec:spec, kind:kind,
      company:company, note:note, addedDate:new Date().toLocaleDateString('ja-JP') });
  }
  saveInventory(inv);
  renderInventoryPage();
  syncInventoryToRemnants();
  updateInvDropdown();
  document.getElementById('invAddLen').value = '';
  document.getElementById('invAddQty').value = 1;
  if(document.getElementById('invAddCompany')) document.getElementById('invAddCompany').value='';
  if(document.getElementById('invAddNote')) document.getElementById('invAddNote').value='';
}

// 在庫→残材へボタン

// ── 規格選択時に在庫ドロップダウン更新 ──
function updateInvDropdown() {
  buildInventoryDropdown();
}

// ── 履歴ページ：規格ドロップダウンを自動構築 ──
function buildJobDatalist() {
  var hist = getCutHistory ? getCutHistory() : [];
  var clients = [], names = [];
  hist.forEach(function(h){
    if(h.client && clients.indexOf(h.client)<0) clients.push(h.client);
    if(h.name && names.indexOf(h.name)<0) names.push(h.name);
  });
  var clDl=document.getElementById('clientHistList');
  var nmDl=document.getElementById('nameHistList');
  if(clDl) clDl.innerHTML=clients.map(function(c){return '<option value="'+c+'">';}).join('');
  if(nmDl) nmDl.innerHTML=names.map(function(n){return '<option value="'+n+'">';}).join('');
}

function buildHistSpecDropdown() {
  var sel = document.getElementById('hsSt');
  if (!sel) return;
  sel.innerHTML = '<option value="">すべて</option>';
}

function historyHasKind(h, kind) {
  if (!kind || !h) return true;
  if (h.kind === kind) return true;
  if (h.project) {
    if (typeof h.project.kind === 'string' && h.project.kind.split('/').map(function(v){ return v.trim(); }).indexOf(kind) >= 0) {
      return true;
    }
    if (Array.isArray(h.project.sections)) {
      return h.project.sections.some(function(section) {
        return section && section.kind === kind;
      });
    }
  }
  return false;
}

// alias
function renderInventory() { renderInventoryPage(); }

// ── 履歴ページ描画 ──
var HIST_CARD_INLINE_STYLE = 'background:#ffffff;border:1px solid #d9dde6;border-radius:18px;padding:20px 18px;box-shadow:0 12px 28px rgba(17,17,17,.08);margin:0;';
var HIST_GROUP_INLINE_STYLE = 'background:#ffffff;border:1px solid #d9dde6;border-radius:18px;box-shadow:0 12px 28px rgba(17,17,17,.08);overflow:hidden;margin:0;';

function _renderHistRow(h) {
  var isWeight = h.type === 'weight';
  if (isWeight) {
    var w = h.weight || {};
    var kgStr = w.sumKg ? (Math.round(w.sumKg * 10) / 10).toLocaleString() + ' kg' : '—';
    var amtStr = w.sumAmt != null ? '概算 ' + Math.round(w.sumAmt).toLocaleString() + ' 円' : '';
    var rowCount = (w.rows || []).length;
    return '<div class="hist2-card hist2-card--weight" style="' + HIST_CARD_INLINE_STYLE + '" onclick="recallWeightHistory(' + h.id + ')">' +
      '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--weight">重量計算</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + (h.client || '顧客未設定') + '</span>' +
            (h.name ? '<span class="hist2-name">' + h.name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
          '<span class="hist2-chip">' + rowCount + '行</span>' +
          '<span class="hist2-chip hist2-chip--strong">' + kgStr + '</span>' +
          (amtStr ? '<span class="hist2-chip">' + amtStr + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hist2-side">' +
        '<span class="hist2-date">' + (h.dateLabel || '') + '</span>' +
        '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')">削除</button>' +
      '</div>' +
    '</div>';
  }
  if (h.type === 'cut_project' && h.project) {
    var sectionCount = (h.project.sections || []).length;
    return '<div class="hist2-card" style="' + HIST_CARD_INLINE_STYLE + '" onclick="showHistPreview(' + h.id + ')">' +
      '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--cut">作業指示</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + (h.client || '顧客未設定') + '</span>' +
            (h.name ? '<span class="hist2-name">' + h.name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
          '<span class="hist2-chip">鋼材: ' + sectionCount + '件</span>' +
          '<span class="hist2-chip">納期: ' + (h.deadline || '-') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="hist2-side">' +
        '<span class="hist2-date">' + (h.dateLabel || '') + '</span>' +
        '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')">削除</button>' +
      '</div>' +
    '</div>';
  }
  var remCount = h.result && h.result.remnants ? h.result.remnants.length : 0;
  return '<div class="hist2-card" style="' + HIST_CARD_INLINE_STYLE + '" onclick="showHistPreview(' + h.id + ')">' +
    '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--cut">取り合い</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + (h.client || '顧客未設定') + '</span>' +
            (h.name ? '<span class="hist2-name">' + h.name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
        '<span class="hist2-chip">納期: ' + (h.deadline || '-') + '</span>' +
        '<span class="hist2-chip">端材: ' + remCount + '本</span>' +
      '</div>' +
    '</div>' +
    '<div class="hist2-side">' +
      '<span class="hist2-date">' + (h.dateLabel || '') + '</span>' +
      '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')">削除</button>' +
    '</div>' +
  '</div>';
}

// 保存データから切断図を生成（DOM非依存版）

function printHistoryPreview() {
  var body = document.getElementById('histPreviewBody');
  if (!body) return;
  openPrintWindow(body.innerHTML);
}

function deleteCutHistory(id) {
  if (!confirm('この履歴を削除しますか？')) return;
  var hist = getCutHistory().filter(function(h){ return h.id!==id; });
  try { localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist)); } catch(e){}
  renderHistory();
}


// ── 端材優先切断（目標端材長さを考慮したストック選択） ──

function showRegisterRemnantsBtn(resultData) {
  var rems = extractRemnants(resultData);
  var existing = document.getElementById('regRemBtn');
  if (existing) existing.remove();
  if (!rems.length) return;
  var minLen = parseInt((document.getElementById('minRemnantLen')||{}).value)||500;
  var validRems = rems.filter(function(r){ return r.len >= minLen; });
  if (!validRems.length) return;
  var btn = document.createElement('div');
  btn.id = 'regRemBtn';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1000;display:flex;flex-direction:column;gap:8px;align-items:flex-end';
  btn.innerHTML =
    '<button onclick="doRegisterRemnants()" style="background:var(--cy);color:#000;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(34,211,238,.35);white-space:nowrap">' +
    '🗄 端材 '+validRems.length+'本を在庫登録</button>';
  btn._rems = validRems;
  document.body.appendChild(btn);
}

function doRegisterRemnants() {
  var btn = document.getElementById('regRemBtn');
  if (!btn || !btn._rems) return;
  registerRemnants(btn._rems);
  btn.remove();
  var n = btn._rems.length;
  // トースト通知
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1001;background:var(--gn);color:#000;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;box-shadow:0 4px 16px rgba(74,222,128,.35);transition:opacity .5s';
  toast.textContent = '✅ 端材'+n+'本を在庫に登録しました';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.style.opacity='0'; setTimeout(function(){toast.remove();},500); }, 2500);
}

// ============================================================
// 描画
// ============================================================

function patRows(bars) {
  return groupBars(bars).map(function(g) {
    // 同じ長さをまとめて「900 × 2」形式で表示
    var pieceCounts = {};
    g.pat.forEach(function(p){ pieceCounts[p] = (pieceCounts[p]||0)+1; });
    var sortedPieces = Object.keys(pieceCounts).map(Number).sort(function(a,b){return b-a;});
    var pieceStr = sortedPieces.map(function(len){
      var n = pieceCounts[len];
      return len.toLocaleString() + (n > 1 ? ' × ' + n : '');
    }).join(' ＋ ');
    return '<div class="pc-row">' +
      '<span class="px">×' + g.cnt + '</span>' +
      '<span class="pp">' + pieceStr + '</span>' +
      '' +
      '</div>';
  }).join('');
}

// ★ 切断図（バービジュアライザー）を生成

// ============================================================
// render: 結果エリアをクリアして各セクションを組み立て
// ============================================================
function render(single, top3, chgPlans, endLoss, remnantBars, kgm, allDP, origPieces, bundlePlan, patA, patB, patC, yieldCard1, yieldCard2) {
  var ph = document.getElementById('ph');
  if (ph) ph.style.display = 'none';
  var rp = document.getElementById('rp');
  while (rp.firstChild) rp.removeChild(rp.firstChild);
  var yieldBest = yieldCard1 || (allDP && allDP.length ? allDP[0] : null);
  var currentJob = typeof getJobInfo === 'function' ? getJobInfo() : {};

  // ── 作業指示書ヘッダー（印刷時のみ表示）──
  var blade2 = parseInt(document.getElementById('blade').value) || 3;
  var endLoss2 = parseInt(document.getElementById('endloss').value) || 75;
  var kgmVal = parseFloat(document.getElementById('kgm').value) || 0;
  var specVal = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var jobDate = new Date().toLocaleDateString('ja-JP', {year:'numeric',month:'2-digit',day:'2-digit'});

  // 部材リスト収集
  var partRows = '';
  var totKg = 0;
  for (var pi=0; pi<totalRows; pi++) {
    var lEl=document.getElementById('pl'+pi), qEl=document.getElementById('pq'+pi);
    if (!lEl) continue;
    var l=parseInt(lEl.value), q=parseInt(qEl.value);
    if (l>0 && q>0) {
      var kg = (l/1000)*kgmVal*q;
      totKg += kg;
      partRows += '<tr><td style="text-align:center">'+(partRows.split('<tr>').length)+'</td><td>'+l.toLocaleString()+' mm</td><td style="text-align:center">'+q+'</td></tr>';
    }
  }

  var jobHeader = mk('div','print-job-header');
  jobHeader.innerHTML =
    '<div class="job-title">✂ 鋼材切断作業指示書</div>' +
    '<div class="job-meta">' +
      '<span>発行日：'+jobDate+'</span>' +
      '<span>鋼材規格：'+specVal+'</span>' +
      '<span>刃厚：'+blade2+'mm</span>' +
      '<span>端部ロス（両側合計）：'+endLoss2+'mm</span>' +
      '' +
    '</div>' +
    '<table>' +
      '<thead><tr><th>#</th><th>長さ</th><th>本数</th></tr></thead>' +
      '<tbody>' + partRows + '</tbody>' +
      '' +
    '</table>';
  jobHeader.style.display = 'none'; // 画面では非表示
  rp.appendChild(jobHeader); // 作業指示書は印刷時のみ（CSSで制御）

  // ★ 残材消費結果を表示
  // 残材カード: 組み合わせ最適化の前に統合表示
  // (remnantBarsは後続の組み合わせカードと統合して表示)

  // ── 残材のみモード ──
  if (remnantBars && remnantBars.length && !yieldBest && (!allDP || !allDP.length)) {
    var remOnlySec = mk('div', 'an');
    var remOnlyDiag = '';
    var rgo = {};
    remnantBars.forEach(function(rb){ var k=rb.sl; if(!rgo[k]) rgo[k]=[]; rgo[k].push(rb); });
    sortStockLengthsForDisplay(Object.keys(rgo).map(Number)).forEach(function(sl){
      remOnlyDiag += buildCutDiagram(rgo[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm');
    });
    // 端材リスト（残材の loss > 0 のもの）
    var minVL = parseInt(document.getElementById('minRemnantLen') ? document.getElementById('minRemnantLen').value : 500) || 500;
    var remEndCounted = {};
    remnantBars.forEach(function(rb){ if(rb.loss >= minVL && rb.loss > 0){ remEndCounted[rb.loss]=(remEndCounted[rb.loss]||0)+1; } });
    var remEndHtml = Object.keys(remEndCounted).length
      ? Object.keys(remEndCounted).map(Number).sort(function(a,b){return b-a;}).map(function(l){
          var n=remEndCounted[l];
          return '<span class="rem-pill-item">'+l.toLocaleString()+'mm'+(n>1?' <b>×'+n+'</b>':'')+'</span>';
        }).join('')
      : '<span style="font-size:11px;color:#8888a8">なし</span>';

    var remOnlyCardId = 'card_remonly_' + Date.now();
    rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
      customer: currentJob.client,
      projectName: currentJob.name,
      deadline: currentJob.deadline,
      memo: currentJob.memo
    }));
    remOnlySec.innerHTML =
      '<div class="res-hd"><div class="res-ttl">手持ち残材リスト</div></div>' +
      '<div class="cc yield-card r1" id="' + remOnlyCardId + '">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:var(--cy)">残材活用</div>' +
          '<div class="cc-stats">' +
            '<div class="cs"><div class="cl">残材本数</div><div class="cv">' + remnantBars.length + ' 本</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(remOnlyCardId, true) + '</div>' +
        '</div>' +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + remEndHtml + '</div>' +
        '</div>' +
        remOnlyDiag +
      '</div>';
    rp.appendChild(remOnlySec);
    updateCartBadge();
    return;
  }

  // ── 歩留まり最大プラン ──
  if (yieldBest) {
    var yieldSec = mk('div', 'an');
    // No.1：歩留まり最大、No.2：カット数考慮型（存在する場合のみ）
    var yieldCards = [yieldCard1].filter(Boolean);
    if (yieldCards.length) {
      rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
        customer: currentJob.client,
        projectName: currentJob.name,
        deadline: currentJob.deadline,
        memo: currentJob.memo
      }));
    }
    var yieldCardHtmls = yieldCards.map(function(yb, yi) {
      // bars を定尺ごとにグループ化（BnB混在定尺対応）
      var allBarsY = yb.bars || yb.bA || [];
      var slGroupsY = {};
      allBarsY.forEach(function(b){
        var sl = b.sl || yb.slA;
        if (!slGroupsY[sl]) slGroupsY[sl] = [];
        slGroupsY[sl].push(b);
      });
      // solver が既に残材を bars に含めているか判定（BUG-FIX 2026-04）
      var hasRemnantBarsInYield = allBarsY.some(function(bar) {
        var sl = (bar && bar.sl) || yb.slA || 0;
        return sl && typeof isStdStockLength === 'function' && !isStdStockLength(sl);
      });
      // solver が残材を含んでいない場合のみ、別管理の remnantBars を表示用にマージ
      var effectiveRemnantBars = (remnantBars && remnantBars.length && !hasRemnantBarsInYield) ? remnantBars : [];
      if (effectiveRemnantBars.length) {
        effectiveRemnantBars.forEach(function(rb) {
          var sl = rb.sl;
          if (!sl) return;
          if (!slGroupsY[sl]) slGroupsY[sl] = [];
          slGroupsY[sl].push(rb);
        });
      }
      var sortedSlsY = sortStockLengthsForDisplay(Object.keys(slGroupsY).map(Number));
      var ySummaryText = sortedSlsY.map(function(sl) {
        return sl.toLocaleString() + 'mm × ' + slGroupsY[sl].length;
      }).join(' + ');
      var yPatHtml = '';
      sortedSlsY.forEach(function(sl, si){
        var barsInSl = slGroupsY[sl];
        var cls = si === 0 ? 'pc best' : 'pc';
        yPatHtml += '<div class="' + cls + '"><div class="pc-hd"><span>' +
          sl.toLocaleString() + 'mm × ' + barsInSl.length + '</span></div>' +
          patRows(barsInSl) + '</div>';
      });
      // 切断図：残材と定尺は別ルートで描画（二重描画防止 BUG-FIX 2026-04）
      var yDiag2 = '';
      if (effectiveRemnantBars.length) {
        var rgy2 = {};
        effectiveRemnantBars.forEach(function(rb){ var k=rb.sl; if(!rgy2[k]) rgy2[k]=[]; rgy2[k].push(rb); });
        sortStockLengthsForDisplay(Object.keys(rgy2).map(Number)).forEach(function(sl){ yDiag2 += buildCutDiagram(rgy2[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm'); });
      }
      sortedSlsY.forEach(function(sl){
        // 残材は上の block で出しているのでスキップ（二重描画防止）
        if (typeof isStdStockLength === 'function' && !isStdStockLength(sl)) return;
        yDiag2 += buildCutDiagram(slGroupsY[sl], sl, sl.toLocaleString() + 'mm 定尺');
      });
      var yCardId2 = 'card_yield_' + yi;
      var yDetailId2 = 'detail_yield_' + yi;

      var yieldRemHtml = effectiveRemnantBars.length
        ? buildRemHtmlFromRemnants(extractRemnantsFromBars(effectiveRemnantBars))
        : '<span style="font-size:11px;color:#8888a8">なし</span>';

      // 残材分を加算した集計値（BUG-FIX 2026-04）
      var remUsable = effectiveRemnantBars.reduce(function(s, b){ return s + (b.sl || 0); }, 0);
      var remPieceLen = effectiveRemnantBars.reduce(function(s, b){
        return s + ((b.pat || []).reduce(function(a, p){ return a + p; }, 0));
      }, 0);

      // 歩留まりも残材を分母に含めて再計算
      var stockUsable = allBarsY.reduce(function(s, b){ return s + (b.sl || yb.slA || 0); }, 0);
      var stockPieceLen = allBarsY.reduce(function(s, b){
        return s + ((b.pat || []).reduce(function(a, p){ return a + p; }, 0));
      }, 0);
      var totalUsable = stockUsable + remUsable;
      var totalPieceLen = stockPieceLen + remPieceLen;
      var yld2 = totalUsable > 0 ? ((totalPieceLen / totalUsable) * 100).toFixed(1) : (100 - yb.lossRate).toFixed(1);

      return '<div class="cc" id="' + yCardId2 + '" style="border:1.5px solid #d4d4dc">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:#1a1a2e">' + ySummaryText +
            (effectiveRemnantBars.length ? '<span style="margin-left:8px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(34,211,238,.18);border:1px solid var(--cy);color:var(--cy);vertical-align:middle">残材消費</span>' : '') +
          '</div>' +
          '<div class="cc-stats" style="margin-left:auto">' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + yld2 + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + (yb.chg || '—') + ' 回</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(yCardId2, true) + '</div>' +
        '</div>' +
        yDiag2 +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + yieldRemHtml + '</div>' +
        '</div>' +
        '<button class="detail-toggle" type="button" onclick="toggleCardDetail(\'' + yDetailId2 + '\',this)">詳細を表示 ▼</button>' +
        '<div class="cc-detail-body" id="' + yDetailId2 + '">' +
          '<div class="cc-pat"><div class="pgrid">' + yPatHtml + '</div></div>' +
        '</div>' +
      '</div>';
    }).join('');

    var yieldSec = mk('div', 'an');
    yieldSec.innerHTML =
      '<div class="res-hd">' +
        '<div class="res-ttl">歩留まり最大</div>' +
      '</div>' +
      '<div class="clist">' + yieldCardHtmls + '</div>';
    rp.appendChild(yieldSec);
  }

  // ── 3パターン取り合い ──
  var patterns = [patA, patB].filter(Boolean); // patCは廃止
  if (patterns.length) {
    var PAT_CFG = {
      'A':   { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'90%以上' },
      'B90': { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'80%以上' },
      'B80': { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'80%以上' },
      'C':   { color:'#1a1a2e', bg:'', icon:'', name:'バランス型', sub:'' }
    };

    // パターンBを展開、重複排除しながらdisplayPatsを構築
    var displayPats = [];
    var seenPatKey = {};

    function patKey(p) {
      if (!p || !p.bars) return '';
      // ユニークパターン（同一バー構成）だけでキー生成 → 順序・本数の違いを吸収
      var uniq = {};
      p.bars.forEach(function(b){
        var k = (b.sl||0)+':'+b.pat.slice().sort(function(a,b){return b-a;}).join(',');
        uniq[k] = (uniq[k]||0)+1;
      });
      return Object.keys(uniq).sort().map(function(k){return k+'x'+uniq[k];}).join('|');
    }

    patterns.forEach(function(p) {
      if (p.label === 'B') {
        // plan90があれば表示
        if (p.plan90) {
          var k90 = patKey(p.plan90);
          if (!seenPatKey[k90]) {
            seenPatKey[k90] = true;
            displayPats.push({ label:'B90', name:'Pattern B', bars:p.plan90.bars, sl:p.plan90.sl, metrics:p.plan90.metrics });
          }
        }
        // plan80があれば表示（plan90と重複しない場合）
        if (p.plan80) {
          var k80 = patKey(p.plan80);
          if (k80 && !seenPatKey[k80]) {
            seenPatKey[k80] = true;
            displayPats.push({ label:'B80', name:'Pattern B', bars:p.plan80.bars, sl:p.plan80.sl, metrics:p.plan80.metrics });
          }
        }
      } else {
        var kp = patKey(p);
        if (!seenPatKey[kp]) {
          seenPatKey[kp] = true;
          displayPats.push(p);
        }
      }
    });

    if (!yieldBest && displayPats.length) {
      rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
        customer: currentJob.client,
        projectName: currentJob.name,
        deadline: currentJob.deadline,
        memo: currentJob.memo
      }));
    }

    function buildPatCard(pat) {
      var cfg = PAT_CFG[pat.label] || { color:'var(--g2)', bg:'', icon:'', sub:'' };
      // 実際の歩留まり率で sub ラベルを上書き
      if (pat.metrics && pat.metrics.yieldPct !== undefined) {
        var _yp = pat.metrics.yieldPct;
        cfg = Object.assign({}, cfg, {
          sub: _yp >= 90 ? '90%以上' : _yp >= 80 ? '80%以上' : _yp.toFixed(1) + '%'
        });
      }
      // 実際の歩留まり率で sub を動的に設定
      if (pat.metrics && pat.metrics.yieldPct !== undefined) {
        var yPct = pat.metrics.yieldPct;
        if (yPct >= 90) cfg = Object.assign({}, cfg, {sub:'90%以上'});
        else if (yPct >= 80) cfg = Object.assign({}, cfg, {sub:'80%以上'});
        else cfg = Object.assign({}, cfg, {sub: yPct.toFixed(1)+'%'});
      }
      var m = pat.metrics;
      var isRec = pat.label === 'C';
      var detailId = 'detail_pat_' + pat.label + '_' + Date.now();

      // 切断図（定尺別グループ、同一パターン数の多い順）
      var diagHtml = '';
      if (pat.bars && pat.bars.length) {
        var slGroups = {};
        pat.bars.forEach(function(b) {
          var key = b.sl || pat.sl;
          if (!slGroups[key]) slGroups[key] = [];
          slGroups[key].push(b);
        });
        // 各定尺グループ内でbarsを同一パターン数の多い順にソート
        // groupBarsで同一パターンをまとめ、cnt降順でbuildCutDiagramに渡す
        sortStockLengthsForDisplay(Object.keys(slGroups).map(Number)).forEach(function(sl) {
          var barsInSl = slGroups[sl];
          // 同一パターン数が多い順にソート
          var grouped = groupBars(barsInSl);
          grouped.sort(function(a,b){return b.cnt - a.cnt;});
          // cntの多い順にbarsを再構築
          var sortedBars = [];
          grouped.forEach(function(g){
            for(var gi=0;gi<g.cnt;gi++) sortedBars.push({pat:g.pat, loss:g.loss});
          });
          diagHtml += buildCutDiagram(sortedBars, parseInt(sl), parseInt(sl).toLocaleString() + 'mm 定尺');
        });
      }

      // 端材リスト（minRemnantLen以上のみ・同じ長さをまとめてx表示）
      var minRemnantLen = parseInt((document.getElementById('minRemnantLen')||{}).value) || 500;
      var remRaw = (pat.bars||[]).filter(function(b){ return b.loss >= minRemnantLen && b.loss > 0; })
        .map(function(b){ return b.loss; }).sort(function(a,b){return b-a;});
      var remCounted = {};
      remRaw.forEach(function(l){ remCounted[l] = (remCounted[l]||0)+1; });
      var remHtml = remRaw.length
        ? Object.keys(remCounted).map(Number).sort(function(a,b){return b-a;}).map(function(l){
            var n = remCounted[l];
            return '<span class="rem-pill-item">' + l.toLocaleString() + 'mm' + (n>1?' <b>×'+n+'</b>':'') + '</span>';
          }).join('')
        : '<span style="font-size:11px;color:#8888a8">なし（' + minRemnantLen.toLocaleString() + 'mm未満除外）</span>';

      // パターン詳細（定尺別）
      var slGroupsCard = {};
      (pat.bars||[]).forEach(function(b) {
        var key = b.sl || pat.sl;
        if (!slGroupsCard[key]) slGroupsCard[key] = [];
        slGroupsCard[key].push(b);
      });
      var patDetailHtml = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl) {
        var barsInSl = slGroupsCard[sl];
        var grouped2 = groupBars(barsInSl);
        var rowsHtml = grouped2.map(function(g){
          var pc = {};
          g.pat.forEach(function(p){ pc[p]=(pc[p]||0)+1; });
          var ps = Object.keys(pc).map(Number).sort(function(a,b){return b-a;});
          var pieceStr = ps.map(function(l){ return l.toLocaleString()+(pc[l]>1?' × '+pc[l]:''); }).join(' ＋ ');
          return '<div class="pc-row"><span class="px">×' + g.cnt + '</span><span class="pp">' + pieceStr + '</span></div>';
        }).join('');
        return '<div class="pc best" style="margin-bottom:4px"><div class="pc-hd"><span>' + parseInt(sl).toLocaleString() + 'mm × ' + barsInSl.length + '本</span></div>' + rowsHtml + '</div>';
      }).join('');

      var cardId2 = 'card_pat_' + pat.label + '_' + Date.now();
      // 定尺別本数サマリー（印刷用）
      var slSummary = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl){
        return parseInt(sl).toLocaleString() + 'mm × ' + slGroupsCard[sl].length + '本';
      }).join('　＋　');
      // 定尺別本数サマリー
      var slSummary = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl){
        return parseInt(sl).toLocaleString() + 'mm × ' + slGroupsCard[sl].length;
      }).join(' + ');
      return '<div class="cc" id="' + cardId2 + '" style="border:1.5px solid #d4d4dc">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:#1a1a2e">' + slSummary +
            (cfg.sub ? '<span style="margin-left:8px;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;background:#f0f0f4;color:#5a5a78;vertical-align:middle">' + cfg.sub + '</span>' : '') +
            (remnantBars && remnantBars.length ? '<span style="margin-left:6px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(34,211,238,.18);border:1px solid var(--cy);color:var(--cy);vertical-align:middle">残材消費</span>' : '') +
          '</div>' +
          '<div class="cc-stats" style="margin-left:auto">' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + m.yieldPct.toFixed(1) + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + m.totalCuts + ' 回</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(cardId2, true) + '</div>' +
        '</div>' +
        diagHtml +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + remHtml + '</div>' +
        '</div>' +
        '<button class="detail-toggle" type="button" onclick="toggleCardDetail(\'' + detailId + '\',this)">詳細を表示 ▼</button>' +
        '<div class="cc-detail-body" id="' + detailId + '">' +
          '<div class="cc-pat"><div class="pgrid">' + patDetailHtml + '</div></div>' +
        '</div>' +
      '</div>';
    }

    var patGrid = displayPats.map(buildPatCard).join('');

    var patSec = mk('div', 'an');
    patSec.innerHTML =
      '<div class="res-hd" style="margin-bottom:12px">' +
        '<div class="res-ttl">取り合いパターン比較</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' + patGrid + '</div>';
    rp.appendChild(patSec);
  }
  updateCartBadge();
}

function toggleDiag(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '✂ 切断図を表示 ▼' : '✂ 切断図を閉じる ▲';
  btn.classList.toggle('open', !open);
}

function resetCalcResultPlaceholder() {
  var rp = document.getElementById('rp');
  if (!rp) return;
  while (rp.firstChild) rp.removeChild(rp.firstChild);
  var ph = document.createElement('div');
  ph.className = 'ph';
  ph.id = 'ph';
  ph.innerHTML =
    '<p>設定・部材を入力して「計算を実行する」を押してください</p>' +
    '<small>刃厚・端部ロス・鋼材規格・定尺を確認してから実行</small>';
  rp.appendChild(ph);
}


function clearParts() {
  if (!confirm('リストをクリアしますか？\n設定もリセットされます。')) return;
  pushUndoManual();

  try { localStorage.removeItem(LS_SETTINGS); } catch(e) {}
  try { localStorage.removeItem(LS_REMNANTS); } catch(e) {}
  try { localStorage.removeItem(INVENTORY_REMNANT_SELECTED_KEY); } catch(e) {}

  var bladeEl = document.getElementById('blade');
  var endLossEl = document.getElementById('endloss');
  var minRemnantLenEl = document.getElementById('minRemnantLen');
  var jobClientEl = document.getElementById('jobClient');
  var jobNameEl = document.getElementById('jobName');
  var jobDeadlineEl = document.getElementById('jobDeadline');
  var jobWorkerEl = document.getElementById('jobWorker');
  var useKuikuEl = document.getElementById('useKuiku');
  var pasteAreaEl = document.getElementById('pasteArea');
  var pasteTextEl = document.getElementById('pasteText');
  var cmdInputEl = document.getElementById('cmdInput');
  var cmdKgmEl = document.getElementById('cmdKgm');

  if (bladeEl) bladeEl.value = '3';
  if (endLossEl) endLossEl.value = '150';
  if (minRemnantLenEl) minRemnantLenEl.value = '500';
  if (jobClientEl) jobClientEl.value = '';
  if (jobNameEl) jobNameEl.value = '';
  if (jobDeadlineEl) jobDeadlineEl.value = '';
  if (jobWorkerEl) jobWorkerEl.value = '';
  if (useKuikuEl) useKuikuEl.checked = false;
  toggleKuiku();
  if (pasteAreaEl) pasteAreaEl.classList.remove('show');
  if (pasteTextEl) pasteTextEl.value = '';
  if (cmdInputEl) cmdInputEl.value = '';
  if (cmdKgmEl) cmdKgmEl.textContent = '';

  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    var zEl = document.getElementById('pz' + i);
    var kEl = document.getElementById('pk' + i);
    if (lEl) lEl.value = '';
    if (qEl) qEl.value = '';
    if (zEl) zEl.value = '';
    if (kEl) kEl.textContent = '—';
  }
  document.getElementById('totkg').textContent = '—';

  var firstKind = Object.keys(STEEL)[0];
  if (firstKind && STEEL[firstKind] && STEEL[firstKind][0]) {
    cmdSelect({ kind: firstKind, spec: STEEL[firstKind][0][0], kgm: STEEL[firstKind][0][1] });
  } else {
    updKg();
  }
  syncInventoryToRemnants();
  resetCalcResultPlaceholder();
}

// ── 更新履歴 ──────────────────────────────────────────────
// 新しいバージョンを出すときは、この配列の先頭に追記するだけ。
// date は YYYY-MM-DD、changes は 1 行 1 項目で短く。
var TORIAI_CHANGELOG = [
  {
    version: 'v1.0.2',
    date: '2026-04-21',
    changes: [
      '取り合い中心の使い方オンボーディングを追加し、更新後に全ユーザーへ自動表示',
      '鋼材種類・規格選択、長さ・数量入力、Ctrl+Enter 実行、最適母材数とカット候補の見方を案内',
      '重量計算・データ・履歴在庫タブの役割も簡易ガイドに追記'
    ]
  },
  {
    version: 'v1.0.1',
    date: '2026-04-21',
    changes: [
      '取り合いタブ 入力エリアを縦一列に刷新、詳細設定は右下の歯車ボタンからポップアップ表示',
      '部材リストのデフォルトを15行に拡張、01〜15のゼロパディング表示',
      '重量タブ 明細UIを刷新（ブレッドクラム・CSV出力／重量計算書ボタン・合計金額行）',
      '重量タブ 重量計算書の印刷時に未選択カラムを出力しないよう修正',
      '計算を実行する／＋リストに追加／メモ送信／お問い合わせ送信 ボタンをデフォルト黒・ホバー薄紫に統一'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-04-19',
    changes: [
      '正式リリース',
      '残材消費時の計算バグ（母材重量・歩留まり・切断図の二重描画）を修正',
      'ダークモード・未実装機能（カーボンフットプリント計算／印刷時在庫登録しない／使い方ガイド）を整理',
      'ハンバーガーメニューからバージョンクリックで更新履歴を表示',
      '計算実行ボタンの文字化けを修正'
    ]
  }
];
var TORIAI_ONBOARDING_KEY = 'toriai_calc_onboarding_seen_version';
var TORIAI_ONBOARDING_VERSION = TORIAI_CHANGELOG[0].version;
var _calcOnboardingPage = 0;
var _calcOnboardingCompleted = false;
var _calcOnboardingForced = false;
var _calcOnboardingTotal = 5;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function renderChangelog() {
  var body = document.getElementById('changelogBody');
  if (!body) return;
  body.innerHTML = TORIAI_CHANGELOG.map(function(entry, idx) {
    var items = entry.changes.map(function(c){
      return '<li>' + escapeHtml(c) + '</li>';
    }).join('');
    return '<section class="changelog-entry' + (idx === 0 ? ' is-latest' : '') + '">' +
      '<div class="changelog-entry-head">' +
        '<span class="changelog-ver">' + escapeHtml(entry.version) + '</span>' +
        '<span class="changelog-date">' + escapeHtml(entry.date) + '</span>' +
      '</div>' +
      '<ul class="changelog-list">' + items + '</ul>' +
    '</section>';
  }).join('');
}

function openChangelog() {
  renderChangelog();
  var modal = document.getElementById('changelogModal');
  if (modal) modal.classList.add('show');
  closeHeaderMenu();
}

function closeChangelog() {
  var modal = document.getElementById('changelogModal');
  if (modal) modal.classList.remove('show');
}

function hasSeenCalcOnboarding() {
  try {
    return (localStorage.getItem(TORIAI_ONBOARDING_KEY) || '') === TORIAI_ONBOARDING_VERSION;
  } catch (e) {
    return false;
  }
}

function markCalcOnboardingSeen() {
  try {
    localStorage.setItem(TORIAI_ONBOARDING_KEY, TORIAI_ONBOARDING_VERSION);
  } catch (e) {}
}

function renderCalcOnboarding() {
  var pages = document.querySelectorAll('#calcOnboardingModal .onboarding-page');
  var actions = document.getElementById('onboardingActions');
  Array.prototype.forEach.call(pages, function(page, idx) {
    page.classList.toggle('is-active', idx === _calcOnboardingPage);
  });
  if (actions) actions.classList.toggle('is-complete', _calcOnboardingPage === _calcOnboardingTotal - 1);
}

function openCalcOnboarding(forceLocked) {
  var modal = document.getElementById('calcOnboardingModal');
  if (!modal) return;
  _calcOnboardingPage = 0;
  _calcOnboardingCompleted = hasSeenCalcOnboarding();
  _calcOnboardingForced = !!forceLocked && !_calcOnboardingCompleted;
  renderCalcOnboarding();
  modal.classList.add('show');
  closeHeaderMenu();
}

function closeCalcOnboarding() {
  if (_calcOnboardingForced && !_calcOnboardingCompleted) return;
  var modal = document.getElementById('calcOnboardingModal');
  if (modal) modal.classList.remove('show');
}

function moveCalcOnboarding(step) {
  var next = _calcOnboardingPage + step;
  if (next < 0) next = 0;
  if (next > _calcOnboardingTotal - 1) next = _calcOnboardingTotal - 1;
  if (next === _calcOnboardingPage) return;
  _calcOnboardingPage = next;
  if (_calcOnboardingPage === _calcOnboardingTotal - 1 && !_calcOnboardingCompleted) {
    _calcOnboardingCompleted = true;
    _calcOnboardingForced = false;
    markCalcOnboardingSeen();
  }
  renderCalcOnboarding();
}

function startCalcFromOnboarding() {
  closeCalcOnboarding();
  goPage('c');
}

function showCalcOnboardingIfNeeded() {
  if (hasSeenCalcOnboarding()) return;
  setTimeout(function() {
    openCalcOnboarding(true);
  }, 280);
}

function toggleHeaderMenu() {
  var btn = document.getElementById('hamBtn');
  var menu = document.getElementById('hamMenu');
  var overlay = document.getElementById('ddOverlay');
  if (!btn || !menu || !overlay) return;
  var open = !menu.classList.contains('show');
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menu.classList.toggle('show', open);
  overlay.classList.toggle('show', open);
}

function closeHeaderMenu() {
  var btn = document.getElementById('hamBtn');
  var menu = document.getElementById('hamMenu');
  var overlay = document.getElementById('ddOverlay');
  if (btn) {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (menu) menu.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

document.addEventListener('keydown', function(e) {
  var onboardingOpen = document.getElementById('calcOnboardingModal') &&
    document.getElementById('calcOnboardingModal').classList.contains('show');
  if (e.key === 'Escape') { closeHeaderMenu(); closeChangelog(); closeCalcOnboarding(); }
  if (onboardingOpen && e.key === 'ArrowRight') {
    e.preventDefault();
    moveCalcOnboarding(1);
  }
  if (onboardingOpen && e.key === 'ArrowLeft') {
    e.preventDefault();
    moveCalcOnboarding(-1);
  }
});

// ── 初期化 ──────────────────────────────────────────────

// ══════════════════════════════════════════════════════
// 🛒 カート機能
// ══════════════════════════════════════════════════════

/** カートバッジを更新 */

/** カードの情報を収集してカートに追加 */

/** カートモーダルを開く */
function openCartModal() {
  renderCartModal();
  document.getElementById('cartModal').style.display = 'block';
}

/** カートモーダルを閉じる */
function closeCartModal() {
  document.getElementById('cartModal').style.display = 'none';
}

/** カートモーダルの中身を描画 */
function renderCartModal() {
  var cart = getCart();
  var body = document.getElementById('cartModalBody');
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = '<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">' +
      'カートは空です。各カードの「＋」を押してください。</div>';
    return;
  }

  body.innerHTML = cart.map(function(item) {
    var d = item.data;
    return '<div class="cart-item">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:2px">' +
          (d.isYield ? '歩留まり最大' : '取り合いパターン') +
          ' — ' + d.title +
        '</div>' +
        '<div style="font-size:11px;color:#8888a8">' +
          d.spec + '　' + (d.job.client || '') + '　' + (d.job.name || '') +
        '</div>' +
      '</div>' +
      '<button class="cart-item-del" onclick="cartRemoveItem(\'' + item.id + '\')">✕ 削除</button>' +
    '</div>';
  }).join('');
}

/** カートからアイテムを削除 */
function cartRemoveItem(id) {
  removeFromCart(id);
  updateCartBadge();
  renderCartModal();
  // 対応するボタンを元に戻す
  var cart_item = getCart(); // 削除後
  // 対応するaddボタンを探してリセット
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    var cardId = btn.id.replace('add_', '');
    var stillInCart = getCart().some(function(x){ return x.data.cardId === cardId; });
    if (!stillInCart) {
      btn.textContent = '＋';
      btn.classList.remove('added');
      btn.disabled = false;
    }
  });
}

/** カートを全クリア */
function cartClearAll() {
  if (!confirm('カートを全クリアしますか？')) return;
  clearCart();
  updateCartBadge();
  renderCartModal();
  // 全addボタンをリセット
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    btn.textContent = '＋';
    btn.classList.remove('added');
    btn.disabled = false;
  });
  closeCartModal();
}

/** カート内容をまとめて印刷 */

/** カートの内容で作業指示書を印刷 */

// ── 共通印刷ヘルパー（cartDoPrint / showHistPreview 共用）──────────────

var PRINT_CSS = [
  'body{font-family:sans-serif;padding:14px;background:#fff;color:#000;font-size:11px}',
  '@page{margin:8mm 10mm;size:A4 landscape}',
  '.ph-full{display:grid;grid-template-columns:1fr auto;gap:8px;padding-bottom:8px;border-bottom:2px solid #000;margin-bottom:12px;align-items:start}',
  '.ph-mini{display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 8px;background:#f0f0f0;border-left:3px solid #000;margin-bottom:10px;align-items:center;border-radius:0 4px 4px 0}',
  '.sec{border:1px solid #999;border-radius:6px;overflow:hidden;margin-bottom:8px;page-break-inside:avoid}',
  '.sec-hd{background:#e8e8e8;padding:5px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #999}',
  '.sec-body{display:grid;grid-template-columns:145px 1fr}',
  '.sec-left{padding:7px 10px;border-right:1px solid #ccc;font-size:10px}',
  '.sec-right{padding:7px 10px}',
  '.badge{background:#000;color:white;font-size:9px;font-weight:700;padding:1px 7px;border-radius:3px;flex-shrink:0}',
  '.cut-tbl{width:100%;border-collapse:collapse;font-size:11px}',
  '.cut-tbl th{padding:3px 4px;border-bottom:1.5px solid #000;font-weight:700;font-size:10px;text-align:left;background:#f0f0f0}',
  '.cut-tbl td{padding:3px 4px;border-bottom:1px solid #e8e8e8}',
  '.cut-tbl td.num{text-align:center;font-weight:700}',
  '.bar-block{margin-bottom:6px}',
  '.bar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}',
  '.bar-pat{font-size:10px;font-weight:700;color:#222;margin-bottom:3px}',
  '.bar-track{display:flex;height:30px;border:1.5px solid #555;border-radius:3px;overflow:hidden;background:#fff}',
  '.b-blade{width:1.5px;background:#555;flex-shrink:0}',
  '.b-end{flex-shrink:0;background:#d8d8d8}',
  '.b-piece{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;overflow:hidden;background:#d8d8d8;border-left:1px solid #555}',
  '.b-piece:first-of-type{border-left:none}',
  '.b-rem{background:repeating-linear-gradient(-45deg,#224488,#224488 2px,#c0d0ee 2px,#c0d0ee 6px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#002;font-weight:700;border-left:3px solid #224488}',
  '.b-loss{background:repeating-linear-gradient(-45deg,#ccc,#ccc 1px,#fff 1px,#fff 4px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#888;border-left:2px solid #aaa}',
  '.cnt-badge{background:#fff;color:#555;font-size:11px;font-weight:700;padding:2px 12px;border-radius:12px;letter-spacing:.04em;border:2px solid #555}',
  '.r-tag{font-size:9px;border:1px solid #bbb;padding:1px 5px;border-radius:3px;display:inline-block;margin:1px}',
  '.print-footer{display:flex;justify-content:space-between;font-size:9px;color:#888;margin-top:8px;padding-top:6px;border-top:1px solid #ddd}',
].join('\n');

/** フルヘッダーHTML生成 */

/** ミニヘッダーHTML生成（2枚目以降）*/

/**
 * 切断図バーHTML生成
 * @param {Array} bars - [{pat:[長さ,...], loss, sl}]
 * @param {number} sl - 定尺長さ
 * @param {number} endLoss - 端部ロス
 */

/**
 * セクションHTML生成（1鋼材分）
 * @param {number} secIdx - 番号（1始まり）
 * @param {Object} secData - {spec, kind, motherSummary, sumMap, remTags, bars, sl, endLoss}
 */
function buildPrintSection(secIdx, secData) {
  var html = '<div class="sec">';

  // セクションヘッダー
  html += '<div class="sec-hd">';
  html += '<span class="badge">' + secIdx + '</span>';
  if (secData.spec) html += '<span style="font-size:11px;font-weight:700">' + secData.spec + '</span>';
  if (secData.motherSummary) html += '<span style="font-size:10px;margin-left:4px;color:#333">' + secData.motherSummary + '</span>';
  html += '</div>';

  html += '<div class="sec-body">';

  // 左：切断リスト
  html += '<div class="sec-left">';
  html += '<div style="font-size:8px;font-weight:700;letter-spacing:.05em;margin-bottom:3px">切断リスト</div>';
  var sortedLens = sortStockLengthsForDisplay(Object.keys(secData.sumMap).map(Number));
  if (sortedLens.length) {
    html += '<table class="cut-tbl"><tbody>';
    sortedLens.forEach(function(len) {
      html += '<tr><td>' + len.toLocaleString() + ' mm</td><td class="num">' + secData.sumMap[len] + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  // 端材
  html += '<div style="margin-top:5px;padding-top:4px;border-top:1px solid #ddd">';
  html += '<div style="font-size:8px;color:#666;margin-bottom:2px">端材（500mm以上）</div>';
  if (secData.remTags && secData.remTags.length) {
    secData.remTags.forEach(function(t){ html += '<span class="r-tag">' + t + '</span>'; });
  } else {
    html += '<span style="font-size:9px;color:#aaa">なし</span>';
  }
  html += '</div>';
  html += '</div>'; // sec-left

  // 右：切断図
  html += '<div class="sec-right">';
  html += '<div style="font-size:8px;font-weight:700;margin-bottom:4px">&#9986; 切断図</div>';
  if (secData.bars && secData.bars.length) {
    html += buildPrintBarHtml(secData.bars, secData.sl, secData.endLoss || 150);
  } else if (secData.barHtml) {
    html += secData.barHtml;
  } else {
    html += '<div style="font-size:9px;color:#aaa">切断図を展開してからカートに追加してください</div>';
  }
  html += '</div>'; // sec-right
  html += '</div>'; // sec-body
  html += '</div>'; // sec
  return html;
}

/** 複数セクションを4件ごとにページ分割してHTML生成 */
function buildPrintPages(job, sections) {
  var SECS_PER_PAGE = 4;
  var totalPages = Math.ceil(sections.length / SECS_PER_PAGE);
  var html = '';

  for (var p = 0; p < totalPages; p++) {
    var pageNum = p + 1;
    var pageInfo = pageNum + ' / ' + totalPages;
    var secSlice = sections.slice(p * SECS_PER_PAGE, (p+1) * SECS_PER_PAGE);
    var isLast = (pageNum === totalPages);

    // ヘッダー
    if (p === 0) {
      html += buildPrintHeaderFull(job, pageInfo);
    } else {
      html += buildPrintHeaderMini(job, pageInfo);
    }

    // セクション
    secSlice.forEach(function(sec) {
      html += sec.customHtml || buildPrintSection(sec.idx, sec);
    });

    // フッター
    html += '<div class="print-footer">';
    html += '<span>全 ' + sections.length + ' 鋼材　' + (isLast ? '以上' : '/ ' + pageNum + '枚目') + '</span>';
    html += '<span></span>';
    html += '</div>';

    if (!isLast) html += '<div style="page-break-after:always"></div>';
  }
  return html;
}

/** 印刷ウィンドウを開いて印刷 */
function openOutputWindow(html, opts) {
  opts = opts || {};
  var title = opts.title || '作業指示書';
  var win = window.open('', '_blank', 'width=1050,height=750');
  if (!win) return null;
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
    '<style>' + PRINT_CSS + '</style></head>' +
    '<body>' + html + '</body></html>'
  );
  win.document.close();
  win.focus();
  if (opts.print) {
    if (opts.closeAfterPrint) {
      win.onafterprint = function() {
        try { win.close(); } catch (e) {}
      };
    }
    setTimeout(function(){ win.print(); }, 700);
  }
  return win;
}

function openPrintWindow(html) {
  openOutputWindow(html, { title: '作業指示書', print: true, closeAfterPrint: true });
}

// ── 初期化 ──────────────────────────────────────────────

/** 汎用Enterキー：次のinputへフォーカス移動 */
function enterNext(e, nextId) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var next = nextId ? document.getElementById(nextId) : null;
  if (next) { next.focus(); next.select(); }
}

/** 在庫定尺：直接入力・1未満で∞に戻す */

/** 在庫定尺：▲ 上限本数を増やす */
function stkUp(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var cur = parseInt(inp.value) || 0;
  var next = cur + 1;
  inp.value = next;
  lbl.textContent = next;
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}

/** 在庫定尺：▼ 上限本数を減らす（1のとき∞に戻す） */
function stkDown(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var cur = parseInt(inp.value) || 0;
  if (cur <= 1) {
    // ∞に戻す
    inp.value = '';
    lbl.textContent = '∞';
  } else {
    var next = cur - 1;
    inp.value = next;
    lbl.textContent = next;
  }
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}

/** 在庫定尺：ラベルクリックで直接入力モードに */
function stkEdit(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  lbl.style.display = 'none';
  inp.style.display = '';
  inp.focus();
  inp.select();
}

/** 在庫定尺：直接入力後にラベルに反映 */
function stkInputChange(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var v = parseInt(inp.value);
  if (!v || v < 1) {
    inp.value = '';
    lbl.textContent = '∞';
  } else {
    lbl.textContent = v;
  }
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}

var _lastRegisteredRemnantSignature = '';

function getInventoryForCurrentSpec() {
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var inv = getInventory().filter(function(item) {
    return item.kind === curKind && item.spec === spec;
  });
  var grouped = {};
  inv.forEach(function(item) {
    var key = [item.len, item.spec, item.kind, item.company || '', item.note || '', item.addedDate || ''].join('|');
    if (!grouped[key]) {
      grouped[key] = { len: item.len, spec: item.spec, kind: item.kind, qty: 0, date: item.addedDate || '', label: item.note || '', company: item.company || '', ids: [] };
    }
    grouped[key].qty += 1;
    grouped[key].ids.push(item.id);
  });
  return Object.values(grouped).sort(function(a, b) {
    return b.len - a.len || parseDateValue(b.date) - parseDateValue(a.date);
  });
}

function renderInventoryPage() {
  var cont = document.getElementById('invListCont');
  var empty = document.getElementById('invEmptyMsg');
  if (!cont) return;
  var kindF = ((document.getElementById('invFilterKind') || {}).value || '');
  var specF = ((document.getElementById('invFilterSpec') || {}).value || '');
  var keyword = (((document.getElementById('invKeyword') || {}).value) || '').toLowerCase();
  var dateFrom = ((document.getElementById('invDateFrom') || {}).value || '');
  var sort = ((document.getElementById('invSort') || {}).value || 'date_desc');
  var inv = getInventory().slice();
  updateInventorySummary(inv);
  if (kindF) inv = inv.filter(function(item) { return item.kind === kindF; });
  if (specF) inv = inv.filter(function(item) { return item.spec === specF; });
  if (keyword) inv = inv.filter(function(item) { return [item.spec, item.kind, item.company, item.note, item.len].join(' ').toLowerCase().indexOf(keyword) >= 0; });
  if (dateFrom) inv = inv.filter(function(item) { return parseDateValue(item.addedDate) >= parseDateValue(dateFrom); });
  inv.sort(function(a, b) {
    if (sort === 'date_asc') return parseDateValue(a.addedDate) - parseDateValue(b.addedDate);
    if (sort === 'len_desc') return (b.len || 0) - (a.len || 0);
    if (sort === 'len_asc') return (a.len || 0) - (b.len || 0);
    if (sort === 'spec_asc') return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
    return parseDateValue(b.addedDate) - parseDateValue(a.addedDate);
  });
  if (!inv.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    var invCountEmpty = document.getElementById('invCountLabel');
    if (invCountEmpty) invCountEmpty.textContent = '0件';
    renderPager('invPagination', 1, 1, 'setInventoryPage');
    return;
  }
  if (empty) empty.style.display = 'none';
  var invCountLabel = document.getElementById('invCountLabel');
  if (invCountLabel) invCountLabel.textContent = inv.length + '件';
  var pageData = paginateItems(inv, inventoryPage, INVENTORY_PAGE_SIZE);
  inventoryPage = pageData.page;
  cont.innerHTML =
    '<div class="inv-table-card">' +
      '<div class="inv-col-header inv-col-header--table">' +
        '<span>#</span>' +
        '<span>鋼材規格</span>' +
        '<span>残材長</span>' +
        '<span>本数</span>' +
        '<span>登録日</span>' +
        '<span>発生元</span>' +
        '<span>メモ</span>' +
        '<span></span>' +
      '</div>' +
      pageData.items.map(function(item, idx) {
        var rowNo = ((inventoryPage - 1) * INVENTORY_PAGE_SIZE) + idx + 1;
        return '<div class="inv-row inv-row--table">' +
          '<span class="inv-no">' + String(rowNo).padStart(2, '0') + '</span>' +
          '<span class="inv-spec-cell">' +
            (item.kind ? '<span class="inv-kind-badge">' + item.kind + '</span>' : '') +
            '<span class="inv-spec-main">' + (item.spec || item.kind || '未設定') + '</span>' +
          '</span>' +
          '<span class="inv-len inv-len--single">' + Number(item.len || 0).toLocaleString() + '<span class="inv-len-unit">mm</span></span>' +
          '<span class="inv-qty inv-qty--plain">1本</span>' +
          '<span class="inv-date">' + (item.addedDate || '-') + '</span>' +
          '<span class="inv-company">' + (item.company || '-') + '</span>' +
          '<span class="inv-note">' + (item.note || '-') + '</span>' +
          '<span class="inv-action"><button onclick="deleteInventoryItem(' + item.id + ')" class="inv-del-btn inv-del-btn--quiet">削除</button></span>' +
        '</div>';
      }).join('') +
    '</div>';
  renderPager('invPagination', inventoryPage, pageData.totalPages, 'setInventoryPage');
}

function updateInventorySummary(inv) {
  var items = Array.isArray(inv) ? inv : [];
  var invSummaryCount = document.getElementById('invSummaryCount');
  var invSummaryWeight = document.getElementById('invSummaryWeight');
  if (!invSummaryCount && !invSummaryWeight) return;
  var totalQty = items.reduce(function(sum, item) {
    return sum + Math.max(1, parseInt(item && item.qty, 10) || 1);
  }, 0);
  var totalWeight = items.reduce(function(sum, item) {
    var qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
    var len = parseInt(item && item.len, 10) || 0;
    var kgm = typeof getWeightKgmForSpec === 'function' ? getWeightKgmForSpec(item && item.kind, item && item.spec) : 0;
    return sum + ((len / 1000) * kgm * qty);
  }, 0);
  if (invSummaryCount) invSummaryCount.textContent = totalQty.toLocaleString() + '本';
  if (invSummaryWeight) invSummaryWeight.textContent = (Math.round(totalWeight * 10) / 10).toLocaleString() + ' kg';
}

function renderHistory() {
  var cont = document.getElementById('histList');
  var empty = document.getElementById('histEmpty');
  if (!cont) return;
  var hist = getCutHistory().slice();
  var fc = (((document.getElementById('hsClient') || {}).value) || '').toLowerCase();
  var fn = (((document.getElementById('hsName') || {}).value) || '').toLowerCase();
  var fdf = ((document.getElementById('hsDateFrom') || {}).value || '');
  var fdt = ((document.getElementById('hsDateTo') || {}).value || '');
  var keyword = (((document.getElementById('hsKeyword') || {}).value) || '').toLowerCase();
  var sort = ((document.getElementById('hsSort') || {}).value || 'date_desc');
  if (fc) hist = hist.filter(function(h) { return (h.client || '').toLowerCase().indexOf(fc) >= 0; });
  if (fn) hist = hist.filter(function(h) { return (h.name || '').toLowerCase().indexOf(fn) >= 0; });
  var chipFrom = _chipDateFrom || '';
  var chipTo   = _chipDateTo   || '';
  if (chipFrom) hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) >= chipFrom; });
  if (chipTo)   hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) <= chipTo;   });
  if (fdf && !chipFrom) hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) >= normDateStr(fdf); });
  if (fdt && !chipTo)   hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) <= normDateStr(fdt); });
  if (fk) hist = hist.filter(function(h) { return historyHasKind(h, fk); });
  if (_histTypeFilter === 'cut')
    hist = hist.filter(function(h) { return !h.type || h.type === 'cut'; });
  if (_histTypeFilter === 'weight')
    hist = hist.filter(function(h) { return h.type === 'weight'; });
  if (keyword) hist = hist.filter(function(h) { return [h.client, h.name, h.spec, h.kind, h.worker].join(' ').toLowerCase().indexOf(keyword) >= 0; });
  hist.sort(function(a, b) {
    if (sort === 'date_asc') return parseDateValue(a.date) - parseDateValue(b.date);
    if (sort === 'deadline_asc') return parseDateValue(a.deadline) - parseDateValue(b.deadline);
    return parseDateValue(b.date) - parseDateValue(a.date);
  });
  if (!hist.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    var countEmpty = document.getElementById('hiCountLabel');
    if (countEmpty) countEmpty.textContent = '0件';
    renderPager('histPagination', 1, 1, 'setHistoryPage');
    return;
  }
  if (empty) empty.style.display = 'none';
  var countLabel = document.getElementById('hiCountLabel');
  if (countLabel) countLabel.textContent = hist.length + '件';
  var pageData = paginateItems(hist, historyPage, HISTORY_PAGE_SIZE);
  historyPage = pageData.page;

  if (_histView === 'group') {
    var pager = document.getElementById('histPagination');
    if (pager) pager.innerHTML = '';

    var jobMap = {};
    hist.forEach(function(h) {
      var key = ((h.client || '') + '___' + (h.name || '')).trim();
      if (key === '___') key = '未設定___未設定';
      if (!jobMap[key]) {
        jobMap[key] = {
          client: h.client || '',
          name: h.name || '',
          items: [],
          sumKg: 0,
          cutCount: 0,
          weightCount: 0
        };
      }
      jobMap[key].items.push(h);
      if (h.type === 'weight' && h.weight) jobMap[key].sumKg += (h.weight.sumKg || 0);
      if (h.type === 'weight') jobMap[key].weightCount++;
      else jobMap[key].cutCount++;
    });

    var jobKeys = Object.keys(jobMap).sort(function(a, b) {
      return parseDateValue(jobMap[b].items[0].date) - parseDateValue(jobMap[a].items[0].date);
    });

    cont.innerHTML = jobKeys.map(function(key) {
      var g = jobMap[key];
      var label = (g.client && g.name) ? g.client + '　' + g.name
        : (g.client || g.name || '案件未設定');
      var kgStr = g.sumKg > 0 ? (Math.round(g.sumKg * 10) / 10).toLocaleString() + ' kg' : '';
      return '<div class="hist2-group" style="' + HIST_GROUP_INLINE_STYLE + '">' +
        '<div class="hist2-group-hd" style="background:#ffffff;border-bottom:1px solid #eceff5;" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div style="flex:1;min-width:0">' +
            '<div class="hist2-group-title">' + label + '</div>' +
            '<div class="hist2-group-meta">' +
              (g.cutCount ? '<span>✂ 取り合い ' + g.cutCount + '件</span>' : '') +
              (g.weightCount ? '<span>⚖ 重量計算 ' + g.weightCount + '件</span>' : '') +
              (kgStr ? '<span style="font-weight:700;color:#1a1a2e">計 ' + kgStr + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<span class="hist2-group-arrow">›</span>' +
        '</div>' +
        '<div class="hist2-group-body" style="background:#ffffff;padding:0 12px 12px;">' +
          g.items.map(function(h) {
            return _renderHistRow(h);
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  } else {
    cont.style.display = 'flex';
    cont.style.flexDirection = 'column';
    cont.style.gap = '14px';
    cont.innerHTML = pageData.items.map(function(h) { return _renderHistRow(h); }).join('');
    renderPager('histPagination', historyPage, pageData.totalPages, 'setHistoryPage');
  }
}

var _weightHistPreviewId = null;

function showWeightHistPreview(id) {
  var hist = getCutHistory();
  // == で比較（JSON.parse後の型変換に対応）
  var entry = hist.filter(function(h) { return h.id == id; })[0];
  if (!entry) return;
  // type が未設定のエントリーも weight として扱う（weightプロパティがあれば）
  if (entry.type && entry.type !== 'weight') return;
  if (!entry.weight) return;

  _weightHistPreviewId = id;
  var modal = document.getElementById('weightHistPreviewModal');
  var body  = document.getElementById('weightHistPreviewBody');
  var meta  = document.getElementById('weightHistPreviewMeta');
  if (!modal || !body) return;

  var w = entry.weight;
  var rows = w.rows || [];
  var anyPrice = rows.some(function(r) { return r.amount !== null && r.amount !== undefined; });
  var anyPaint = rows.some(function(r) { return r.paintAmount !== null && r.paintAmount !== undefined; });
  var anyKuiku = rows.some(function(r) { return !!r.kuiku; });
  var anyMemo  = rows.some(function(r) { return !!r.memo; });

  // メタ情報
  var metaParts = [entry.dateLabel || ''];
  if (entry.client) metaParts.push(entry.client);
  if (entry.name)   metaParts.push(entry.name);
  if (meta) meta.textContent = metaParts.filter(Boolean).join('　');

  var TD  = 'padding:9px 12px;font-size:12px;color:#1a1a2e;border-bottom:1px solid #f0f0f0;';
  var TDR = TD + 'text-align:right;';
  var TDG = TD + 'color:#888;text-align:center;';

  var sumKg = 0, sumAmt = 0, sumPaint = 0;
  var rowsHtml = rows.map(function(r, i) {
    sumKg += (r.kgTotal || 0);
    if (r.amount     != null) sumAmt   += r.amount;
    if (r.paintAmount != null) sumPaint += r.paintAmount;
    var cells = '<td style="' + TDG + '">' + (i + 1) + '</td>';
    if (anyMemo)  cells += '<td style="' + TD + '">' + (r.memo ? _escHtml(r.memo) : '<span style="color:#ccc">—</span>') + '</td>';
    cells += '<td style="' + TD + '">' + _escHtml(r.kind || '') + '</td>';
    cells += '<td style="' + TD + '">' + _escHtml(r.spec || '') + '</td>';
    cells += '<td style="' + TDR + '">' + (r.len || 0).toLocaleString() + '</td>';
    cells += '<td style="' + TDR + '">' + (r.qty || 0) + '</td>';
    cells += '<td style="' + TDR + 'font-weight:700;">' + (Math.round((r.kgTotal || 0) * 10) / 10).toLocaleString() + ' kg</td>';
    if (anyKuiku) cells += '<td style="' + TD + '">' + (r.kuiku ? _escHtml(r.kuiku) : '<span style="color:#ccc">—</span>') + '</td>';
    if (anyPrice) cells += '<td style="' + TDR + '">' + (r.amount != null ? Math.round(r.amount).toLocaleString() + ' 円' : '<span style="color:#ccc">—</span>') + '</td>';
    if (anyPaint) cells += '<td style="' + TDR + '">' + (r.paintAmount != null ? Math.round(r.paintAmount).toLocaleString() + ' 円' : '<span style="color:#ccc">—</span>') + '</td>';
    return '<tr>' + cells + '</tr>';
  }).join('');

  var TH  = 'padding:8px 12px;font-size:10px;font-weight:600;color:#999;border-bottom:1px solid #e8e8e8;text-align:left;white-space:nowrap;';
  var THR = TH + 'text-align:right;';
  var ths = '<th style="' + TH + '">#</th>';
  if (anyMemo)  ths += '<th style="' + TH  + '">部材名</th>';
  ths += '<th style="' + TH  + '">種類</th>';
  ths += '<th style="' + TH  + '">規格</th>';
  ths += '<th style="' + THR + '">長さ (mm)</th>';
  ths += '<th style="' + THR + '">本数</th>';
  ths += '<th style="' + THR + '">合計重量</th>';
  if (anyKuiku) ths += '<th style="' + TH  + '">工区</th>';
  if (anyPrice) ths += '<th style="' + THR + '">概算金額</th>';
  if (anyPaint) ths += '<th style="' + THR + '">塗装金額</th>';

  var kgStr   = (Math.round(sumKg * 10) / 10).toLocaleString() + ' kg';
  var colSpan = 5 + (anyMemo?1:0) + (anyKuiku?1:0) + (anyPrice?1:0) + (anyPaint?1:0);
  var FT  = 'padding:10px 12px;font-size:12px;border-top:2px solid #e8e8e8;';
  var footCols = '<td colspan="' + (colSpan - (anyPrice?1:0) - (anyPaint?1:0)) + '" style="' + FT + 'text-align:right;color:#888;font-weight:600;">合　計</td>';
  footCols += '<td style="' + FT + 'text-align:right;font-weight:800;color:#1a1a2e;">' + kgStr + '</td>';
  if (anyPrice) footCols += '<td style="' + FT + 'text-align:right;font-weight:700;color:#1a1a2e;">' + (sumAmt > 0 ? Math.round(sumAmt).toLocaleString() + ' 円' : '—') + '</td>';
  if (anyPaint) footCols += '<td style="' + FT + 'text-align:right;font-weight:700;color:#1a1a2e;">' + (sumPaint > 0 ? Math.round(sumPaint).toLocaleString() + ' 円' : '—') + '</td>';

  body.innerHTML =
    '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr>' + ths + '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '<tfoot><tr>' + footCols + '</tr></tfoot>' +
    '</table>';

  modal.style.display = 'flex';
}

function closeWeightHistPreview() {
  var modal = document.getElementById('weightHistPreviewModal');
  if (modal) modal.style.display = 'none';
  _weightHistPreviewId = null;
}

function printWeightHistPreview() {
  var body = document.getElementById('weightHistPreviewBody');
  if (!body) return;
  var meta = (document.getElementById('weightHistPreviewMeta') || {}).textContent || '';
  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>重量計算プレビュー</title>' +
    '<style>' +
    '*{box-sizing:border-box}' +
    '@page{size:A4 landscape;margin:10mm 12mm}' +
    'body{font-family:sans-serif;font-size:11px;padding:14px;color:#000}' +
    'h2{font-size:13px;margin:0 0 4px;color:#1a1a2e}' +
    '.meta{font-size:10px;color:#888;margin-bottom:10px;border-bottom:1px solid #ccc;padding-bottom:6px}' +
    'table{border-collapse:collapse;width:100%}' +
    'th{font-size:10px;font-weight:700;color:#444;border-bottom:2px solid #000;padding:5px 8px;text-align:left;white-space:nowrap;background:#f4f4f4}' +
    'td{border-bottom:1px solid #ddd;padding:5px 8px;font-size:11px}' +
    'tfoot td{font-weight:700;border-top:2px solid #000;border-bottom:none;padding:6px 8px;background:#f8f8f8}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h2>重量計算プレビュー</h2>' +
    (meta ? '<div class="meta">' + meta + '</div>' : '') +
    body.innerHTML +
    '</body></html>';
  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}

function recallWeightFromPreview() {
  var id = _weightHistPreviewId;
  if (!id) return;
  closeWeightHistPreview();
  var hist = getCutHistory();
  var entry = hist.filter(function(h) { return h.id == id; })[0];
  if (!entry || !entry.weight) return;
  // 先にデータをセットしてからタブを開く
  // → wInit() 内の wRenderRows() が正しいデータで描画される
  if (typeof wRecallFromHistory === 'function') {
    wRecallFromHistory(entry.weight.rows, entry.weight.opts, entry);
  }
  if (typeof goPage === 'function') goPage('w');
}

function recallWeightHistory(id) {
  showWeightHistPreview(id);
}

function clearHistSearch() {
  ['hsClient', 'hsName', 'hsDateFrom', 'hsDateTo', 'hsSt', 'hsKind', 'hsKeyword'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sortEl = document.getElementById('hsSort');
  if (sortEl) sortEl.value = 'date_desc';
  _hiChipActive = 0;
  _chipDateFrom = '';
  _chipDateTo   = '';
  [1,2,3,4].forEach(function(i) {
    var c = document.getElementById('hChip' + i);
    if (c) c.classList.remove('on');
  });
  var hsSbCont = document.getElementById('hsSbKinds');
  if (hsSbCont) hsSbCont.querySelectorAll('.hi-sb-item').forEach(function(el) { el.classList.remove('on'); });
  _histTypeFilter = 'all';
  ['hTypeAll', 'hTypeCut', 'hTypeWeight'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.toggle('on', id === 'hTypeAll'); }
  });
  _histView = 'flat';
  hiSetView('flat');
}

function autoSyncResultRemnants(resultData) {
  if (!resultData || typeof extractRemnants !== 'function') return;
  var remnants = extractRemnants(resultData).filter(function(item) { return item && item.len; });
  if (!remnants.length) return;
  var signature = JSON.stringify(remnants.map(function(item) { return [item.kind, item.spec, item.len]; }).sort());
  if (_lastRegisteredRemnantSignature === signature) return;
  _lastRegisteredRemnantSignature = signature;
  registerRemnants(remnants);
}

function confirmCutDone() {
  var modal = document.getElementById('cutDoneModal');
  var kind = modal._kind;
  var spec = modal._spec;
  var items = modal._items || [];
  var endMats = modal._endMats || {};
  var label = (document.getElementById('cdLabel') ? document.getElementById('cdLabel').value.trim() : '');
  items.forEach(function(len) {
    var cb = document.getElementById('cd_' + len);
    if (cb && cb.checked) addToInventory(kind, spec, len, endMats[len], label);
  });
  modal.style.display = 'none';
  buildInventoryDropdown();
  renderInventoryPage();
  syncInventoryToRemnants();
  alert('在庫に登録しました。');
}

function isStdStockLength(length) {
  return Array.isArray(STD) && STD.indexOf(length) >= 0;
}

function buildCutSourceLabel(slLen) {
  return isStdStockLength(slLen) ? slLen.toLocaleString() + 'mm' : '残材（L=' + slLen.toLocaleString() + 'mm）より切断';
}


function buildPrintHeaderFull(job, pageInfo) {
  var h = '';
  h += '<div class="ph-full">';
  h += '<div>';
  h += '<div style="font-size:9px;color:#555;font-weight:700;letter-spacing:.06em;margin-bottom:4px">作業指示書</div>';
  h += '<div style="display:flex;gap:18px;align-items:baseline">';
  h += '<div><span style="font-size:9px;color:#666">顧客：</span><span style="font-size:12px;font-weight:700">' + (job.client || '—') + '</span></div>';
  h += '<div><span style="font-size:9px;color:#666">現場名：</span><span style="font-size:12px;font-weight:700">' + (job.name || '—') + '</span></div>';
  if (job.worker) h += '<div><span style="font-size:9px;color:#666">メモ：</span><span style="font-size:11px;font-weight:700">' + job.worker + '</span></div>';
  h += '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="margin-top:3px"><span style="font-size:9px;color:#666">納期：</span><span style="font-size:10px;font-weight:700">' + job.deadline + '</span></div>';
  h += '</div></div>';
  return h;
}

function buildPrintHeaderMini(job, pageInfo) {
  var h = '';
  h += '<div class="ph-mini">';
  h += '<div><span style="font-size:9px;font-weight:700;letter-spacing:.04em">作業指示書</span>';
  h += '<span style="font-size:9px;color:#555;margin-left:12px">顧客：' + (job.client || '—') + ' / 現場名：' + (job.name || '—') + '</span></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="font-size:9px"><span style="color:#666">納期：</span><strong>' + job.deadline + '</strong></div>';
  h += '</div></div>';
  return h;
}


document.addEventListener('DOMContentLoaded', function() {
  init();
  // カスタム鋼材ロード
  if (typeof loadCustomMaterials === 'function') loadCustomMaterials();
  if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
  // Supabase → localStorage 起動時同期
  if (typeof sbInitSync === 'function') {
    sbInitSync().then(function() {
      if (typeof renderHistory === 'function') renderHistory();
      if (typeof renderInventoryPage === 'function') renderInventoryPage();
      if (typeof loadCustomMaterials === 'function') loadCustomMaterials();
      if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
    });
  }

  // 履歴・在庫タブ内のinput/selectでEnterキーを押したら次の要素へ
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    var el = e.target;
    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    // 部材リストはptEnterで処理するので除外
    if (el.id && (el.id.indexOf('pl') === 0 || el.id.indexOf('pq') === 0)) return;
    // textarea除外
    if (el.type === 'textarea') return;

    e.preventDefault();
    // フォーカス可能な要素を順に取得して次へ
    var focusable = Array.from(document.querySelectorAll(
      'input:not([disabled]):not([readonly]):not([type=hidden]), select:not([disabled]), button:not([disabled])'
    )).filter(function(x) {
      return x.offsetParent !== null; // 表示されているもののみ
    });
    var idx = focusable.indexOf(el);
    if (idx >= 0 && idx < focusable.length - 1) {
      focusable[idx + 1].focus();
    }
  });
});
document.addEventListener('input', function(e) {
  if (e.target.id === 'kgm') updKg();
});

var MANUAL_REMNANTS_KEY = 'toriai_manual_remnants_v2';
var INVENTORY_REMNANT_USAGE_KEY = 'toriai_inventory_remnant_usage_v2';

function createManualRemnantRow(seed) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var data = seed || {};
  var i = remnantCount++;
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'manual';
  row.innerHTML =
    '<input type="number" class="rem-len" id="remLen' + i + '" min="1" placeholder="長さ(mm)" value="' + (data.len || '') + '" onchange="saveRemnants()">' +
    '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" value="' + (data.qty || 1) + '" onchange="saveRemnants()">' +
    '<input type="text" class="rem-memo" id="remMemo' + i + '" placeholder="メモ" value="' + escapeHtml(data.memo || '') + '" oninput="saveRemnants()">' +
    '<button type="button" class="rem-add-inline" onclick="addRemnant()">＋</button>' +
    '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function addRemnant(seed) {
  var row = createManualRemnantRow(seed);
  if (row) {
    saveRemnants();
    var lenEl = row.querySelector('.rem-len');
    if (lenEl) lenEl.focus();
  }
}


function updateCartBadge() {
  var cart = getCart();
  var cutN = cart.filter(function(x) { return !x.data.isWeight; }).length;
  var badges = [
    document.getElementById('cartBadge'),
    document.getElementById('calcCartBadge')
  ].filter(Boolean);
  badges.forEach(function(badge) {
    var count = cutN;
    badge.textContent = 'カート ' + count + '件';
    badge.classList.toggle('empty', count === 0);
  });
  document.body.classList.toggle('has-calc-cart', cutN > 0 && !!document.getElementById('calcCartBadge'));
}

function formatCalcToolbarField(value) {
  var text = String(value == null ? '' : value).trim();
  return text || '記載なし';
}

function syncCalcToolbarField(key, value) {
  var map = {
    customer: 'jobClient',
    projectName: 'jobName',
    deadline: 'jobDeadline',
    memo: 'jobWorker'
  };
  var targetId = map[key];
  if (!targetId) return;
  var el = document.getElementById(targetId);
  if (el) el.value = value || '';
  if (typeof saveSettings === 'function') saveSettings();
}

function buildCalcToolbarInput(label, key, value, type) {
  var safeValue = escapeHtml(value || '');
  var safeLabel = escapeHtml(label);
  var inputType = type || 'text';
  var placeholder = safeLabel === '納期' ? '' : '記載なし';
  return '<label class="calc-result-edit">' +
    '<span class="calc-result-cell-label">' + safeLabel + '</span>' +
    '<input class="calc-result-input" type="' + inputType + '" value="' + safeValue + '"' +
      (placeholder ? ' placeholder="' + placeholder + '"' : '') +
      ' oninput="syncCalcToolbarField(\'' + key + '\', this.value)">' +
  '</label>';
}

function buildCalcProjectToolbar(summary) {
  summary = summary || {};
  return '<div class="calc-result-toolbar">' +
    '<div class="calc-result-toolbar-main">' +
      '<div class="calc-result-cell">' +
        '<div class="calc-result-title">作業情報</div>' +
      '</div>' +
      buildCalcToolbarInput('顧客情報', 'customer', summary.customer, 'text') +
      buildCalcToolbarInput('工事名', 'projectName', summary.projectName, 'text') +
      buildCalcToolbarInput('納期', 'deadline', summary.deadline, 'date') +
      buildCalcToolbarInput('メモ', 'memo', summary.memo, 'text') +
    '</div>' +
    '<button id="calcCartBadge" class="cart-badge calc-toolbar-cart empty" data-cart-scope="cut" onclick="openCartModal()">カート 0件</button>' +
  '</div>';
}

function getCutCartItems() {
  return getCart().filter(function(item) {
    return !(item && item.data && item.data.isWeight);
  });
}

function getStatValueFromHtml(statsHtml, label) {
  if (!statsHtml) return '';
  var wrap = document.createElement('div');
  wrap.innerHTML = statsHtml;
  var stat = Array.from(wrap.querySelectorAll('.cs')).find(function(node) {
    var labelNode = node.querySelector('.cl');
    return labelNode && (labelNode.textContent || '').trim() === label;
  });
  var valueNode = stat && stat.querySelector('.cv');
  return valueNode ? (valueNode.textContent || '').trim() : '';
}

function getPieceSummaryFromBars(bars) {
  var sumMap = {};
  (bars || []).forEach(function(bar) {
    (bar.pat || []).forEach(function(len) {
      var num = parseInt(len, 10) || 0;
      if (!num) return;
      sumMap[num] = (sumMap[num] || 0) + 1;
    });
  });
  return sumMap;
}

function getRemTagsFromHtml(remHtml) {
  if (!remHtml) return [];
  var wrap = document.createElement('div');
  wrap.innerHTML = remHtml;
  return Array.from(wrap.querySelectorAll('span')).map(function(el) {
    return (el.textContent || '').trim();
  }).filter(function(text) {
    return text && text !== 'なし';
  });
}

function collectCartCutSections(cart) {
  cart = cart || getCutCartItems();
  return cart.map(function(item, index) {
    var data = item.data || {};
    var bars = Array.isArray(data.bars) && data.bars.length
      ? data.bars.slice()
      : parseBarsFromDiagHtml(data.diagHtml || '', 0, data.endLoss || 150);
    var stockLengths = sortStockLengthsForDisplay(
      bars.map(function(bar) { return parseInt(bar.sl, 10) || 0; })
        .filter(Boolean)
        .filter(function(v, i, arr) { return arr.indexOf(v) === i; })
    );
    var barHtml = '';
    stockLengths.forEach(function(sl) {
      barHtml += buildPrintBarHtml(
        bars.filter(function(bar) { return (parseInt(bar.sl, 10) || 0) === sl; }),
        sl,
        data.endLoss || 150
      );
    });
    return {
      idx: index + 1,
      itemId: item.id,
      title: data.title || '',
      kind: data.kind || '',
      spec: data.spec || '',
      statsHtml: data.statsHtml || '',
      motherSummary: data.motherSummary || '',
      bars: bars,
      sumMap: getPieceSummaryFromBars(bars),
      remTags: getRemTagsFromHtml(data.remHtml),
      barHtml: barHtml
    };
  });
}

function buildCartCutPrintHtml(cart) {
  cart = cart || getCutCartItems();
  if (!cart.length) return '';
  var first = cart[0].data || {};
  return buildPrintPages(first.job || {}, collectCartCutSections(cart));
}

function buildProjectHistoryPayload(cart) {
  cart = cart || getCutCartItems();
  if (!cart.length) return null;
  var first = cart[0].data || {};
  var job = first.job || {};
  var sections = collectCartCutSections(cart);
  var kinds = [];
  var specs = [];
  sections.forEach(function(section) {
    if (section.kind && kinds.indexOf(section.kind) < 0) kinds.push(section.kind);
    if (section.spec && specs.indexOf(section.spec) < 0) specs.push(section.spec);
  });
  return {
    job: {
      client: job.client || '',
      name: job.name || '',
      deadline: job.deadline || '',
      worker: job.worker || ''
    },
    kind: kinds.join(' / '),
    spec: specs.join(' / '),
    sections: sections.map(function(section) {
      return {
        idx: section.idx,
        title: section.title || '',
        kind: section.kind || '',
        spec: section.spec || '',
        motherSummary: section.motherSummary || '',
        sumMap: Object.assign({}, section.sumMap),
        remTags: (section.remTags || []).slice(),
        bars: JSON.parse(JSON.stringify(section.bars || [])),
        statsHtml: section.statsHtml || ''
      };
    }),
    cartItemIds: cart.map(function(item) { return item.id; }),
    printHtml: buildPrintPages(job, sections)
  };
}

function saveProjectCutHistory(cart, outputType) {
  var payload = buildProjectHistoryPayload(cart);
  if (!payload) return null;
  var signature = JSON.stringify([
    payload.cartItemIds.slice().sort(),
    payload.kind,
    payload.spec
  ]);
  if (window._lastProjectHistorySignature === signature) return null;
  window._lastProjectHistorySignature = signature;
  var hist = getCutHistory();
  var entry = {
    id: Date.now(),
    type: 'cut_project',
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: payload.job.client,
    name: payload.job.name,
    deadline: payload.job.deadline,
    worker: payload.job.worker,
    kind: payload.kind,
    spec: payload.spec,
    outputType: outputType || 'print',
    project: payload
  };
  hist.unshift(entry);
  try { localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist)); } catch (e) {}
  if (typeof sbUpsert === 'function') sbUpsert('cut_history', hist);
  return entry;
}

function showCartCutPreview(html) {
  if (!html) {
    var cart = getCutCartItems();
    if (!cart.length) { alert('取り合いがカートにありません。'); return; }
    html = buildCartCutPrintHtml(cart);
  }
  if (!html) { alert('作業指示書プレビューを生成できませんでした。'); return; }
  var modal = document.getElementById('histPreviewModal');
  var body = document.getElementById('histPreviewBody');
  if (!modal || !body) return;
  body.innerHTML = html;
  closeCartModal();
  modal.style.display = 'flex';
}

function buildCardActionButtons(cardId, includeAdd) {
  var html = '';
  if (includeAdd) {
    html += '<button class="cc-btn-add" id="add_' + cardId + '" onclick="cartAdd(\'' + cardId + '\',this)">＋</button>';
  }
  html += '<button class="cc-btn-mini" type="button" onclick="printCard(\'' + cardId + '\')" aria-label="印刷">🖨</button>';
  return html;
}

function toggleCardDetail(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.classList.contains('open');
  el.classList.toggle('open', !open);
  btn.textContent = open ? '詳細を表示 ▼' : '詳細を閉じる ▲';
  btn.classList.toggle('open', !open);
}

function formatPatternSummary(pattern) {
  var order = [];
  var counts = {};
  (pattern || []).forEach(function(len) {
    var n = parseInt(len, 10);
    if (!n) return;
    if (!counts[n]) order.push(n);
    counts[n] = (counts[n] || 0) + 1;
  });
  return order.map(function(len) {
    return len.toLocaleString() + 'mm x ' + counts[len] + '本';
  }).join(' + ');
}

function buildDisplaySegments(pattern) {
  var segments = [];
  (pattern || []).forEach(function(len) {
    var n = parseInt(len, 10);
    if (!n) return;
    var last = segments[segments.length - 1];
    if (last && last.len === n) {
      last.count++;
      last.total += n;
    } else {
      segments.push({ len: n, count: 1, total: n });
    }
  });
  return segments.reduce(function(list, segment) {
    if (segment.count >= 5) {
      list.push({
        len: segment.len,
        count: segment.count,
        total: segment.total,
        label: segment.len.toLocaleString() + 'mm × ' + segment.count + '本'
      });
    } else {
      for (var i = 0; i < segment.count; i++) {
        list.push({ len: segment.len, count: 1, total: segment.len, label: segment.len.toLocaleString() + 'mm' });
      }
    }
    return list;
  }, []);
}

function buildCutDiagram(bars, slLen, label) {
  var grouped = groupBars(bars);
  if (!grouped.length) return '';
  grouped.sort(function(a, b) { return (b.cnt || 0) - (a.cnt || 0); });
  var html = '<div class="cut-diagram">';
  grouped.forEach(function(g) {
    var sourceLabel = buildCutSourceLabel(slLen);
    var isRemnant = !isStdStockLength(slLen);
    html += '<div class="bar-vis' + (isRemnant ? ' remnant-source' : '') + '">';
    html += '<div class="bar-vis-label"><strong>' + sourceLabel + '</strong><span class="bar-count">× ' + g.cnt + 'セット</span>' + (isRemnant ? '<span class="source-chip">残材より</span>' : '') + '</div>';
    html += '<div class="bar-track">';
    var endHalf = (parseInt((document.getElementById('endloss') || {}).value, 10) || 150) / 2;
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    buildDisplaySegments(g.pat || []).forEach(function(segment, idx) {
      if (idx > 0) html += '<div class="bar-cutline" aria-hidden="true"></div>';
      html += '<div class="b-piece" style="flex:' + segment.total + '"><span>' + segment.label + '</span></div>';
    });
    if (g.loss > 0) html += '<div class="' + (g.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + g.loss + '">' + Number(g.loss).toLocaleString() + '</div>';
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    html += '</div>';
    html += '<div class="bar-pat">= ' + formatPatternSummary(g.pat) + (g.loss > 0 ? ' / 端材 ' + Number(g.loss).toLocaleString() + 'mm' : '') + '</div>';
    html += '</div>';
  });
  return html + '</div>';
}

function buildPrintBarHtml(bars, sl, endLoss) {
  if (!bars || !bars.length) return '';
  var groupsByStock = {};
  bars.forEach(function(bar) {
    var slKey = bar && bar.sl ? bar.sl : sl;
    if (!groupsByStock[slKey]) groupsByStock[slKey] = [];
    groupsByStock[slKey].push(bar);
  });
  var slKeys = sortStockLengthsForDisplay(Object.keys(groupsByStock).map(Number));
  var html = '';
  slKeys.forEach(function(slKey) {
    var grouped = {};
    groupsByStock[slKey].forEach(function(bar) {
      var key = JSON.stringify((bar.pat || []).slice()) + '|' + (bar.loss || 0);
      if (!grouped[key]) grouped[key] = { bar: bar, cnt: 0 };
      grouped[key].cnt++;
    });
    var sourceLabel = buildCutSourceLabel(slKey);
    var isRemnant = !isStdStockLength(slKey);
    Object.keys(grouped).forEach(function(key) {
      var g = grouped[key];
      var bar = g.bar;
      var endHalf = (endLoss || 150) / 2;
      html += '<div class="bar-group">';
      html += '<div class="bar-head"><span style="font-weight:700;font-size:10px">' + sourceLabel + '</span><span class="cnt-badge">× ' + g.cnt + 'セット</span>' + (isRemnant ? '<span class="source-chip">残材より</span>' : '') + '</div>';
      html += '<div class="bar-pat">= ' + formatPatternSummary(bar.pat) + (bar.loss > 0 ? ' / 端材 ' + Number(bar.loss).toLocaleString() + 'mm' : '') + '</div>';
      html += '<div class="bar-track">';
      html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
      buildDisplaySegments(bar.pat || []).forEach(function(segment, idx) {
        if (idx > 0) html += '<div class="b-blade"></div>';
        html += '<div class="b-piece" style="flex:' + segment.total + '"><span>' + segment.label + '</span></div>';
      });
      if (bar.loss > 0) {
        html += '<div class="b-blade"></div>';
        html += '<div class="' + (bar.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + bar.loss + '">' + Number(bar.loss).toLocaleString() + '</div>';
      }
      html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
      html += '</div></div>';
    });
  });
  return html;
}


// Final remnant UI behavior override. This block must stay at EOF so stale
// duplicated definitions earlier in the file cannot win.


(function finalizeRemnantUiBinding() {
  function bind() {
    var sel = document.getElementById('invSelect');
    var btn = document.getElementById('invUseBtn');
    if (sel && !sel.dataset.finalBound) {
      sel.dataset.finalBound = '1';
      sel.addEventListener('change', updateInventoryUseButton);
    }
    if (btn && !btn.dataset.finalBound) {
      btn.dataset.finalBound = '1';
      btn.addEventListener('click', addFromInventory);
    }
    buildInventoryDropdown();
    syncInventoryToRemnants();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();


(function hardReplaceRemnantUi() {
  function renderRemnantSectionShell() {
    var body = document.getElementById('remnantBody');
    if (!body) return;
    body.innerHTML =
      '<div id="invDropCont" class="remnant-picker-shell">' +
        '<div class="remnant-picker-top">' +
          '<span id="invBadge" class="remnant-badge">在庫 0本</span>' +
        '</div>' +
        '<div class="remnant-inventory-picker">' +
          '<select id="invSelect"><option value=\"\">在庫から使いたい残材を選択</option></select>' +
          '<button id="invUseBtn" type="button">追加</button>' +
        '</div>' +
      '</div>' +
      '<div class="remnant-area">' +
        '<div class="remnant-head"><span>計算に使う残材</span></div>' +
        '<div id="remnantList"></div>' +
      '</div>';

    var addBtn = document.getElementById('invUseBtn');
    var select = document.getElementById('invSelect');
    if (addBtn) addBtn.onclick = addFromInventory;
    if (select) select.onchange = updateInventoryUseButton;
  }

  function run() {
    renderRemnantSectionShell();
    buildInventoryDropdown();
    syncInventoryToRemnants();
    updateInventoryUseButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(run, 0);
    });
  } else {
    setTimeout(run, 0);
  }
})();

var _selectedInventoryRemnantsState = null;

function loadSelectedInventoryRemnantsState() {
  if (_selectedInventoryRemnantsState) return _selectedInventoryRemnantsState;
  try {
    var parsed = JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
    _selectedInventoryRemnantsState = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    _selectedInventoryRemnantsState = {};
  }
  return _selectedInventoryRemnantsState;
}

function persistSelectedInventoryRemnantsState() {
  try {
    localStorage.setItem(INVENTORY_REMNANT_SELECTED_KEY, JSON.stringify(_selectedInventoryRemnantsState || {}));
  } catch (e) {}
}

function getRemnantInventoryKey(item) {
  return item && item.ids ? item.ids.slice().sort(function(a, b) { return a - b; }).join('_') : '';
}

function updateInventoryUseButton() {
  var btn = document.getElementById('invUseBtn');
  var sel = document.getElementById('invSelect');
  if (!btn) return;
  btn.textContent = '追加';
  btn.style.background = '#fff';
  btn.style.color = '#16a34a';
  btn.disabled = !(sel && sel.value);
}


(function applyFinalRemnantUiOverrides() {
  var remnantState = null;

  function stateLoad() {
    if (remnantState) return remnantState;
    try {
      var parsed = JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
      remnantState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      remnantState = {};
    }
    return remnantState;
  }

  function stateSave() {
    try {
      localStorage.setItem(INVENTORY_REMNANT_SELECTED_KEY, JSON.stringify(remnantState || {}));
    } catch (e) {}
  }

  function keyOf(item) {
    return item && item.ids ? item.ids.slice().sort(function(a, b) { return a - b; }).join('_') : '';
  }

  updateInventoryUseButton = function() {
    var btn = document.getElementById('invUseBtn');
    var sel = document.getElementById('invSelect');
    if (!btn) return;
    btn.textContent = '追加';
    btn.style.background = '#fff';
    btn.style.color = '#16a34a';
    btn.disabled = !(sel && sel.value);
  };

  buildInventoryDropdown = function() {
    var cont = document.getElementById('invDropCont');
    if (!cont) return;
    var items = getInventoryForCurrentSpec();
    cont.style.display = items.length ? 'block' : 'none';
    var badge = document.getElementById('invBadge');
    if (badge) {
      var totalQty = items.reduce(function(sum, item) {
        var qty = item && item.qty != null && !isNaN(item.qty) ? Number(item.qty) : 0;
        return sum + qty;
      }, 0);
      badge.textContent = '在庫 ' + totalQty + '本';
    }
    var sel = document.getElementById('invSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">在庫から使いたい残材を選択</option>';
    items.forEach(function(item) {
      var qty = item && item.qty != null && !isNaN(item.qty) ? Number(item.qty) : 0;
      var len = item && item.len != null && !isNaN(item.len) ? Number(item.len) : 0;
      var spec = item && item.spec ? item.spec : '不明';
      var company = item && item.company ? item.company : '';
      var option = document.createElement('option');
      option.value = keyOf(item);
      option.textContent = len.toLocaleString() + 'mm × ' + qty + '本 (' + spec + ')' + (company ? ' [' + company + ']' : '');
      sel.appendChild(option);
    });
    updateInventoryUseButton();
  };

  addFromInventory = function() {
    var sel = document.getElementById('invSelect');
    if (!sel || !sel.value) return;
    var items = getInventoryForCurrentSpec();
    var chosen = items.find(function(item) { return keyOf(item) === sel.value; });
    if (!chosen) return;
    var state = stateLoad();
    state[keyOf(chosen)] = { qty: 1 };
    remnantState = state;
    stateSave();
    sel.value = '';
    syncInventoryToRemnants();
    updateInventoryUseButton();
  };

  saveRemnants = function() {
    var next = {};
    document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
      var qtyEl = row.querySelector('.rem-qty');
      var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
      next[row.dataset.inventoryKey] = {
        qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
      };
    });
    remnantState = next;
    stateSave();
  };

  removeRemnant = function(i) {
    var row = document.getElementById('remRow' + i);
    if (!row) return;
    var state = stateLoad();
    delete state[row.dataset.inventoryKey];
    remnantState = state;
    stateSave();
    syncInventoryToRemnants();
    updateInventoryUseButton();
  };

  syncInventoryToRemnants = function() {
    var list = document.getElementById('remnantList');
    if (!list) return;
    var grouped = getInventoryForCurrentSpec();
    var state = stateLoad();
    list.innerHTML = '';
    remnantCount = 0;
    Object.keys(state).forEach(function(key) {
      var item = grouped.find(function(group) { return keyOf(group) === key; });
      if (!item) return;
      var i = remnantCount++;
      var usage = Math.max(1, Math.min(item.qty || 1, (state[key] || {}).qty || 1));
      var row = document.createElement('div');
      row.className = 'rem-row';
      row.id = 'remRow' + i;
      row.dataset.source = 'inventory';
      row.dataset.inventoryKey = key;
      row.dataset.maxQty = String(item.qty || 1);
      row.innerHTML =
        '<div class="rem-label-group"><span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span><span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span></div>' +
        '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
        '<div class="rem-meta">今回使う本数 / ' + escapeHtml(item.company || item.label || '在庫から選択') + '</div>' +
        '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
      list.appendChild(row);
    });
    if (!list.children.length) {
      list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から追加した残材がここに表示されます</div></div>';
    }
  };

  getRemnants = function() {
    var result = [];
    document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
      var qtyEl = row.querySelector('.rem-qty');
      var title = row.querySelector('.rem-label-title');
      var len = parseInt((title && title.textContent || '').replace(/[^\d]/g, ''), 10);
      var qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
      if (!len || !qty) return;
      for (var i = 0; i < qty; i++) result.push(len);
    });
    return result;
  };

  renderCartModal = function() {
    var cutItems = getCutCartItems();

    var cutList = document.getElementById('cartCutList');
    var cutPrintBtn = document.getElementById('cartCutPrintBtn');
    var cutWeightBtn = document.getElementById('cartCutWeightBtn');
    var cutPdfBtn = document.getElementById('cartCutPdfBtn');
    var cutCopyBtn = document.getElementById('cartCutCopyBtn');
    var countEl = document.getElementById('cartModalCount');
    if (cutList) {
      if (cutItems.length === 0) {
        cutList.innerHTML = '<div class="cart-empty-msg">追加された取り合いはありません</div>';
      } else {
        cutList.innerHTML = cutItems.map(function(item) {
          var d = item.data;
          return '<div class="cart-item" onclick="showCartCutPreview(buildCartCutPrintHtml([getCutCartItems().filter(function(x){ return x.id === \'' + item.id + '\'; })[0]]))">' +
            '<div style="flex:1;min-width:0">' +
              '<div class="cart-item-title">' +
                [d.kind || '', d.spec || ''].filter(Boolean).join('　') +
              '</div>' +
              '<div class="cart-item-sub">' +
                '使う母材: ' + (d.motherSummary || '記載なし') +
              '</div>' +
            '</div>' +
            '<button class="cart-item-del" onclick="event.stopPropagation();cartRemoveItem(\'' + item.id + '\')">✕</button>' +
          '</div>';
        }).join('');
      }
      if (cutPrintBtn) cutPrintBtn.disabled = cutItems.length === 0;
      if (cutWeightBtn) cutWeightBtn.disabled = cutItems.length === 0;
      if (cutPdfBtn) cutPdfBtn.disabled = cutItems.length === 0;
      if (cutCopyBtn) cutCopyBtn.disabled = cutItems.length === 0;
    }
    if (countEl) countEl.textContent = cutItems.length ? ('取り合い ' + cutItems.length + '件') : '';

    updateCartBadge();
  };

  if (document.readyState !== 'loading') {
    buildInventoryDropdown();
    syncInventoryToRemnants();
    updateInventoryUseButton();
  }
})();

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    normalizeInterfaceChrome();
    syncInventoryToRemnants();
    updateCartBadge();
  }, 0);
});

function sortStockLengthsForDisplay(lengths) {
  return lengths.slice().sort(function(a, b) {
    var aRem = !isStdStockLength(a);
    var bRem = !isStdStockLength(b);
    if (aRem !== bRem) return aRem ? -1 : 1;
    return a - b;
  });
}

function parseBarsFromDiagHtml(diagHtml, fallbackSl, fallbackEndLoss) {
  if (!diagHtml) return [];
  var wrap = document.createElement('div');
  wrap.innerHTML = diagHtml;
  return Array.from(wrap.querySelectorAll('.bar-vis')).map(function(vis) {
    var labelText = ((vis.querySelector('.bar-vis-label strong') || {}).textContent || '').trim();
    var slMatch = labelText.match(/L=([\d,]+)mm|([\d,]+)mm/);
    var sl = fallbackSl || 0;
    if (slMatch) sl = parseInt((slMatch[1] || slMatch[2] || '0').replace(/,/g, ''), 10) || sl;
    var pieces = Array.from(vis.querySelectorAll('.b-piece')).map(function(piece) {
      return parseInt(String(piece.style.flex || '').replace(/[^\d]/g, ''), 10) || parseInt((piece.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
    }).filter(Boolean);
    var remEl = vis.querySelector('.b-rem, .b-loss');
    var loss = remEl ? (parseInt(String(remEl.style.flex || '').replace(/[^\d]/g, ''), 10) || parseInt((remEl.textContent || '').replace(/[^\d]/g, ''), 10) || 0) : 0;
    if (!pieces.length && !loss) return null;
    return { pat: pieces, loss: loss, sl: sl, endLoss: fallbackEndLoss || 150 };
  }).filter(Boolean);
}

function cartAdd(cardId, btn) {
  var card = document.getElementById(cardId);
  if (!card) return;
  var titleEl = card.querySelector('.cc-desc');
  var title = titleEl ? titleEl.childNodes[0].textContent.trim() : '';
  var statsEl = card.querySelector('.cc-stats');
  var patEl = card.querySelector('.cc-pat');
  var remEl = card.querySelector('[class*="rem-section"]') || card.querySelector('.rem-list');
  var diagHtml = '';
  card.querySelectorAll('[id^="diag_"]').forEach(function(d) { diagHtml += d.innerHTML; });
  var endLoss = parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;
  var currentKind = '';
  if (typeof getCurrentKind === 'function') currentKind = getCurrentKind() || '';
  if (!currentKind && typeof curKind !== 'undefined') currentKind = curKind || '';
  if (!currentKind && window && typeof window.curKind !== 'undefined') currentKind = window.curKind || '';
  var data = {
    cardId: cardId,
    title: title,
    isYield: !!card.closest('.yield-card, .yield-best'),
    isPat: !card.closest('.yield-card, .yield-best'),
    job: getJobInfo(),
    spec: (document.getElementById('spec') || {}).value || '',
    kind: currentKind,
    statsHtml: statsEl ? statsEl.innerHTML : '',
    patHtml: patEl ? patEl.innerHTML : '',
    diagHtml: diagHtml,
    remHtml: remEl ? remEl.outerHTML : '',
    bars: parseBarsFromDiagHtml(diagHtml, 0, endLoss),
    endLoss: endLoss,
    motherSummary: Array.from(card.querySelectorAll('.pc-hd span')).map(function(el) { return (el.textContent || '').trim(); }).join(' + ')
  };
  addToCart(cardId, data);
  updateCartBadge();
  btn.textContent = '✓ 追加済み';
  btn.classList.add('added');
  btn.disabled = true;
  if (_lastCalcResult) saveCutHistory(_lastCalcResult, cardId);
}

function cartPrintCutting() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var html = buildCartCutPrintHtml(cart);
  if (!html) { alert('印刷データを生成できませんでした。'); return; }
  saveProjectCutHistory(cart, 'print');
  closeCartModal();
  var win = openOutputWindow(html, { title: '作業指示書', print: true, closeAfterPrint: true });
  if (!win) {
    showCartCutPreview(html);
    alert('印刷ウィンドウを開けなかったため、プレビューを表示しました。');
  }

  // 在庫消費: カート内の各カードについて残材在庫を消費
  (function consumeCartInventory() {
    var consumePayloads = [];
    cart.forEach(function(item) {
      var d = item.data || {};
      var cardId = d.cardId || '';
      if (!cardId) return;
      var payload = typeof buildPrintPayload === 'function'
        ? buildPrintPayload(cardId, window._lastCalcResult, d)
        : null;
      if (!payload) return;
      var hasSelected = typeof getSelectedInventoryIds === 'function' && getSelectedInventoryIds(payload.meta).length > 0;
      var hasConsumed = typeof getConsumedInventoryLengths === 'function' && getConsumedInventoryLengths(payload.bars, payload.meta).length > 0;
      if (hasSelected || hasConsumed) {
        consumePayloads.push({ cardId: cardId, bars: payload.bars, meta: payload.meta });
      }
    });
    if (!consumePayloads.length) return;
    var sig = JSON.stringify(consumePayloads.map(function(p) {
      return typeof buildInventoryConsumeSignature === 'function'
        ? buildInventoryConsumeSignature(p.cardId, p.bars, p.meta)
        : p.cardId;
    }).sort());
    if (window._lastConsumedInventorySignature === sig) return;
    window._lastConsumedInventorySignature = sig;
    consumePayloads.forEach(function(p) {
      if (typeof getSelectedInventoryIds === 'function' && getSelectedInventoryIds(p.meta).length > 0
          && typeof consumeSelectedInventoryRemnants === 'function') {
        consumeSelectedInventoryRemnants(p.meta.selectedInventoryRemnants);
      } else if (typeof consumeInventoryBars === 'function') {
        consumeInventoryBars(p.bars, p.meta);
      }
    });
  })();

  saveCart(getCart().filter(function(x) { return x && x.data && x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    var cardId = btn.id.replace('add_', '');
    var stillInCart = getCart().some(function(x) { return x.data.cardId === cardId; });
    if (!stillInCart) {
      btn.textContent = '＋';
      btn.classList.remove('added');
      btn.disabled = false;
    }
  });
}

function cartSaveCuttingPdf() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var html = buildCartCutPrintHtml(cart);
  if (!html) { alert('PDF保存用データを生成できませんでした。'); return; }
  saveProjectCutHistory(cart, 'pdf');
  closeCartModal();
  var win = openOutputWindow(html, {
    title: '作業指示書_PDF',
    print: true,
    closeAfterPrint: false
  });
  if (!win) {
    showCartCutPreview(html);
    alert('PDF保存用のウィンドウを開けなかったため、プレビューを表示しました。右上の印刷からPDF保存してください。');
  }
}

function getWeightKgmForSpec(kind, spec) {
  if (typeof getSteelRowsForKind === 'function') {
    var rows = getSteelRowsForKind(kind) || [];
    var hit = rows.find(function(row) { return row[0] === spec; });
    if (hit) return Number(hit[1]) || 0;
  }
  if (typeof STEEL === 'object' && STEEL && Array.isArray(STEEL[kind])) {
    var hit2 = STEEL[kind].find(function(row) { return row[0] === spec; });
    if (hit2) return Number(hit2[1]) || 0;
  }
  return 0;
}

function buildWeightRowsFromCutCart(cart) {
  var grouped = {};
  (cart || []).forEach(function(item) {
    var data = item.data || {};
    var resolvedKind = data.kind || (data.job && data.job.kind) || '';
    if (!resolvedKind && typeof curKind !== 'undefined') resolvedKind = curKind || '';
    var bars = Array.isArray(data.bars) && data.bars.length
      ? data.bars
      : parseBarsFromDiagHtml(data.diagHtml || '', 0, data.endLoss || 150);
    if (!bars.length && data.motherSummary) {
      String(data.motherSummary).split(/[+＋]/).forEach(function(part) {
        var match = part.match(/([\d,]+)\s*mm?\s*[×x]\s*(\d+)/i) || part.match(/([\d,]+)\s*[×x]\s*(\d+)/i);
        if (!match) return;
        var sl = parseInt((match[1] || '0').replace(/,/g, ''), 10) || 0;
        var qty = parseInt(match[2] || '0', 10) || 0;
        for (var i = 0; i < qty; i++) bars.push({ sl: sl, pat: [], loss: 0 });
      });
    }
    bars.forEach(function(bar) {
      var sl = parseInt(bar && bar.sl, 10) || 0;
      if (!sl) return;
      var key = [resolvedKind, data.spec || '', sl].join('::');
      if (!grouped[key]) {
        grouped[key] = { kind: resolvedKind, spec: data.spec || '', len: sl, qty: 0 };
      }
      grouped[key].qty += 1;
    });
  });
  return Object.keys(grouped).map(function(key) {
    var item = grouped[key];
    var kgm = getWeightKgmForSpec(item.kind, item.spec);
    var kg1 = typeof jisRound === 'function' ? jisRound(kgm * item.len / 1000, 1) : Math.round(kgm * item.len / 100) / 10;
    var ppm = typeof wGetPaintPerM === 'function' ? wGetPaintPerM(item.kind, item.spec) : 0;
    var m2_1 = ppm * item.len / 1000;
    return {
      kind: item.kind,
      spec: item.spec,
      memo: '取り合い母材',
      len: item.len,
      qty: item.qty,
      kgm: kgm,
      kg1: kg1,
      kgTotal: kg1 * item.qty,
      m2_1: m2_1,
      m2Total: m2_1 * item.qty,
      price: 0,
      amount: null,
      paintPrice: 0,
      paintAmount: null
    };
  }).sort(function(a, b) {
    if (a.kind !== b.kind) return String(a.kind).localeCompare(String(b.kind), 'ja');
    if (a.spec !== b.spec) return String(a.spec).localeCompare(String(b.spec), 'ja');
    return b.len - a.len;
  });
}

function cartSendToWeightTab() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = buildWeightRowsFromCutCart(cart);
  if (!rows.length) { alert('重量タブに渡せる母材データがありません。'); return; }
  var job = (cart[0].data && cart[0].data.job) || {};
  if (typeof wRecallFromHistory === 'function') {
    wRecallFromHistory(rows, { price: false, name: false, rev: false, paint: false, m2: false, co2: false }, {
      client: job.client || '',
      name: job.name || ''
    });
  }
  if (typeof goPage === 'function') goPage('w');
  setTimeout(function() {
    if (typeof wRecallFromHistory === 'function') {
      wRecallFromHistory(rows, { price: false, name: false, rev: false, paint: false, m2: false, co2: false }, {
        client: job.client || '',
        name: job.name || ''
      });
    }
  }, 0);
  closeCartModal();
}

function buildCartShortCopyText() {
  var cart = getCutCartItems();
  if (!cart.length) return '';
  var first = cart[0].data || {};
  var job = first.job || {};
  var lines = [
    '顧客情報: ' + formatCalcToolbarField(job.client),
    '工事名: ' + formatCalcToolbarField(job.name),
    '納期: ' + formatCalcToolbarField(job.deadline)
  ];
  collectCartCutSections(cart).forEach(function(section, index) {
    var cutSummary = Object.keys(section.sumMap).map(Number).sort(function(a, b) { return b - a; }).map(function(len) {
      return len.toLocaleString() + 'mm×' + section.sumMap[len];
    }).join(' / ');
    lines.push(
      (index + 1) + '. ' + [section.kind, section.spec].filter(Boolean).join(' '),
      '使用母材: ' + (section.motherSummary || '記載なし'),
      '本数: ' + (getStatValueFromHtml(section.statsHtml, '使用本数') || '記載なし'),
      '歩留まり: ' + (getStatValueFromHtml(section.statsHtml, '歩留まり') || '記載なし'),
      'カット内容: ' + (cutSummary || '記載なし')
    );
  });
  return lines.join('\n');
}

function cartCopyCutShort() {
  var text = buildCartShortCopyText();
  if (!text) { alert('取り合いがカートにありません。'); return; }
  function finishCopy() {
    closeCartModal();
    alert('共有用テキストをコピーしました。');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(finishCopy).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finishCopy();
    });
    return;
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  finishCopy();
}

function cartPrintWeight() {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) { alert('重量リストがカートにありません。'); return; }

  var allSections = cart.map(function(item) {
    var d = item.data;
    var sumKg = d.sumKg;
    var sumAmt = d.sumAmt;
    var anyPrice = d.anyPrice;
    var rows = (d.rows || []).map(function(r, i) {
      return '<tr style="border-bottom:1px solid #eee">' +
        '<td style="padding:4px 8px;text-align:center">' + (i + 1) + '</td>' +
        '<td style="padding:4px 8px">' + (r.memo || '—') +
          (r.kuiku ? ' <span style="font-size:9px;background:#f0f0f0;padding:1px 5px;border-radius:8px">' + r.kuiku + '</span>' : '') +
        '</td>' +
        '<td style="padding:4px 8px">' + r.kind + '</td>' +
        '<td style="padding:4px 8px">' + r.spec + '</td>' +
        '<td style="padding:4px 8px;text-align:right">' + r.len.toLocaleString() + '</td>' +
        '<td style="padding:4px 8px;text-align:right">' + r.qty + '</td>' +
        '<td style="padding:4px 8px;text-align:right;font-weight:700">' +
          (typeof _wFmtKg === 'function' ? _wFmtKg(r.kgTotal) : r.kgTotal.toFixed(1)) + '</td>' +
        (anyPrice ? '<td style="padding:4px 8px;text-align:right">' +
          (r.amount !== null ? Number(r.amount).toLocaleString() + ' 円' : '—') + '</td>' : '') +
      '</tr>';
    }).join('');

    return '<div style="margin-bottom:24px">' +
      '<h3 style="font-size:12px;margin-bottom:6px;color:#444">重量計算リスト — ' + d.title + '</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
      '<thead><tr style="background:#f4f4fa;border-bottom:2px solid #e0e0ea">' +
        '<th style="padding:5px 8px;text-align:left">#</th>' +
        '<th style="padding:5px 8px;text-align:left">部材名</th>' +
        '<th style="padding:5px 8px;text-align:left">種類</th>' +
        '<th style="padding:5px 8px;text-align:left">規格</th>' +
        '<th style="padding:5px 8px;text-align:right">長さ(mm)</th>' +
        '<th style="padding:5px 8px;text-align:right">本数</th>' +
        '<th style="padding:5px 8px;text-align:right">合計重量(kg)</th>' +
        (anyPrice ? '<th style="padding:5px 8px;text-align:right">概算金額(円)</th>' : '') +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr style="background:#f4f4fa;font-weight:700">' +
        '<td colspan="6" style="padding:5px 8px;text-align:right">合　計</td>' +
        '<td style="padding:5px 8px;text-align:right">' +
          (typeof _wFmtKg === 'function' ? _wFmtKg(sumKg) : sumKg.toFixed(1)) + ' kg</td>' +
        (anyPrice ? '<td style="padding:5px 8px;text-align:right">' + Number(sumAmt).toLocaleString() + ' 円</td>' : '') +
      '</tr></tfoot></table></div>';
  }).join('<hr style="border:none;border-top:1px solid #e0e0ea;margin:24px 0">');

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">' +
    '<title>重量計算書</title>' +
    '<style>*{box-sizing:border-box}body{font-family:sans-serif;font-size:12px;padding:20px}' +
    'h2{font-size:14px;margin-bottom:16px}' +
    '@media print{body{padding:0}}</style></head><body>' +
    '<h2>重量計算書</h2>' + allSections + '</body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
  saveCart(getCart().filter(function(x) { return !x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  closeCartModal();
}

function cartExportWeightCsv() {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) return;

  var lines = ['\uFEFF#,部材名,工区,種類,規格,長さ(mm),本数,合計重量(kg),概算金額(円),塗装金額(円)'];
  var idx = 1;
  cart.forEach(function(item) {
    (item.data.rows || []).forEach(function(r) {
      lines.push([
        idx++,
        '"' + (r.memo || '') + '"',
        '"' + (r.kuiku || '') + '"',
        '"' + r.kind + '"',
        '"' + r.spec + '"',
        r.len,
        r.qty,
        r.kgTotal.toFixed(2),
        r.amount !== null ? r.amount : '',
        r.paintAmount !== null ? r.paintAmount : ''
      ].join(','));
    });
  });

  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '重量計算リスト.csv';
  a.click();
  URL.revokeObjectURL(url);
  saveCart(getCart().filter(function(x) { return !x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  closeCartModal();
}

// ── コピー プレビュー ──────────────────────────────────────────
var _copyPendingTsv = '';

function cartCopyPreview(mode) {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) return;

  var rows = [];
  cart.forEach(function(item) { rows = rows.concat(item.data.rows || []); });

  var tsv = '';
  var previewHtml = '';

  if (mode === 'all') {
    var header = ['#', '部材名', '工区', '種類', '規格', '長さ(mm)', '本数', '1本重量(kg)', '合計重量(kg)'];
    var hasAmt = rows.some(function(r) { return r.amount !== null; });
    var hasM2 = rows.some(function(r) { return r.m2Total != null; });
    var hasPaint = rows.some(function(r) { return r.paintAmount !== null; });
    if (hasM2) header.push('塗装面積(m²)');
    if (hasAmt) header.push('概算金額(円)');
    if (hasPaint) header.push('塗装金額(円)');
    var dataRows = rows.map(function(r, i) {
      var row = [i + 1, r.memo || '—', r.kuiku || '', r.kind, r.spec, r.len, r.qty,
                 (r.kg1 || (r.kgTotal / r.qty)).toFixed(3), r.kgTotal.toFixed(2)];
      if (hasM2) row.push(r.m2Total != null ? r.m2Total.toFixed(2) : '—');
      if (hasAmt) row.push(r.amount !== null ? Math.round(r.amount) : '');
      if (hasPaint) row.push(r.paintAmount !== null ? Math.round(r.paintAmount) : '');
      return row;
    });
    tsv = [header].concat(dataRows).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header, dataRows);
    document.getElementById('copyPreviewTitle').textContent = '📋 すべてをコピー';
  } else if (mode === 'parts-simple') {
    var headerSimple = ['種類', '規格', '長さ(mm)', '本数', '合計重量(kg)'];
    var dataRowsSimple = rows.map(function(r) {
      return [r.kind, r.spec, r.len, r.qty, r.kgTotal.toFixed(2)];
    });
    tsv = [headerSimple].concat(dataRowsSimple).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(headerSimple, dataRowsSimple);
    document.getElementById('copyPreviewTitle').textContent = '📋 部材のみ（種類・規格・長さ・本数・重量）';
  } else if (mode === 'parts') {
    var header = ['#', '部材名', '工区', '種類', '規格', '長さ(mm)', '本数', '合計重量(kg)'];
    var hasAmt = rows.some(function(r) { return r.amount !== null; });
    if (hasAmt) header.push('概算金額(円)');
    var dataRows = rows.map(function(r, i) {
      var row = [i + 1, r.memo || '—', r.kuiku || '', r.kind, r.spec, r.len, r.qty, r.kgTotal.toFixed(2)];
      if (hasAmt) row.push(r.amount !== null ? Math.round(r.amount) : '');
      return row;
    });
    tsv = [header].concat(dataRows).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header, dataRows);
    document.getElementById('copyPreviewTitle').textContent = '📋 部材リスト';
  } else if (mode === 'amount') {
    var map = {};
    rows.forEach(function(r) {
      var key = r.kind + ' ' + r.spec;
      if (!map[key]) map[key] = { kind: r.kind, spec: r.spec, qty: 0, kg: 0, amt: 0, hasAmt: false };
      map[key].qty += r.qty;
      map[key].kg += r.kgTotal;
      if (r.amount !== null) { map[key].amt += r.amount; map[key].hasAmt = true; }
    });
    var header2 = ['種類', '規格', '本数', '合計重量(kg)', '概算金額(円)'];
    var dataRows2 = Object.values(map).map(function(v) {
      return [v.kind, v.spec, v.qty, v.kg.toFixed(2), v.hasAmt ? Math.round(v.amt) : '—'];
    });
    tsv = [header2].concat(dataRows2).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header2, dataRows2);
    document.getElementById('copyPreviewTitle').textContent = '📋 金額サマリー（規格別）';
  } else if (mode === 'total') {
    var sumKg = 0;
    var sumAmt = 0;
    var hasAmt2 = false;
    rows.forEach(function(r) {
      sumKg += r.kgTotal;
      if (r.amount !== null) { sumAmt += r.amount; hasAmt2 = true; }
    });
    var header3 = ['合計重量(kg)', '概算金額(円)'];
    var dataRows3 = [[sumKg.toFixed(2), hasAmt2 ? Math.round(sumAmt) : '—']];
    tsv = [header3].concat(dataRows3).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header3, dataRows3);
    document.getElementById('copyPreviewTitle').textContent = '📋 合計のみ';
  }

  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function cartCopyCutResult() {
  var cart = getCart().filter(function(x) { return !x.data.isWeight; });
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = [];
  cart.forEach(function(item) {
    var d = item.data || {};
    var sumMap = {};
    var bars = Array.isArray(d.bars) && d.bars.length ? d.bars : parseBarsFromDiagHtml(d.diagHtml || '', 0, d.endLoss || 150);
    bars.forEach(function(bar) {
      var pat = Array.isArray(bar.pat) ? bar.pat : [];
      pat.forEach(function(len) { if (len) sumMap[len] = (sumMap[len] || 0) + 1; });
    });
    Object.keys(sumMap).map(Number).sort(function(a, b) { return b - a; }).forEach(function(len) {
      rows.push([d.spec || '', len, sumMap[len]]);
    });
  });
  var header = ['規格', '長さ(mm)', '本数'];
  var tsv = [header].concat(rows).map(function(r) { return r.join('\t'); }).join('\r\n');
  var previewHtml = buildCopyPreviewTable(header, rows);
  document.getElementById('copyPreviewTitle').textContent = '📋 計算結果（切断リスト）';
  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function cartCopyCutStock() {
  var cart = getCart().filter(function(x) { return !x.data.isWeight; });
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = [];
  cart.forEach(function(item) {
    var d = item.data || {};
    var bars = Array.isArray(d.bars) && d.bars.length ? d.bars : parseBarsFromDiagHtml(d.diagHtml || '', 0, d.endLoss || 150);
    var slCount = {};
    bars.forEach(function(bar) { var sl = bar.sl || 0; if (sl) slCount[sl] = (slCount[sl] || 0) + 1; });
    Object.keys(slCount).map(Number).sort(function(a, b) { return b - a; }).forEach(function(sl) {
      rows.push([d.spec || '', sl, slCount[sl]]);
    });
  });
  var header = ['規格', '定尺', '使用本数'];
  // ヘッダーなし・値のみのTSV（メール・Excelにそのまま貼り付け用）
  var tsv = rows.map(function(r) { return r.join('\t'); }).join('\r\n');
  var previewHtml = buildCopyPreviewTable(header, rows);
  document.getElementById('copyPreviewTitle').textContent = '📋 使用予定の母材';
  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function buildCopyPreviewTable(headers, rows) {
  var th = headers.map(function(h) {
    return '<th style="padding:5px 10px;background:var(--bg2);text-align:left;white-space:nowrap;font-size:10px">' + h + '</th>';
  }).join('');
  var tbody = rows.map(function(r) {
    var tds = r.map(function(c) {
      return '<td style="padding:4px 10px;border-top:1px solid var(--line);white-space:nowrap">' + c + '</td>';
    }).join('');
    return '<tr>' + tds + '</tr>';
  }).join('');
  return '<table style="border-collapse:collapse;width:100%"><thead><tr>' + th + '</tr></thead><tbody>' + tbody + '</tbody></table>';
}

function executeCopy() {
  if (!_copyPendingTsv) return;
  navigator.clipboard.writeText(_copyPendingTsv).then(function() {
    var btn = document.getElementById('copyExecBtn');
    if (btn) { btn.textContent = '✓ コピーしました'; btn.disabled = true; }
    setTimeout(closeCopyPreview, 900);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = _copyPendingTsv;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    var btn = document.getElementById('copyExecBtn');
    if (btn) { btn.textContent = '✓ コピーしました'; btn.disabled = true; }
    setTimeout(closeCopyPreview, 900);
  });
}

function closeCopyPreview() {
  _copyPendingTsv = '';
  var m = document.getElementById('copyPreviewModal');
  if (m) m.style.display = 'none';
  var btn = document.getElementById('copyExecBtn');
  if (btn) { btn.textContent = '📋 コピー実行'; btn.disabled = false; }
}

var INVENTORY_REMNANT_SELECTED_KEY = 'toriai_inventory_remnant_selected_v1';

function getSelectedInventoryRemnants() {
  try {
    var parsed = JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var row = document.createElement('div');
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var options = '';
  for (var q = 1; q <= (item.qty || 1); q++) {
    options += '<option value="' + q + '"' + (q === usage ? ' selected' : '') + '>' + q + '本</option>';
  }
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = String(item.ids || []);
  row.dataset.inventoryIds = JSON.stringify(item.ids || []);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group"><span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span><span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span></div>' +
    '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '<div class="rem-meta">今回使う本数 / ' + escapeHtml(item.company || item.label || '在庫から選択') + '</div>' +
    '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function getRemnants() {
  var result = [];
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var title = row.querySelector('.rem-label-title');
    var qtyEl = row.querySelector('.rem-qty');
    var len = parseInt((title && title.textContent || '').replace(/[^\d]/g, ''), 10);
    var qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
    if (!len || !qty) return;
    for (var k = 0; k < qty; k++) result.push(len);
  });
  return result;
}

function normalizeInterfaceChrome() {
  document.title = 'TORIAIー鋼材取り合い計算ツールー';
  var head = document.querySelector('.remnant-head');
  if (head) {
    var addBtn = head.querySelector('.rem-add-btn');
    if (addBtn) addBtn.remove();
  }

  var labelMap = [
    ['#histModal div[style*="font-size:14px;font-weight:700"]', '入力履歴'],
    ['#cartModal .cart-modal-hd span[style*="font-size:15px"]', '印刷カート'],
    ['#histPreviewModal div[style*="font-size:14px;font-weight:700;color:#1a1a2e"]', '作業指示書プレビュー']
  ];
  labelMap.forEach(function(entry) {
    var el = document.querySelector(entry[0]);
    if (el) el.textContent = entry[1];
  });

  var remHead = document.querySelector('.remnant-head span');
  if (remHead) remHead.textContent = '計算に使う残材';
  var invBtn = document.getElementById('invUseBtn');
  if (invBtn) invBtn.textContent = '追加';
  var invSelect = document.getElementById('invSelect');
  if (invSelect && invSelect.options.length) {
    invSelect.options[0].textContent = '在庫から使いたい残材を選択';
  }

  ['#cartModal button[onclick="cartPrintCutting()"]', '#histPreviewModal button[onclick="printHistoryPreview()"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) {
      el.textContent = sel.indexOf('#cartModal') === 0 ? '切断指示書を印刷' : '印刷';
      if (sel.indexOf('#histPreviewModal') === 0) el.classList.add('preview-action-btn');
    }
  });
  ['#cartModal button[onclick="closeCartModal()"]', '#histPreviewModal button[onclick*="histPreviewModal"]', '#histModal button[onclick*="histModal"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) el.textContent = '閉じる';
  });
  var clearBtn = document.querySelector('#cartModal button[onclick="cartClearAll()"]');
  if (clearBtn) {
    clearBtn.textContent = '全クリア';
    clearBtn.classList.add('cart-danger-btn');
  }
  var cartCloseBtn = document.querySelector('#cartModal button[onclick="closeCartModal()"]');
  if (cartCloseBtn) cartCloseBtn.classList.add('cart-danger-btn');
  var previewModal = document.getElementById('histPreviewModal');
  if (previewModal && !previewModal.dataset.outsideCloseBound) {
    previewModal.dataset.outsideCloseBound = '1';
    previewModal.addEventListener('click', function(e) {
      if (e.target === previewModal) previewModal.style.display = 'none';
    });
  }
}

// ── Universal Custom <select> ──────────────────────────────
/**
 * Replace a native <select> with a fully-styleable custom dropdown.
 * The native element is hidden but kept in the DOM so all existing
 * JS (onchange, value reads, etc.) continues to work unchanged.
 *
 * opts: {
 *   cls      : extra CSS class on the wrapper (e.g. 'cs-sort', 'cs-inv')
 *   dataTab  : boolean — adds cs-wrap--data for blue hover variant
 *   flex1    : boolean — wrapper gets flex:1 (for flex children)
 *   block    : boolean — wrapper displays as block (full width)
 * }
 */
function initCustomSelect(id, opts) {
  opts = opts || {};
  var native = document.getElementById(id);
  if (!native || native._csInit) return;
  native._csInit = true;

  // ── Build wrapper ──────────────────────────────────────
  var wrapClass = 'cs-wrap';
  if (opts.cls)     wrapClass += ' ' + opts.cls;
  if (opts.dataTab) wrapClass += ' cs-wrap--data';
  if (opts.flex1)   wrapClass += ' cs-flex1';
  if (opts.block)   wrapClass += ' cs-block';

  var wrap     = document.createElement('div');
  var trigger  = document.createElement('button');
  var lbl      = document.createElement('span');
  var arrow    = document.createElement('span');
  var dropdown = document.createElement('div');

  wrap.className     = wrapClass;
  if (opts.wrapStyle) wrap.style.cssText = opts.wrapStyle;
  trigger.type       = 'button';
  trigger.className  = 'cs-trigger';
  lbl.className      = 'cs-label';
  arrow.className    = 'cs-arrow';
  arrow.textContent  = '▾';
  dropdown.className = 'cs-dropdown';

  trigger.appendChild(lbl);
  trigger.appendChild(arrow);
  wrap.appendChild(trigger);
  wrap.appendChild(dropdown);

  // Insert wrapper before native, then hide native
  native.parentNode.insertBefore(wrap, native);
  native.style.display = 'none';
  // Move native inside wrap so it stays logically grouped
  wrap.appendChild(native);

  // ── Sync custom UI ← native options ───────────────────
  function sync() {
    var selVal = native.value;
    var selText = null;
    dropdown.innerHTML = '';
    Array.from(native.options).forEach(function(opt) {
      var div = document.createElement('div');
      div.className = 'cs-option' + (opt.value === selVal ? ' cs-option--selected' : '');
      div.dataset.value = opt.value;
      div.textContent = opt.text;
      div.addEventListener('mousedown', function(e) {
        e.preventDefault(); // prevent blur-before-click race
        if (native.value !== opt.value) {
          native.value = opt.value;
          native.dispatchEvent(new Event('change', { bubbles: true }));
        }
        close();
      });
      dropdown.appendChild(div);
      if (opt.value === selVal) selText = opt.text;
    });
    lbl.textContent = selText !== null ? selText
      : (native.options[0] ? native.options[0].text : '');
  }

  // ── Open / Close ───────────────────────────────────────
  function open() {
    document.querySelectorAll('.cs-wrap.cs-open').forEach(function(w) {
      if (w !== wrap) w.classList.remove('cs-open');
    });
    wrap.classList.add('cs-open');
    var sel = dropdown.querySelector('.cs-option--selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function close() { wrap.classList.remove('cs-open'); }
  function toggle() { wrap.classList.contains('cs-open') ? close() : open(); }

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    toggle();
  });
  document.addEventListener('mousedown', function(e) {
    if (!wrap.contains(e.target)) close();
  });
  // Keyboard: Enter/Space toggle, Escape close, arrows navigate
  trigger.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!wrap.classList.contains('cs-open')) { open(); return; }
      var items = dropdown.querySelectorAll('.cs-option');
      var cur = Array.from(items).findIndex(function(o) { return o.classList.contains('cs-option--selected'); });
      var next = e.key === 'ArrowDown' ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);
      if (items[next]) items[next].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }
  });

  // ── Watch native for external option / value changes ──
  new MutationObserver(sync).observe(native, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['value', 'selected']
  });
  native.addEventListener('change', sync);

  sync();
}

// ── Initialize all custom selects ─────────────────────────
(function() {
  function doInit() {
    initCustomSelect('hsSort',         { cls: 'cs-sort' });
    initCustomSelect('invSort',        { cls: 'cs-sort' });
    initCustomSelect('invSelect',      { cls: 'cs-inv', flex1: true });
    initCustomSelect('dataKindSelect', {
      block: true, dataTab: true,
      wrapStyle: 'margin:10px 0 14px;max-width:280px'
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit, { once: true });
  } else {
    doInit();
  }
})();
