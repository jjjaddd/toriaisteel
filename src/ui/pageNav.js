function syncGearButtonVisibility() {
  var gearBtn = document.getElementById('gearBtn');
  if (!gearBtn) return;
  var cp = document.getElementById('cp');
  var activePage = window.Toriai && window.Toriai.ui && window.Toriai.ui.pageState &&
    typeof window.Toriai.ui.pageState.getActivePage === 'function'
    ? window.Toriai.ui.pageState.getActivePage()
    : null;
  var show = (activePage === 'c') || !!(cp && cp.classList.contains('show'));
  gearBtn.hidden = !show;
  gearBtn.style.display = show ? 'flex' : '';
}

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
  syncGearButtonVisibility();
}

document.addEventListener('DOMContentLoaded', syncGearButtonVisibility);

// ============================================================
// 初期化

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
// ── 履歴ページ：規格ドロップダウンを自動構築 ──


// ── 端材優先切断（目標端材長さを考慮したストック選択） ──




