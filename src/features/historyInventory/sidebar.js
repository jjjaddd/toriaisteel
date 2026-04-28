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

