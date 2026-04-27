/**
 * main.js  —  UI 操作・DOM 更新・イベントハンドラ・初期化
 *
 * storage.js と calc.js に依存する。
 * DOM を直接操作する関数はすべてここに置く。
 */

// ── アプリ状態 ─────────────────────────────────────────
var ROWS         = 13;   // 部材リスト初期行数
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

// 詳細設定ポップアップは src/features/gearPopup/gearPopup.js に分離

function goPage(p) {
  if (window.Toriai && window.Toriai.ui && window.Toriai.ui.pageState) {
    window.Toriai.ui.pageState.setActivePage(p);
  }
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
  var firstKind = getAppSteelKinds()[0];
  var firstRow = firstKind ? getAppSteelRows(firstKind)[0] : null;
  if (firstKind && firstRow) {
    cmdSelect({ kind: firstKind, spec: firstRow[0], kgm: firstRow[1] });
    document.getElementById('cmdInput').value = '';
    var initKgm = document.getElementById('cmdKgm');
    if (initKgm) initKgm.textContent = '';
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

function getAppSteelKinds() {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getAllKinds === 'function') {
    return window.Toriai.data.steel.getAllKinds();
  }
  return (typeof getCalcEnabledKinds === 'function') ? getCalcEnabledKinds() : [];
}

function ensureSteelCatalogReady() {
  var kinds = getAppSteelKinds();
  if (Array.isArray(kinds) && kinds.length) return kinds;

  if (typeof getCalcEnabledKinds === 'function') {
    kinds = getCalcEnabledKinds() || [];
  }
  return Array.isArray(kinds) ? kinds : [];
}

function getAppSteelRows(kind) {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getRowsByKind === 'function') {
    var rows = window.Toriai.data.steel.getRowsByKind(kind);
    if (Array.isArray(rows) && rows.length) return rows;
  }
  if (typeof getSteelRowsForKind === 'function') {
    return getSteelRowsForKind(kind) || [];
  }
  return [];
}

function getAppSteelRow(kind, spec) {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.findRowByKindAndSpec === 'function') {
    return window.Toriai.data.steel.findRowByKindAndSpec(kind, spec);
  }
  var rows = getAppSteelRows(kind);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === spec) return rows[i];
  }
  return null;
}


function onSpec() {
  updateInvDropdown();
  var spec = document.getElementById('spec').value;
  var cmdInput = document.getElementById('cmdInput');
  var row = (typeof getSteelRow === 'function')
    ? getSteelRow(curKind, spec)
          : getAppSteelRow(curKind, spec);
  if (row) {
    document.getElementById('kgm').value = row[1];
  }
  var kgmDisp = document.getElementById('cmdKgm');
  if (kgmDisp) kgmDisp.textContent = (cmdInput && (cmdInput.value || '').trim()) ? (row ? row[1] + ' kg/m' : '') : '';
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
  var kinds = getAppSteelKinds();
  sel.innerHTML = '<option value="">すべて</option>' +
    kinds.map(function(k){ return '<option value="'+k+'">'+k+'</option>'; }).join('');
  buildInvFilterSpec();
}

function buildInvFilterSpec() {
  var kindSel = document.getElementById('invFilterKind');
  var specSel = document.getElementById('invFilterSpec');
  if (!specSel) return;
  var kind = kindSel ? kindSel.value : '';
  var specs = kind ? getAppSteelRows(kind).map(function(s){return s[0];}) : [];
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
  getAppSteelKinds().forEach(function(k) {
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
  getAppSteelRows(k).forEach(function(row) {
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
    '<p>鋼材を選択し長さ、数量を入力して「計算を実行する」を押してください</p>' +
    '<small>右下設定マークから刃厚・端部ロス・使用する定尺を設定できます。</small>';
  rp.appendChild(ph);
}



// changelog / calcOnboarding / headerMenu は src/features/changelogModal/changelogModal.js, src/features/calcOnboarding/calcOnboarding.js, src/ui/header/headerMenu.js に分離


// ── 初期化 ──────────────────────────────────────────────

// ══════════════════════════════════════════════════════
// 🛒 カート機能
// ══════════════════════════════════════════════════════

/** カートバッジを更新 */

/** カードの情報を収集してカートに追加 */


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

function formatMaterialTotalWeightKg(value) {
  var num = Number(value);
  if (!isFinite(num) || num <= 0) return '—';
  return (Math.round(num * 10) / 10).toLocaleString() + ' kg';
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
  var htmlUtils = window.Toriai && window.Toriai.utils && window.Toriai.utils.html;
  var safeValue = htmlUtils && typeof htmlUtils.escapeAttribute === 'function'
    ? htmlUtils.escapeAttribute(value || '')
    : escapeHtml(value || '');
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


function buildCardActionButtons(cardId, includeAdd) {
  var html = '';
  if (includeAdd) {
    html += '<button class="cc-btn-add" id="add_' + cardId + '" onclick="cartAdd(\'' + cardId + '\',this)">＋</button>';
  }
  html += '<button class="cc-btn-mini" type="button" onclick="printCard(\'' + cardId + '\')" aria-label="印刷">🖨</button>';
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
