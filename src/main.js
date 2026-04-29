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

function getInventoryUi() {
  return window.Toriai && window.Toriai.ui ? window.Toriai.ui.inventory : null;
}

/** 切り出し部材リストの全行を選択状態にする */
/**
 * 任意の日付値を "YYYY-MM-DD" 文字列に正規化（文字列比較用）
 * "2026/4/12" → "2026-04-12"
 * "2026-04-12T06:30:00Z" → "2026-04-12"
 */

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
  var inventoryUi = getInventoryUi();
  if (inventoryUi && typeof inventoryUi.syncInventoryToRemnants === 'function') {
    inventoryUi.syncInventoryToRemnants();  // 在庫から自動同期
  }
  updKg();
  buildJobDatalist();
  updateCartBadge();
  var invSelect = document.getElementById('invSelect');
  if (invSelect && inventoryUi && typeof inventoryUi.updateInventoryUseButton === 'function') {
    invSelect.addEventListener('change', inventoryUi.updateInventoryUseButton);
  }
  var cartBulkPrintBtn = document.querySelector('#cartModal [onclick="cartPrintCutting()"]');
  if (cartBulkPrintBtn) cartBulkPrintBtn.classList.add('cart-bulk-print');
  if (inventoryUi && typeof inventoryUi.updateInventoryUseButton === 'function') {
    inventoryUi.updateInventoryUseButton();
  }

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


