/**
 * main.js  —  UI 操作・DOM 更新・イベントハンドラ・初期化
 *
 * storage.js と calc.js に依存する。
 * DOM を直接操作する関数はすべてここに置く。
 */

// ── アプリ状態 ─────────────────────────────────────────
var ROWS         = 10;   // 部材リスト初期行数
var curKind      = 'H形鋼';
var totalRows    = 0;
var remnantCount = 0;
var pieceColorMap = {};
var _lastCalcResult = null;
var _lastAllDP = [], _lastPatA = null, _lastPatB = null;
var HISTORY_PAGE_SIZE = 10;
var INVENTORY_PAGE_SIZE = 12;
var historyPage = 1;
var inventoryPage = 1;

function parseDateValue(value) {
  if (!value) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T00:00:00').getTime();
  var parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function paginateItems(items, page, size) {
  var totalPages = Math.max(1, Math.ceil(items.length / size));
  var safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    page: safePage,
    totalPages: totalPages,
    items: items.slice((safePage - 1) * size, safePage * size)
  };
}

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
  document.getElementById('hiTabH').classList.toggle('hi-tab-active', showH);
  document.getElementById('hiTabI').classList.toggle('hi-tab-active', !showH);
  // ナビもハイライト更新
  ['na','nhi','nw'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  var navEl = document.getElementById(showH ? 'nhi' : 'ninv');
  if (navEl) navEl.classList.add('active');
  if (showH) { buildHistSpecDropdown(); renderHistory(); }
  else { buildInvFilterKind(); buildInvAddKind(); renderInventoryPage(); }
}

function hiToggleFilter() {
  var panel = document.getElementById('hiFilterPanel');
  var btn = document.getElementById('hiFilterBtn');
  if (!panel) return;
  var open = panel.classList.contains('open');
  panel.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('active', !open);
}

function invToggleFilter() {
  var panel = document.getElementById('invFilterPanel');
  var btn = document.getElementById('invFilterBtn');
  if (!panel) return;
  var open = panel.classList.contains('open');
  panel.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('active', !open);
}

// 期間チップ
var _hiChipActive = 0;
function hiChip(n) {
  _hiChipActive = (_hiChipActive === n) ? 0 : n;
  [1,2,3,4].forEach(function(i) {
    var c = document.getElementById('hChip' + i);
    if (c) c.classList.toggle('on', i === _hiChipActive);
  });
  var now = new Date();
  var from = '', to = '';
  if (_hiChipActive === 1) {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    to = now.toISOString().slice(0,10);
  } else if (_hiChipActive === 2) {
    from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10);
    to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10);
  } else if (_hiChipActive === 3) {
    from = new Date(now.getFullYear(), now.getMonth()-3, 1).toISOString().slice(0,10);
    to = now.toISOString().slice(0,10);
  } else if (_hiChipActive === 4) {
    from = now.getFullYear() + '-01-01';
    to = now.toISOString().slice(0,10);
  }
  var df = document.getElementById('hsDateFrom');
  var dt = document.getElementById('hsDateTo');
  if (df) df.value = from;
  if (dt) dt.value = to;
  renderHistory();
}

function goPage(p) {
  document.querySelectorAll('.pg').forEach(function(el){ el.classList.remove('show'); });
  // ナビ全リセット
  ['na','nhi','nw'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  if (p === 'c') {
    var cp = document.getElementById('cp');
    var na = document.getElementById('na');
    if (cp) cp.classList.add('show');
    if (na) na.classList.add('active');
  } else if (p === 'w') {
    var wpp = document.getElementById('wpp');
    var nw = document.getElementById('nw');
    if (wpp) wpp.classList.add('show');
    if (nw) nw.classList.add('active');
    if (typeof wInit === 'function') wInit();
  } else if (p === 'contact') {
    var cop = document.getElementById('cop');
    if (cop) cop.classList.add('show');
  } else {
    var hip = document.getElementById('hip');
    var nhi = document.getElementById('nhi');
    if (hip) hip.classList.add('show');
    if (nhi) nhi.classList.add('active');
    var showH = (p !== 'i');
    var hiPanelH = document.getElementById('hiPanelH');
    var hiPanelI = document.getElementById('hiPanelI');
    var hiTabH = document.getElementById('hiTabH');
    var hiTabI = document.getElementById('hiTabI');
    if (hiPanelH) hiPanelH.style.display = showH ? 'block' : 'none';
    if (hiPanelI) hiPanelI.style.display = showH ? 'none' : 'block';
    if (hiTabH) hiTabH.classList.toggle('hi-tab-active', showH);
    if (hiTabI) hiTabI.classList.toggle('hi-tab-active', !showH);
    if (showH) { buildHistSpecDropdown(); renderHistory(); }
    else { buildInvFilterKind(); renderInventoryPage(); }
  }
}

// ============================================================
// 初期化
// ============================================================
function init() {
  // 在庫定尺
  var sl = document.getElementById('stkList');
  if(sl) sl.innerHTML='';
  if(sl) STD.forEach(function(len, i) {
    var d = document.createElement('div');
    d.className = 'stk-row';
    d.id = 'sr' + i;
    d.style.cursor = 'pointer';
    d.innerHTML =
      '<input type="checkbox" id="sc' + i + '" checked onchange="togStk(' + i + ');saveSettings()">' +
      '<span class="stk-nm">' + len.toLocaleString() + '</span>' +
      '<div style="display:flex;align-items:center;gap:2px">' +
        '<button onclick="stkDown(' + i + ')" style="width:18px;height:18px;border:1px solid #d4d4dc;background:#fff;border-radius:4px;cursor:pointer;font-size:11px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0">▼</button>' +
        '<span id="sm_lbl' + i + '" onclick="stkEdit(' + i + ')" style="min-width:22px;text-align:center;font-size:11px;font-weight:600;color:#1a1a2e;cursor:pointer" title="クリックで直接入力">∞</span>' +
        '<input type="number" class="stk-mx" id="sm' + i + '" placeholder="∞" min="1" onchange="stkInputChange(' + i + ')" style="display:none;width:36px">' +
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
  });

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
  var cartBulkPrintBtn = document.querySelector('#cartModal [onclick="cartDoPrint()"]');
  if (cartBulkPrintBtn) cartBulkPrintBtn.classList.add('cart-bulk-print');
  updateInventoryUseButton();

  // 初期規格を自動選択（H形鋼の最初の規格）
  var firstKind = Object.keys(STEEL)[0];
  if (firstKind && STEEL[firstKind] && STEEL[firstKind][0]) {
    cmdSelect({ kind: firstKind, spec: STEEL[firstKind][0][0], kgm: STEEL[firstKind][0][1] });
    document.getElementById('cmdInput').value = '';
  }
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
  d.innerHTML =
    '<span class="pt-n">' + (i+1) + '</span>' +
    '<input type="number" id="pl' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onkeydown="ptEnter(event,' + i + ',\'l\')" style="text-align:right">' +
    '<input type="number" id="pq' + i + '" placeholder="—" min="1" inputmode="numeric" oninput="updKg()" onkeydown="ptEnter(event,' + i + ',\'q\')" style="text-align:right">' +
    '<input type="text" id="pz' + i + '" placeholder="工区" style="display:none">' +
    '<span class="pt-kg" id="pk' + i + '">—</span>';
  pl.appendChild(d);
}

/** テンキーEnterで次のセルへ移動 */
function ptEnter(e, i, col) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (col === 'l') {
    // 長さ → 数量へ
    var next = document.getElementById('pq' + i);
    if (next) { next.focus(); next.select(); }
  } else if (col === 'q') {
    // 数量 → 次の行の長さへ（なければ行追加）
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

// コマンドパレット：ドロップダウンを開く
function cmdOpen() {
  cmdFilter();
  document.getElementById('cmdDropdown').style.display = 'block';
  document.addEventListener('mousedown', cmdOutside);
}

// コマンドパレット：外クリックで閉じる
function cmdOutside(e) {
  var wrap = document.getElementById('cmdPaletteWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('cmdDropdown').style.display = 'none';
    document.removeEventListener('mousedown', cmdOutside);
  }
}

// コマンドパレット：絞り込み描画
function cmdFilter() {
  var input = document.getElementById('cmdInput');
  var dd = document.getElementById('cmdDropdown');
  if (!input || !dd) return;
  var q = (input.value || '').trim().toLowerCase();
  var all = cmdBuildAll();
  var filtered = q ? all.filter(function(it) {
    return it.kind.toLowerCase().indexOf(q) >= 0 ||
           it.spec.toLowerCase().indexOf(q) >= 0 ||
           it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0;
  }) : all;

  dd.innerHTML = '';
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
    row.onmousedown = function(e) { e.preventDefault(); cmdSelect(it); };
    dd.appendChild(row);
  });
  dd.style.display = 'block';
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
  setTimeout(function() {
    var pl0 = document.getElementById('pl0');
    if (pl0) { pl0.focus(); pl0.select(); }
  }, 50);
}

// コマンドパレット：キーボード操作（↑↓Enter）
function cmdKey(e) {
  var dd = document.getElementById('cmdDropdown');
  if (!dd) return;
  var items = dd.querySelectorAll('.cmd-item');
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
    if (focused && focused.onmousedown) focused.onmousedown(e);
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
  }
}

function onSpec() {
  updateInvDropdown();
  var spec = document.getElementById('spec').value;
  var list = STEEL[curKind] || [];
  var row = list.find(function(r) { return r[0] === spec; });
  var badge = document.getElementById('kgmBadge');
  if (row) {
    document.getElementById('kgm').value = row[1];
  }
  updKg();
  buildInventoryDropdown();
}

function legacyBuildInventoryDropdown_v1() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  if (!items.length) { cont.style.display = 'none'; updateInventoryUseButton(); return; }
  // 在庫あり → バッジ＋ドロップダウン表示
  cont.style.display = 'block';
  var badge = document.getElementById('invBadge');
  var total = items.reduce(function(s,it){return s+it.qty;},0);
  if (badge) badge.textContent = '在庫 ' + total + '本';
  var sel = document.getElementById('invSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">── 在庫から残材に追加 ──</option>';
  items.forEach(function(it) {
    var o = document.createElement('option');
    o.value = it.len + ':' + it.qty + ':' + (it.label||'');
    var d = it.label ? ' ['+it.label+']' : '';
    o.textContent = it.len.toLocaleString() + 'mm × ' + it.qty + '本' + d + '  (' + it.date + ')';
    sel.appendChild(o);
  });
  updateInventoryUseButton();
}

function updateInventoryUseButton(forceReady) {
  var btn = document.getElementById('invUseBtn');
  var sel = document.getElementById('invSelect');
  if (!btn) return;
  if (forceReady) {
    btn.textContent = '✓追加済み';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
    btn.disabled = true;
    return;
  }
  btn.textContent = '計算に使う';
  btn.style.background = 'transparent';
  btn.style.color = '#16a34a';
  btn.disabled = !(sel && sel.value);
}

function legacyAddFromInventory_v1() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var parts = sel.value.split(':');
  var len = parseInt(parts[0]);
  var qty = parseInt(parts[1]);
  if (!len || !qty) return;
  addRemnant();
  var i = remnantCount - 1;
  document.getElementById('remLen'+i).value = len;
  document.getElementById('remQty'+i).value = qty;
  saveRemnants();
  sel.value = '';
  // ボタンを「追加済み」に変化
  var btn = document.getElementById('invUseBtn');
  if (btn) {
    btn.textContent = '✓ 追加済み';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
    btn.disabled = true;
    // 2秒後に戻す
    setTimeout(function() {
      btn.textContent = '＋ 計算に使う';
      btn.style.background = 'transparent';
      btn.style.color = '#16a34a';
      btn.disabled = false;
    }, 2000);
  }
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
      el.textContent = Math.round(kg) + 'kg';
      tot += kg;
    } else {
      el.textContent = '—';
    }
  }
  document.getElementById('totkg').textContent = tot > 0 ? Math.round(tot) + ' kg' : '—';
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

function addRemnant() {
  var list = document.getElementById('remnantList');
  var i = remnantCount++;
  var d = document.createElement('div');
  d.className = 'rem-row';
  d.id = 'remRow' + i;
  d.innerHTML =
    '<span class="rem-label">長さ</span>' +
    '<input type="number" id="remLen' + i + '" placeholder="" min="1" style="flex:1" onchange="saveRemnants()">' +
    '<span class="rem-label">本数</span>' +
    '<input type="number" id="remQty' + i + '" placeholder="1" min="1" value="1" style="width:44px" onchange="saveRemnants()">' +
    '<button class="rem-del" onclick="removeRemnant(' + i + ');saveRemnants()">✕</button>';
  list.appendChild(d);
}

function legacyRemoveRemnant_v1(i) {
  var el = document.getElementById('remRow' + i);
  if (el) el.remove();
}

function getRemnants() {
  var result = [];
  for (var i = 0; i < remnantCount; i++) {
    var lEl = document.getElementById('remLen' + i);
    var qEl = document.getElementById('remQty' + i);
    if (!lEl) continue;
    var l = parseInt(lEl.value);
    var q = parseInt(qEl.value) || 1;
    if (l > 0) {
      for (var k = 0; k < q; k++) result.push(l);
    }
  }
  return result;
}

// ── 在庫と手持ち残材を完全同期 ──
function legacySyncInventoryToRemnants_v1() {
  var inv = getInventory();
  var list = document.getElementById('remnantList');
  if (!list) return;

  list.innerHTML = '';
  remnantCount = 0;

  if (!inv.length) {
    addRemnant();
    return;
  }

  inv.forEach(function(item) {
    var i = remnantCount++;
    var d = document.createElement('div');
    d.className = 'rem-row';
    d.id = 'remRow' + i;
    // 使用本数の最大は登録本数（デフォルト1）
    var maxQty = item.qty || 1;
    d.innerHTML =
      '<span class="rem-label">長さ</span>' +
      '<input type="number" id="remLen' + i + '" value="' + item.len + '" min="1" style="flex:1" readonly ' +
        'onchange="saveRemnants()">' +
      '<span class="rem-label">使用</span>' +
      '<select id="remQty' + i + '" style="width:52px;font-size:11px;padding:3px 4px;border:1px solid #d4d4dc;border-radius:6px;background:#fff;color:#1a1a2e" onchange="saveRemnants()">' +
        (function(){
          var opts = '<option value="0">0本</option>';
          for(var q=1;q<=maxQty;q++) opts += '<option value="'+q+'"'+(q===1?' selected':'')+'>'+q+'本</option>';
          return opts;
        })() +
      '</select>' +
      '<span style="font-size:10px;color:#8888a8;white-space:nowrap">/ ' + maxQty + '本</span>' +
      '<button class="rem-del" onclick="removeFromInventoryAndRemnant(' + item.id + ')">✕</button>';
    list.appendChild(d);
  });

  var rb = document.getElementById('remnantBody');
  if (rb && rb.style.display === 'none' && inv.length > 0) {
    toggleSection('remnantBody', 'remnantToggleBtn', '');
  }
}

// 在庫と残材から同時削除
function removeFromInventoryAndRemnant(invId) {
  var inv = getInventory().filter(function(x){ return x.id !== invId; });
  saveInventory(inv);
  syncInventoryToRemnants();
  updateInvDropdown();
  if (document.getElementById('ip') && document.getElementById('ip').classList.contains('show')) {
    renderInventoryPage();
  }
}

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
function legacyRenderInventoryPage_v1() {
  var cont = document.getElementById('invListCont');
  var empty = document.getElementById('invEmptyMsg');
  if (!cont) return;

  var kindF = ((document.getElementById('invFilterKind')||{}).value||'');
  var specF = ((document.getElementById('invFilterSpec')||{}).value||'');

  var inv = getInventory();
  if (kindF) inv = inv.filter(function(x){ return x.kind===kindF; });
  if (specF) inv = inv.filter(function(x){ return x.spec===specF; });

  if (!inv.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // 同じ長さ・規格・会社をまとめて数量表示
  var groups = {};
  inv.forEach(function(x){
    var specKey = x.spec||x.kind||'不明';
    if (!groups[specKey]) groups[specKey] = [];
    groups[specKey].push(x);
  });

  // 各規格グループ内で同じ長さ・会社をまとめる
  cont.innerHTML = Object.keys(groups).sort().map(function(spec) {
    var items = groups[spec];
    // 長い順に並べる
    items.sort(function(a,b){ return b.len - a.len; });

    var rows = items.map(function(x) {
      return '<div class="inv-row">'+
        '<span class="inv-len">'+x.len.toLocaleString()+'<span class="inv-len-unit">mm</span></span>'+
        '<span class="inv-qty">×1</span>'+
        '<span class="inv-note">'+(x.company||x.note ? (x.company||'')+(x.note?' '+x.note:'') : '—')+'</span>'+
        '<span class="inv-date">'+(x.addedDate||'')+'</span>'+
        '<button onclick="event.stopPropagation();deleteInventoryItem('+x.id+')" class="inv-del-btn">✕</button>'+
      '</div>';
    }).join('');

    return '<div class="inv-card">'+
      '<div class="inv-card-header">'+
        '<span class="inv-spec-label">'+spec+'</span>'+
        '<span class="inv-count-badge">'+items.length+'本</span>'+
        '<div style="flex:1"></div>'+
        '<span style="font-size:10px;color:#aaa">長さ</span>'+
        '<span style="font-size:10px;color:#aaa;margin-left:80px">会社名・メモ</span>'+
        '<span style="font-size:10px;color:#aaa;margin-left:auto">登録日</span>'+
      '</div>'+
      rows+
    '</div>';
  }).join('');
}

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

function clearAllInventory() {
  if (!confirm('全ての残材在庫を削除しますか？')) return;
  var keys = [];
  for (var i=0; i<localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(LS_INV_PREFIX)===0) keys.push(k);
  }
  keys.forEach(function(k){ localStorage.removeItem(k); });
  renderInventoryPage();
}

// 在庫→残材へボタン
function useInventoryItem(id) {
  var inv = getInventory();
  var item = inv.find(function(x){ return x.id===id; });
  if (!item) return;
  // 残材リストに追加
  addRemnant();
  var i = remnantCount - 1;
  document.getElementById('remLen'+i).value = item.len;
  document.getElementById('remQty'+i).value = 1;
  saveRemnants();
  // 在庫から削除
  inv = inv.filter(function(x){ return x.id!==id; });
  saveInventory(inv);
  renderInventoryPage();
  syncInventoryToRemnants();
  updateInvDropdown();
  // 残材セクションを展開してスクロール
  var rb = document.getElementById('remnantBody');
  if (rb && rb.style.display==='none') toggleSection('remnantBody','remnantToggleBtn','');
}

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
  var hist = getCutHistory();
  var specs = [];
  hist.forEach(function(h){ if(h.spec && specs.indexOf(h.spec)<0) specs.push(h.spec); });
  specs.sort();
  var cur = sel.value;
  sel.innerHTML = '<option value="">すべて</option>' +
    specs.map(function(s){ return '<option value="'+s+'"'+(s===cur?' selected':'')+'>'+s+'</option>'; }).join('');
}

// alias
function renderInventory() { renderInventoryPage(); }

// ── 履歴ページ描画 ──
function renderHistory() {
  var cont = document.getElementById('histList');
  var empty= document.getElementById('histEmpty');
  if (!cont) return;
  var hist = getCutHistory();

  var fc  = ((document.getElementById('hsClient')  ||{}).value||'').toLowerCase();
  var fn  = ((document.getElementById('hsName')    ||{}).value||'').toLowerCase();
  var fdf = ((document.getElementById('hsDateFrom')||{}).value||'');
  var fdt = ((document.getElementById('hsDateTo')  ||{}).value||'');
  var fs  = ((document.getElementById('hsSt')      ||{}).value||'');
  var fk  = ((document.getElementById('hsKind')    ||{}).value||'');

  if (fc)  hist = hist.filter(function(h){ return (h.client||'').toLowerCase().includes(fc); });
  if (fn)  hist = hist.filter(function(h){ return (h.name  ||'').toLowerCase().includes(fn); });
  if (fdf) hist = hist.filter(function(h){ return (h.deadline||'') >= fdf; });
  if (fdt) hist = hist.filter(function(h){ return (h.deadline||'') <= fdt; });
  if (fs)  hist = hist.filter(function(h){ return (h.spec  ||'') === fs; });
  if (fk)  hist = hist.filter(function(h){ return (h.kind  ||'') === fk; });

  // 新しい順にソート
  hist.sort(function(a, b) {
    var da = a.date ? new Date(a.date).getTime() : 0;
    var db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  if (!hist.length) {
    cont.innerHTML=''; if(empty)empty.style.display='block'; return;
  }
  if(empty) empty.style.display='none';

  // 日付ラベルをGoogle風に変換
  function friendlyDate(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = (today - target) / (1000 * 60 * 60 * 24);
    if (diff === 0) return '今日';
    if (diff === 1) return '昨日';
    if (diff < 7) return Math.floor(diff) + '日前';
    return (d.getMonth()+1) + '月' + d.getDate() + '日';
  }

  // 規格グループ別に表示
  var groups = {};
  hist.forEach(function(h){
    var key = h.spec || '規格不明';
    if (!groups[key]) groups[key] = [];
    groups[key].push(h);
  });

  cont.innerHTML = Object.keys(groups).sort().map(function(spec) {
    var items = groups[spec];
    var rows = items.map(function(h) {
    var rems = h.result && h.result.remnants ? h.result.remnants : [];
    var topDP = h.result && h.result.allDP && h.result.allDP[0] ? h.result.allDP[0].desc : '—';
    var remSizes = '';
    if (rems.length) {
      var remCnt = {};
      rems.forEach(function(r){ remCnt[r.len]=(remCnt[r.len]||0)+1; });
      remSizes = Object.keys(remCnt).map(Number).sort(function(a,b){return b-a;})
        .map(function(l){ return l.toLocaleString()+'mm'+(remCnt[l]>1?' ×'+remCnt[l]:''); }).join('　');
    }
    var dateLabel = friendlyDate(h.date);
    // 切断部材リスト（切ったものを表示）
    var pieceSummary = '';
    if (h.result && h.result.allDP && h.result.allDP[0] && h.result.allDP[0].bA) {
      var pieceCounts = {};
      h.result.allDP[0].bA.forEach(function(b){
        (b.pat||[]).forEach(function(len){ pieceCounts[len]=(pieceCounts[len]||0)+1; });
      });
      pieceSummary = Object.keys(pieceCounts).map(Number).sort(function(a,b){return b-a;})
        .map(function(l){ return l.toLocaleString()+'mm'+(pieceCounts[l]>1?' ×'+pieceCounts[l]:''); }).join('　');
    }
    return '<div class="hist-row" onclick="showHistPreview('+h.id+')">'+
      '<div class="hist-row-main">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
          '<span style="font-size:12px;font-weight:800;color:#1a1a2e">'+dateLabel+'</span>'+
          (h.spec?'<span class="hist-spec-badge">'+h.spec+'</span>':'')+
          (h.client?'<span style="font-size:11px;color:#5a5a78">'+h.client+'</span>':'')+
          (h.name?'<span style="font-size:11px;color:#8888a8">'+h.name+'</span>':'')+
        '</div>'+
        (pieceSummary?'<div style="font-size:11px;color:#1a1a2e;font-family:monospace">✂ '+pieceSummary+'</div>':'')+
        (remSizes?'<div style="font-size:10px;color:#8888a8;margin-top:2px">端材: '+remSizes+'</div>':'')+
      '</div>'+
      '<button onclick="event.stopPropagation();deleteCutHistory('+h.id+')" class="hist-del-btn">削除</button>'+
    '</div>';
    }).join('');
    return '<div class="hist-card">'+
      '<div class="hist-card-header">'+
        '<span class="hist-spec-badge" style="font-size:12px">'+spec+'</span>'+
        '<span class="inv-count-badge">'+items.length+'件</span>'+
      '</div>'+
      rows+
    '</div>';
  }).join('');
}

function showHistPreview(id) {
  var hist = getCutHistory();
  var h = hist.find(function(x){ return x.id===id; });
  if (!h) return;

  var modal = document.getElementById('histPreviewModal');
  var body  = document.getElementById('histPreviewBody');
  if (!modal || !body) return;

  var r       = h.result || {};
  var job     = {client:h.client||'', name:h.name||'', deadline:h.deadline||'', worker:h.worker||''};
  var endLoss = r.endLoss || 150;
  var spec    = h.spec || '';

  // 印刷したカードIDに基づいて正しいプランを選択
  var printedId = h.printedCardId || '';
  var isPat = printedId.indexOf('card_pat') === 0;
  var bars = [];
  if (isPat && r.patA && r.patA.bars) {
    bars = r.patA.bars;
  } else if (r.allDP && r.allDP[0]) {
    bars = r.allDP[0].bA || r.allDP[0].bars || [];
  }

  if (!bars.length) {
    body.innerHTML = '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
    modal.style.display = 'flex';
    return;
  }

  // 定尺ごとにグループ化
  var slGroups = {};
  bars.forEach(function(b) {
    var sl2 = b.sl || (r.allDP && r.allDP[0] ? r.allDP[0].slA : 0) || 0;
    if (!slGroups[sl2]) slGroups[sl2] = [];
    slGroups[sl2].push(b);
  });

  // 母材サマリー（例: 9,000mm×3 + 6,000mm×2）
  var motherSummary = Object.keys(slGroups).map(Number).sort(function(a,b){return b-a;})
    .map(function(s){ return s.toLocaleString()+'mm×'+slGroups[s].length; }).join(' + ');

  // 切断リスト（長さ合算）
  var sumMap = {};
  bars.forEach(function(b) {
    (b.pat||[]).forEach(function(len){ sumMap[len]=(sumMap[len]||0)+1; });
  });

  // 端材タグ
  var remTags = (h.remnants||[]).filter(function(r2){ return r2.len>=500; })
    .map(function(r2){ return r2.len.toLocaleString()+'mm'+(r2.qty>1?' ×'+r2.qty:''); });

  // 切断図（定尺ごとに buildPrintBarHtml）
  var barHtml = '';
  Object.keys(slGroups).map(Number).sort(function(a,b){return b-a;}).forEach(function(sl2) {
    barHtml += buildPrintBarHtml(slGroups[sl2], sl2, endLoss);
  });

  var sections = [{
    idx: 1,
    spec: spec,
    motherSummary: motherSummary,
    sumMap: sumMap,
    remTags: remTags,
    barHtml: barHtml,
  }];

  body.innerHTML = buildPrintPages(job, sections);
  modal.style.display = 'flex';
}

function _previewCell(label, val) {
  return '<div><div style="font-size:10px;color:#8888a8;margin-bottom:2px">'+label+'</div>' +
    '<div style="font-size:12px;font-weight:700;color:#2a2a3e">'+(val||'—')+'</div></div>';
}

// 保存データから切断図を生成（DOM非依存版）
function buildCutDiagramFromData(bars, slLen, label, blade, endLoss) {
  if (!bars || !bars.length) return '';
  // groupBarsと同じロジックをシンプルに実装
  var grouped = {};
  bars.forEach(function(b){
    var key = b.pat.slice().sort(function(a,c){return c-a;}).join(',');
    if (!grouped[key]) grouped[key] = {pat:b.pat.slice().sort(function(a,c){return c-a;}), loss:b.loss, cnt:0};
    grouped[key].cnt++;
  });
  var groups = Object.values(grouped).sort(function(a,b){return b.cnt-a.cnt;});

  // 部材カラーマップ
  var colors = ['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9'];
  var allLens = [];
  bars.forEach(function(b){b.pat.forEach(function(p){if(allLens.indexOf(p)<0)allLens.push(p);});});
  allLens.sort(function(a,b){return b-a;});
  var cmap = {};
  allLens.forEach(function(l,i){cmap[l]=colors[i%colors.length];});

  var html = '<div class="cut-diagram"><div class="cut-diagram-title">✂ 切断図 — '+label+'</div>';
  groups.forEach(function(g){
    var pieces = g.pat;
    var endH = endLoss/2;
    var usedSpace = pieces.reduce(function(s,p,i){return s+p+(i>0?blade:0);},0) + endLoss;
    html += '<div class="bar-vis">';
    html += '<div class="bar-vis-label">'+slLen.toLocaleString()+'mm';
    if (g.cnt>1) html += '<span class="bar-vis-cnt">×'+g.cnt+'</span>';
    html += '</div>';
    html += '<div class="bar-track" style="position:relative">';
    // 端部ロス左
    var leftPct = (endH/slLen*100).toFixed(2);
    html += '<div class="bar-loss" style="width:'+leftPct+'%;min-width:2px"></div>';
    // 部材
    pieces.forEach(function(p,i){
      if (i>0) html += '<div class="bar-blade" style="width:'+(blade/slLen*100).toFixed(2)+'%"></div>';
      var pct = (p/slLen*100).toFixed(2);
      html += '<div class="bar-piece '+cmap[p]+'" style="width:'+pct+'%">' +
        '<span class="bar-piece-lbl">'+p.toLocaleString()+'</span></div>';
    });
    // 端部ロス右
    html += '<div class="bar-loss" style="width:'+leftPct+'%;min-width:2px"></div>';
    // 端材
    var lossLen = slLen - usedSpace;
    if (lossLen > 0) {
      var lossPct = (lossLen/slLen*100).toFixed(2);
      html += '<div class="bar-rem" style="width:'+lossPct+'%"><span class="bar-piece-lbl">'+lossLen.toLocaleString()+'</span></div>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

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

function clearHistSearch() {
  ['hsClient','hsName','hsDateFrom','hsDateTo','hsSt','hsKind'].forEach(function(id){
    var el=document.getElementById(id); if(el)el.value='';
  });
  renderHistory();
}

function showCutDoneModal(allDP, patA, patB, patC) {
  // 全計算結果から端材リストを収集
  var endMats = {};
  function collectEnds(bars) {
    if (!bars) return;
    bars.forEach(function(b) {
      if (b.loss && b.loss > 0) {
        endMats[b.loss] = (endMats[b.loss]||0) + 1;
      }
    });
  }
  if (allDP && allDP[0]) collectEnds(allDP[0].bA.concat(allDP[0].bB||[]));
  if (patA && patA.bars) collectEnds(patA.bars);

  var kind = curKind;
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var minVL = parseInt(document.getElementById('minRemnantLen') ?
    document.getElementById('minRemnantLen').value : '500') || 500;

  var items = Object.keys(endMats).map(Number).filter(function(l){return l>=minVL;})
    .sort(function(a,b){return b-a;});

  var modal = document.getElementById('cutDoneModal');
  var body  = modal.querySelector('.cutdone-body');

  if (!items.length) {
    body.innerHTML = '<div style="color:#5a5a78;padding:12px;text-align:center;font-size:12px">登録できる端材がありません<br><span style="font-size:10px;color:#8888a8">(最小有効長さ'+minVL+'mm未満)</span></div>';
  } else {
    body.innerHTML =
      '<div style="font-size:11px;color:#8888a8;margin-bottom:10px">以下の端材を在庫に登録します</div>' +
      '<div style="font-size:11px;color:#5a5a78;margin-bottom:8px">鋼材: <b style="color:#2a2a3e">' + kind + ' ' + spec + '</b></div>' +
      items.map(function(l) {
        var q = endMats[l];
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #ebebf0">' +
          '<input type="checkbox" id="cd_'+l+'" checked style="accent-color:var(--br)">' +
          '<label for="cd_'+l+'" style="font-size:12px;color:#2a2a3e;cursor:pointer;flex:1">' +
            l.toLocaleString() + 'mm × ' + q + '本</label>' +
          '</div>';
      }).join('') +
      '<input type="text" id="cdLabel" placeholder="ラベル（任意）例：A現場端材" style="width:100%;margin-top:10px;background:#fff;border:1px solid #d4d4dc;color:#2a2a3e;border-radius:6px;padding:6px;font-size:11px;box-sizing:border-box">';
  }

  modal._kind = kind; modal._spec = spec; modal._items = items; modal._endMats = endMats;
  modal.style.display = 'flex';
}

function confirmCutDone() {
  var modal = document.getElementById('cutDoneModal');
  var kind  = modal._kind;
  var spec  = modal._spec;
  var items = modal._items || [];
  var endMats = modal._endMats || {};
  var label = (document.getElementById('cdLabel') ? document.getElementById('cdLabel').value.trim() : '');

  items.forEach(function(l) {
    var cb = document.getElementById('cd_'+l);
    if (cb && cb.checked) {
      addToInventory(kind, spec, l, endMats[l], label);
    }
  });

  // 切断履歴に保存
  var pieces = [];
  for (var i=0; i<totalRows; i++) {
    var lEl=document.getElementById('pl'+i), qEl=document.getElementById('pq'+i);
    if (lEl && parseInt(lEl.value)>0 && parseInt(qEl.value)>0)
      pieces.push({l:parseInt(lEl.value), q:parseInt(qEl.value)});
  }
  saveCutHistory(kind, spec, pieces, items.map(function(l){return {l:l,q:endMats[l]};}));

  modal.style.display = 'none';
  alert('在庫に登録しました！「在庫」タブで確認できます。');

  // 在庫ドロップダウンも更新
  buildInventoryDropdown();
}

function showHistModal() {
  var hist = getPiecesHistory();
  var modal = document.getElementById('histModal');
  if (!hist.length) {
    modal.querySelector('.hist-body').innerHTML =
      '<div style="color:#5a5a78;padding:16px;text-align:center">履歴がありません</div>';
  } else {
    modal.querySelector('.hist-body').innerHTML = hist.map(function(h, i) {
      var summary = h.pieces.slice(0,3).map(function(p){return p.l+'×'+p.q;}).join(', ') +
        (h.pieces.length > 3 ? '...' : '');
      return '<div class="hist-item" onclick="loadPiecesFromHistory('+i+')">' +
        '<div style="font-size:12px;font-weight:700;color:#2a2a3e">' + summary + '</div>' +
        '<div style="font-size:10px;color:#8888a8;margin-top:2px">' + h.date + ' (' + h.pieces.length + '種)</div>' +
        '</div>';
    }).join('');
  }
  modal.style.display = 'flex';
}

function registerFromHistory(id) {
  var hist = getCutHistory();
  var entry = hist.find(function(h){ return h.id===id; });
  if (!entry || !entry.result || !entry.result.remnants) return;
  registerRemnants(entry.result.remnants);
  if (confirm('端材'+entry.result.remnants.length+'本を在庫に登録しました。在庫ページを開きますか？')) {
    goPage('i'); renderInventory();
  }
}

// ── 端材優先切断（目標端材長さを考慮したストック選択） ──
function getTargetEndmat() {
  var lenEl = document.getElementById('targetEndmat');
  var qtyEl = document.getElementById('targetEndmatQty');
  var len = parseInt(lenEl ? lenEl.value : 0) || 0;
  var qty = parseInt(qtyEl ? qtyEl.value : 1) || 1;
  return { len: len, qty: qty };
}

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
function lc(v) { return v < 200 ? 'll' : v < 800 ? 'lm' : 'lh'; }

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

function mk(tag, cls) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

// ★ 切断図（バービジュアライザー）を生成
function buildCutDiagram(bars, slLen, label) {
  var grouped = groupBars(bars);
  if (!grouped.length) return '';
  // 同一パターン本数の多い順に並べる
  grouped.sort(function(a, b) { return b.count - a.count; });
  // 同一パターン本数が多い順に並べ替え
  grouped.sort(function(a,b){ return b.cnt - a.cnt; });

  // ハッチング用ユニーク長さ順（先に確定）
  var uniqueLensForHatch = [];
  bars.forEach(function(b){ b.pat.forEach(function(p){ if (uniqueLensForHatch.indexOf(p)<0) uniqueLensForHatch.push(p); }); });
  uniqueLensForHatch.sort(function(a,b){return b-a;});

  var html = '<div class="cut-diagram">';
  html += '<div class="cut-diagram-title">✂ 切断図 — ' + label + '</div>';

  grouped.forEach(function(g) {
    var total = slLen;
    var pieces = g.pat.slice();
    var blade = parseInt(document.getElementById('blade').value) || 3;
    var endLoss = parseInt(document.getElementById('endloss').value) || 75;
    var endHalf = endLoss / 2;

    html += '<div class="bar-vis">';
    html += '<div class="bar-vis-label">';
    html += slLen.toLocaleString() + 'mm';
    if (g.cnt > 1) html += ' <span class="bar-count">× ' + g.cnt + '本 同パターン</span>';
    
    html += '</div>';
    html += '<div class="bar-track">';

    var leftPct = (endHalf / total) * 100;
    if (endHalf > 0) {
      html += '<div style="width:' + leftPct.toFixed(2) + '%;min-width:2px;height:100%;background:rgba(255,68,68,.12);border-right:1px solid rgba(255,68,68,.3)" title="端部ロス ' + endHalf + 'mm"></div>';
    }
    pieces.forEach(function(len, pi) {
      if (pi > 0) html += '<div class="bar-kerf" title="刃厚 ' + blade + 'mm"></div>';
      var pct = (len / total) * 100;
      var colorClass = pieceColorMap[len] || 'p0';
      var hi = uniqueLensForHatch.indexOf(len);
      var hc = 'ph' + (hi % 10);
      html += '<div class="bar-piece ' + colorClass + ' ' + hc + '" style="width:' + pct.toFixed(2) + '%;min-width:4px" title="' + len.toLocaleString() + 'mm">';
      html += '<div class="bar-piece-inner">' + (pct > 4 ? len.toLocaleString() : '') + '</div>';
      html += '</div>';
    });
    var lossPct = (g.loss / total) * 100;
    if (g.loss > 0) {
      html += '<div class="bar-loss" style="width:' + lossPct.toFixed(2) + '%;min-width:2px" title="端材 ' + g.loss + 'mm">';
      html += '';
      html += '</div>';
    }
    if (endHalf > 0) {
      html += '<div style="width:' + leftPct.toFixed(2) + '%;min-width:2px;height:100%;background:rgba(255,68,68,.12);border-left:1px solid rgba(255,68,68,.3)" title="端部ロス ' + endHalf + 'mm"></div>';
    }
    html += '</div>'; // bar-track


    html += '</div>'; // bar-vis
  });

  // 凡例削除済み

  html += '</div>'; // cut-diagram
  return html;
}

// ============================================================
// render: 結果エリアをクリアして各セクションを組み立て
// ============================================================
function render(single, top3, chgPlans, endLoss, remnantBars, kgm, allDP, origPieces, bundlePlan, patA, patB, patC, yieldCard1, yieldCard2) {
  var ph = document.getElementById('ph');
  if (ph) ph.style.display = 'none';
  var rp = document.getElementById('rp');
  while (rp.firstChild) rp.removeChild(rp.firstChild);
  var yieldBest = yieldCard1 || (allDP && allDP.length ? allDP[0] : null);

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
    Object.keys(rgo).sort(function(a,b){return b-a;}).forEach(function(sl){
      remOnlyDiag += buildCutDiagram(rgo[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm');
    });
    // 端材リスト（残材の loss > 0 のもの）
    var minVL = parseInt(document.getElementById('minRemnantLen') ? document.getElementById('minRemnantLen').value : 500) || 500;
    var remEndCounted = {};
    remnantBars.forEach(function(rb){ if(rb.loss >= minVL && rb.loss > 0){ remEndCounted[rb.loss]=(remEndCounted[rb.loss]||0)+1; } });
    var remEndHtml = Object.keys(remEndCounted).length
      ? Object.keys(remEndCounted).map(Number).sort(function(a,b){return b-a;}).map(function(l){
          var n=remEndCounted[l];
          return '<span style="font-size:11px;background:#f8f8fc;padding:2px 7px;border-radius:4px;margin:2px">'+l.toLocaleString()+'mm'+(n>1?' <b>×'+n+'</b>':'')+'</span>';
        }).join('')
      : '<span style="font-size:11px;color:#8888a8">なし</span>';

    var remOnlyCardId = 'card_remonly_' + Date.now();
    var remOnlyDiagId = 'diag_remonly';
    remOnlySec.innerHTML =
      '<div class="res-hd"><div class="res-ttl">手持ち残材リスト</div></div>' +
      '<div class="cc yield-card r1" id="' + remOnlyCardId + '">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:var(--cy)">残材活用</div>' +
          '<div class="cc-stats">' +
            '<div class="cs"><div class="cl">残材本数</div><div class="cv">' + remnantBars.length + ' 本</div></div>' +
          '</div>' +
'<div class="cc-btns"><button class="cc-btn-add" id="add_' + remOnlyCardId + '" onclick="cartAdd(\'' + remOnlyCardId + '\',this)">＋ 追加</button></div>' +
        '</div>' +
        '<div class="rem-section" style="padding:6px 12px;background:#f8f8fc;border-top:1px solid #ebebf0">' +
          '<div style="font-size:10px;color:#5a5a78;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">端材リスト</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:2px">' + remEndHtml + '</div>' +
        '</div>' +
        '<button class="diag-toggle" onclick="toggleDiag(\'' + remOnlyDiagId + '\',this)">✂ 切断図を表示 ▼</button>' +
        '<div id="' + remOnlyDiagId + '" style="display:none">' + remOnlyDiag + '</div>' +
      '</div>';
    rp.appendChild(remOnlySec);
    return;
  }

  // ── 歩留まり最大プラン ──
  if (yieldBest) {
    var yieldSec = mk('div', 'an');
    // No.1：歩留まり最大、No.2：カット数考慮型（存在する場合のみ）
    var yieldCards = [yieldCard1].filter(Boolean);
    var yieldCardHtmls = yieldCards.map(function(yb, yi) {
      var yld2 = (100 - yb.lossRate).toFixed(1);
      // bars を定尺ごとにグループ化（BnB混在定尺対応）
      var allBarsY = yb.bars || yb.bA || [];
      var slGroupsY = {};
      allBarsY.forEach(function(b){
        var sl = b.sl || yb.slA;
        if (!slGroupsY[sl]) slGroupsY[sl] = [];
        slGroupsY[sl].push(b);
      });
      var sortedSlsY = Object.keys(slGroupsY).map(Number).sort(function(a,b){return b-a;});
      var yPatHtml = '';
      sortedSlsY.forEach(function(sl, si){
        var barsInSl = slGroupsY[sl];
        var cls = si === 0 ? 'pc best' : 'pc';
        yPatHtml += '<div class="' + cls + '"><div class="pc-hd"><span>' +
          sl.toLocaleString() + 'mm × ' + barsInSl.length + '</span></div>' +
          patRows(barsInSl) + '</div>';
      });
      var yDiag2 = '';
      var hasRemnantBarsInYield = allBarsY.some(function(bar) {
        var sl = (bar && bar.sl) || yb.slA || 0;
        return sl && typeof isStdStockLength === 'function' && !isStdStockLength(sl);
      });
      if (remnantBars && remnantBars.length && !hasRemnantBarsInYield) {
        var rgy2 = {};
        remnantBars.forEach(function(rb){ var k=rb.sl; if(!rgy2[k]) rgy2[k]=[]; rgy2[k].push(rb); });
        Object.keys(rgy2).forEach(function(sl){ yDiag2 += buildCutDiagram(rgy2[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm'); });
      }
      sortedSlsY.forEach(function(sl){
        yDiag2 += buildCutDiagram(slGroupsY[sl], sl, sl.toLocaleString() + 'mm 定尺');
      });
      var yDiagId2 = 'diag_yield_' + yi;
      var yCardId2 = 'card_yield_' + yi;
      var barCount = allBarsY.length;
      return '<div class="cc" id="' + yCardId2 + '" style="border:1.5px solid #d4d4dc">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:#1a1a2e">' + yb.desc +
            (remnantBars && remnantBars.length ? '<span style="margin-left:8px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(34,211,238,.18);border:1px solid var(--cy);color:var(--cy);vertical-align:middle">残材消費</span>' : '') +
          '</div>' +
          '<div class="cc-stats" style="margin-left:auto">' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + yld2 + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + (yb.chg || '—') + ' 回</div></div>' +
            '<div class="cs"><div class="cl">母材重量</div><div class="cv">' + Math.round(yb.barKg) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">ロス重量</div><div class="cv">' + Math.round(yb.lossKg) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">使用本数</div><div class="cv">' + barCount + ' 本</div></div>' +
          '</div>' +
'<div class="cc-btns">' + '<button class="cc-btn-add" id="add_' + yCardId2 + '" onclick="cartAdd(\'' + yCardId2 + '\',this)">＋ 追加</button>' + '</div>' +
        '</div>' +
        '<div class="cc-pat"><div class="pgrid">' + yPatHtml + '</div></div>' +
        (yDiag2 ? '<button class="diag-toggle" onclick="toggleDiag(&quot;' + yDiagId2 + '&quot;,this)">✂ 切断図を表示 ▼</button><div id="' + yDiagId2 + '" style="display:none">' + yDiag2 + '</div>' : '') +
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
      var diagId = 'diag_pat_' + pat.label + '_' + Date.now();

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
            return '<span style="font-size:11px;background:#f8f8fc;padding:2px 7px;border-radius:4px;margin:2px">' + l.toLocaleString() + 'mm' + (n>1?' <b>×'+n+'</b>':'') + '</span>';
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
            '<div class="cs"><div class="cl">同一パターン</div><div class="cv">' + m.samePatternCount + ' 本</div></div>' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + m.yieldPct.toFixed(1) + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + m.totalCuts + ' 回</div></div>' +
            '<div class="cs"><div class="cl">母材重量</div><div class="cv">' + Math.round(m.barKg||0) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">ロス重量</div><div class="cv">' + Math.round(m.lossKg||0) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">使用本数</div><div class="cv">' + m.barCount + ' 本</div></div>' +
          '</div>' +
'<div class="cc-btns">' + '<button class="cc-btn-add" id="add_' + cardId2 + '" onclick="cartAdd(\'' + cardId2 + '\',this)">＋ 追加</button>' + '</div>' +
        '</div>' +
        '<div class="cc-pat"><div class="pgrid">' + patDetailHtml + '</div></div>' +
        '<div style="padding:6px 14px;background:#f8f8fb;border-top:1px solid #e8e8ed">' +
          '<div style="font-size:10px;color:#8888a8;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">端材リスト</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:2px">' + remHtml + '</div>' +
        '</div>' +
        (diagHtml ? '<button class="diag-toggle" onclick="toggleDiag(\'' + diagId + '\',this)">✂ 切断図を表示 ▼</button><div id="' + diagId + '" style="display:none">' + diagHtml + '</div>' : '') +
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
}

function toggleDiag(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '✂ 切断図を表示 ▼' : '✂ 切断図を閉じる ▲';
  btn.classList.toggle('open', !open);
}

function printCard(cardId) {
  document.querySelectorAll('.print-target,.print-target-hd').forEach(function(el){
    el.classList.remove('print-target','print-target-hd');
  });
  var card = document.getElementById(cardId);
  if (!card) return;
  card.classList.add('print-target');
  var sec = card.closest('.an');
  if (sec) sec.classList.add('print-target');
  var diagEls = card.querySelectorAll('[id^="diag_"]');
  var wasHidden = [];
  diagEls.forEach(function(d){
    wasHidden.push(d.style.display === 'none');
    d.style.display = 'block';
  });
  // 印刷前に作業指示書ヘッダーを更新
  updatePrintHeader();
  window.print();
  diagEls.forEach(function(d, i){
    if (wasHidden[i]) d.style.display = 'none';
  });
  // 印刷時に切断履歴保存（cardIdも記録・複数カード対応）
  if (_lastCalcResult) {
    var saved = saveCutHistory(_lastCalcResult, cardId);
    if (saved) {
      try {
        var hist = getCutHistory();
        if (hist.length && hist[0].id === saved.id) {
          hist[0].printedCardId = cardId;
          localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
        }
      } catch(e) {}
    }
    // _lastCalcResult はnullにしない（別カードも印刷できるよう保持）
  }
  autoRegisterAfterPrint();
}

function updatePrintHeader() {
  var job = getJobInfo();
  var hdr = document.getElementById('printJobHeader');
  if (!hdr) return;
  var spec = (document.getElementById('spec')||{}).value || '';
  hdr.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">' +
      '<div style="font-size:18px;font-weight:900;letter-spacing:.08em">TORIAI 作業指示書</div>' +
      '<div style="font-size:10px;color:#666">印刷日: ' + new Date().toLocaleDateString("ja-JP") + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:11px">' +
      '<div><span style="color:#666">顧客名</span><br><strong>' + (job.client||'—') + '</strong></div>' +
      '<div><span style="color:#666">工事名</span><br><strong>' + (job.name||'—') + '</strong></div>' +
      '<div><span style="color:#666">納期</span><br><strong>' + (job.deadline||'—') + '</strong></div>' +
      '<div><span style="color:#666">メモ</span><br><strong>' + (job.worker||'—') + '</strong></div>' +
    '</div>' +
    '<div style="margin-top:6px;font-size:11px"><span style="color:#666">鋼材規格</span>&nbsp;<strong>' + spec + '</strong></div>';
}

function autoRegisterAfterPrint() {
  if (!_lastCalcResult) return;
  var minLen = parseInt((document.getElementById('minRemnantLen')||{}).value)||500;
  var rems = extractRemnants(_lastCalcResult).filter(function(r){ return r.len >= minLen; });
  if (!rems.length) return;
  registerRemnants(rems);
  // トースト通知
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1001;background:#111;color:var(--cy);border:1px solid var(--cy);border-radius:10px;padding:10px 18px;font-size:12px;font-weight:700;box-shadow:0 4px 16px rgba(34,211,238,.25);transition:opacity .5s';
  toast.textContent = '🗄 端材' + rems.length + '本を在庫に自動登録しました';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.style.opacity='0'; setTimeout(function(){toast.remove();},500); }, 3000);
}

function clearParts() {
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    var kEl = document.getElementById('pk' + i);
    if (lEl) { lEl.value = ''; qEl.value = ''; kEl.textContent = '—'; }
  }
  document.getElementById('totkg').textContent = '—';
}

function toggleTheme() {}

// ── 初期化 ──────────────────────────────────────────────

// ══════════════════════════════════════════════════════
// 🛒 カート機能
// ══════════════════════════════════════════════════════

/** カートバッジを更新 */
function updateCartBadge() {
  var cart = getCart();
  var badge = document.getElementById('cartBadge');
  if (!badge) return;
  var n = cart.length;
  badge.textContent = '🛒 ' + n + '件';
  badge.className = 'cart-badge' + (n === 0 ? ' empty' : '');
}

/** カードの情報を収集してカートに追加 */
function legacyCartAdd(cardId, btn) {
  var card = document.getElementById(cardId);
  if (!card) return;

  // ジョブ情報
  var job = getJobInfo ? getJobInfo() : {};
  var spec = (document.getElementById('spec')||{}).value || '';
  var kind = curKind || '';

  // カードタイプ判定
  var isYield = cardId.indexOf('card_yield') === 0;
  var isPat   = cardId.indexOf('card_pat')   === 0;

  // カードの統計テキストを収集
  var statsEl = card.querySelector('.cc-stats');
  var statsHtml = statsEl ? statsEl.outerHTML : '';

  // カードのパターン詳細
  var patEl = card.querySelector('.cc-pat');
  var patHtml = patEl ? patEl.outerHTML : '';

  // タイトル
  var descEl = card.querySelector('.cc-desc');
  var title = descEl ? descEl.textContent.trim() : cardId;

  // 切断図（展開して取得）
  var diagHtml = '';
  var diagEls = card.querySelectorAll('[id^="diag_"]');
  diagEls.forEach(function(d) {
    diagHtml += d.innerHTML;
  });

  // 端材リスト
  var remEl = card.querySelector('[class*="rem-section"]') ||
              card.querySelector('.rem-list');
  var remHtml = remEl ? remEl.outerHTML : '';

  var data = {
    cardId: cardId,
    title:  title,
    isYield: isYield,
    isPat:   isPat,
    job:     job,
    spec:    spec,
    kind:    kind,
    statsHtml: statsHtml,
    patHtml:   patHtml,
    diagHtml:  diagHtml,
    remHtml:   remHtml,
  };

  addToCart(cardId, data);
  updateCartBadge();

  // ボタンを ✓ に変化
  btn.textContent = '✓ 追加済み';
  btn.classList.add('added');
  btn.disabled = true;

  // 切断履歴に保存
  if (_lastCalcResult) {
    saveCutHistory(_lastCalcResult, cardId);
  }
}

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
      'カートは空です。各カードの「＋ 追加」を押してください。</div>';
    return;
  }

  body.innerHTML = cart.map(function(item) {
    var d = item.data;
    return '<div class="cart-item">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:2px">' +
          (d.isYield ? '⚡ 歩留まり最大' : '🔁 取り合いパターン') +
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
      btn.textContent = '＋ 追加';
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
    btn.textContent = '＋ 追加';
    btn.classList.remove('added');
    btn.disabled = false;
  });
}

/** カート内容をまとめて印刷 */
function cartPrint() {
  var cart = getCart();
  if (!cart.length) {
    alert('先に「＋ 追加」でカートに追加してください。');
    return;
  }
  openCartModal();
}

/** カートの内容で作業指示書を印刷 */
function legacyCartDoPrint() {
  var cart = getCart();
  if (!cart.length) { alert('カートが空です。'); return; }

  var job = cart[0].data.job || {};
  var sections = [];

  cart.forEach(function(item, ci) {
    var d = item.data;

    // patHtml から切断リスト（sumMap）・母材サマリーを生成
    var patDiv = document.createElement('div');
    patDiv.innerHTML = d.patHtml || '';
    var pcDivs = patDiv.querySelectorAll('.pc');

    var motherParts = [];
    pcDivs.forEach(function(pc) {
      var hd = pc.querySelector('.pc-hd span');
      if (hd) motherParts.push(hd.textContent.trim());
    });

    var sumMap = {};
    pcDivs.forEach(function(pc) {
      pc.querySelectorAll('.pc-row').forEach(function(row) {
        var cnt = row.querySelector('.px');
        var pp  = row.querySelector('.pp');
        if (!cnt || !pp) return;
        var barCount = parseInt(cnt.textContent.replace(/[^0-9]/g,'')) || 1;
        pp.textContent.split('＋').forEach(function(part) {
          var mx = part.trim().match(/([\d,]+)\s*(?:[×x]\s*(\d+))?/);
          if (!mx) return;
          var lenKey = parseInt(mx[1].replace(/,/g,''));
          var perBar = mx[2] ? parseInt(mx[2]) : 1;
          if (lenKey > 0) sumMap[lenKey] = (sumMap[lenKey]||0) + perBar * barCount;
        });
      });
    });

    // 端材タグ
    var remTags = [];
    if (d.remHtml) {
      var rd = document.createElement('div');
      rd.innerHTML = d.remHtml;
      rd.querySelectorAll('span').forEach(function(s) {
        var t = s.textContent.trim();
        if (t && t !== 'なし' && !t.includes('mm未満')) remTags.push(t);
      });
    }

    // diagHtml から bars 配列を復元して buildPrintBarHtml に渡す
    var barHtml = '';
    var endLossVal = 150;
    if (d.diagHtml) {
      var dd = document.createElement('div');
      dd.innerHTML = d.diagHtml;
      var bvs = dd.querySelectorAll('.bar-vis');
      if (bvs.length) {
        // 定尺ごとにグループ化してbars配列を復元
        var slGroups = {};
        bvs.forEach(function(bv) {
          var lbl = bv.querySelector('.bar-vis-label');
          var lblText = lbl ? lbl.textContent.trim() : '';
          var slm = lblText.match(/([\d,]+)\s*mm/);
          var sl2 = slm ? parseInt(slm[1].replace(/,/g,'')) : 0;
          if (!sl2) return;
          if (!slGroups[sl2]) slGroups[sl2] = [];

          // bar-pieceからpat復元
          var track = bv.querySelector('.bar-track');
          if (!track) return;
          var pieces = [];
          track.querySelectorAll('.bar-piece').forEach(function(p) {
            var inner = p.querySelector('.bar-piece-inner');
            var txt = (inner ? inner.textContent : p.textContent).trim().replace(/,/g,'');
            var n = parseInt(txt);
            if (n > 0) pieces.push(n);
          });
          if (!pieces.length) return;

          // loss復元
          var loss = 0;
          var remEl = track.querySelector('.bar-rem');
          var lossEl = track.querySelector('.bar-loss');
          if (remEl) {
            var rm = (remEl.getAttribute('style')||'').match(/flex:\s*(\d+)/);
            loss = rm ? parseInt(rm[1]) : 0;
          } else if (lossEl) {
            var lm = (lossEl.getAttribute('style')||'').match(/flex:\s*(\d+)/);
            loss = lm ? parseInt(lm[1]) : 0;
          }

          // end-lossからendLoss推定
          var endEls = track.querySelectorAll('.bar-end-loss,.bar-loss-end');
          if (!endEls.length) {
            // 最初のbar-visのend部分からendHalfを推定
            var allEls = Array.from(track.children);
            if (allEls.length >= 2) {
              var firstFlex = (allEls[0].getAttribute('style')||'').match(/flex:\s*(\d+)/);
              if (firstFlex && parseInt(firstFlex[1]) < 200) {
                endLossVal = parseInt(firstFlex[1]) * 2;
              }
            }
          }

          slGroups[sl2].push({pat: pieces, loss: loss, sl: sl2});
        });

        // 定尺ごとにbuildPrintBarHtmlを呼ぶ
        Object.keys(slGroups).map(Number).sort(function(a,b){return b-a;}).forEach(function(sl2) {
          barHtml += buildPrintBarHtml(slGroups[sl2], sl2, endLossVal);
        });
      }
    }

    sections.push({
      idx: ci + 1,
      spec: d.spec || '',
      motherSummary: motherParts.join(' + '),
      sumMap: sumMap,
      remTags: remTags,
      barHtml: barHtml,
    });
  });

  var html = buildPrintPages(job, sections);
  openPrintWindow(html);

  clearCart();
  updateCartBadge();
  closeCartModal();
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    btn.textContent = '＋ 追加';
    btn.classList.remove('added');
    btn.disabled = false;
  });
}



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
  '.cut-tbl{width:100%;border-collapse:collapse;font-size:10px}',
  '.cut-tbl th{padding:2px 4px;border-bottom:1.5px solid #000;font-weight:700;font-size:9px;text-align:left;background:#f0f0f0}',
  '.cut-tbl td{padding:2px 4px;border-bottom:1px solid #e8e8e8}',
  '.cut-tbl td.num{text-align:center;font-weight:700}',
  '.bar-block{margin-bottom:6px}',
  '.bar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}',
  '.bar-pat{font-size:9px;font-weight:700;color:#222;margin-bottom:3px}',
  '.bar-track{display:flex;height:24px;border:1.5px solid #555;border-radius:3px;overflow:hidden;background:#fff}',
  '.b-blade{width:1.5px;background:#555;flex-shrink:0}',
  '.b-end{flex-shrink:0;background:repeating-linear-gradient(-45deg,#aaa,#aaa 1.5px,#fff 1.5px,#fff 5px)}',
  '.b-piece{display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#000;overflow:hidden;background:#d8d8d8;border-left:1px solid #555}',
  '.b-piece:first-of-type{border-left:none}',
  '.b-rem{background:repeating-linear-gradient(-45deg,#888,#888 1.5px,#ddd 1.5px,#ddd 5px);display:flex;align-items:center;justify-content:center;font-size:7px;color:#000;font-weight:700}',
  '.b-loss{background:repeating-linear-gradient(-45deg,#ccc,#ccc 1px,#fff 1px,#fff 4px);display:flex;align-items:center;justify-content:center;font-size:7px;color:#888}',
  '.cnt-badge{background:#000;color:#fff;font-size:11px;font-weight:900;padding:2px 12px;border-radius:12px;letter-spacing:.04em;border:2px solid #000}',
  '.r-tag{font-size:9px;border:1px solid #bbb;padding:1px 5px;border-radius:3px;display:inline-block;margin:1px}',
  '.print-footer{display:flex;justify-content:space-between;font-size:9px;color:#888;margin-top:8px;padding-top:6px;border-top:1px solid #ddd}',
].join('\n');

/** フルヘッダーHTML生成 */
function buildPrintHeaderFull(job, pageInfo) {
  var h = '';
  h += '<div class="ph-full">';
  h += '<div>';
  h += '<div style="font-size:9px;color:#555;font-weight:700;letter-spacing:.06em;margin-bottom:4px">作業指示書</div>';
  h += '<div style="display:flex;gap:18px;align-items:baseline">';
  h += '<div><span style="font-size:9px;color:#666">顧客：</span><span style="font-size:12px;font-weight:700">' + (job.client||'—') + '</span></div>';
  h += '<div><span style="font-size:9px;color:#666">現場名：</span><span style="font-size:12px;font-weight:700">' + (job.name||'—') + '</span></div>';
  if (job.worker) h += '<div><span style="font-size:9px;color:#666">メモ：</span><span style="font-size:11px;font-weight:700">' + job.worker + '</span></div>';
  h += '</div>';
  h += '</div>';
  h += '<div style="text-align:right">';
  h += '<div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="margin-top:3px"><span style="font-size:9px;color:#666">納期：</span><span style="font-size:10px;font-weight:700">' + job.deadline + '</span></div>';
  h += '</div>';
  h += '</div>';
  return h;
}

/** ミニヘッダーHTML生成（2枚目以降）*/
function buildPrintHeaderMini(job, pageInfo) {
  var h = '';
  h += '<div class="ph-mini">';
  h += '<div>';
  h += '<span style="font-size:9px;font-weight:700;letter-spacing:.04em">作業指示書　つづき</span>';
  h += '<span style="font-size:9px;color:#555;margin-left:12px">顧客：' + (job.client||'—') + '　現場名：' + (job.name||'—') + '</span>';
  h += '</div>';
  h += '<div style="text-align:right">';
  h += '<div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="font-size:9px"><span style="color:#666">納期：</span><strong>' + job.deadline + '</strong></div>';
  h += '</div>';
  h += '</div>';
  return h;
}

/**
 * 切断図バーHTML生成
 * @param {Array} bars - [{pat:[長さ,...], loss, sl}]
 * @param {number} sl - 定尺長さ
 * @param {number} endLoss - 端部ロス
 */
function buildPrintBarHtml(bars, sl, endLoss) {
  if (!bars || !bars.length) return '';

  // 同じパターン・同じlossでグループ化
  var grouped = {};
  bars.forEach(function(b) {
    var key = b.pat.slice().sort(function(a,c){return c-a;}).join(',') + '|' + (b.loss||0);
    if (!grouped[key]) grouped[key] = {bar:b, cnt:0};
    grouped[key].cnt++;
  });

  var endHalf = (endLoss || 150) / 2;
  var html = '';

  Object.keys(grouped).forEach(function(key) {
    var g = grouped[key];
    var b = g.bar;
    var cnt = g.cnt;

    // パターン文字列
    var pc = {};
    b.pat.forEach(function(p){ pc[p]=(pc[p]||0)+1; });
    var patStr = Object.keys(pc).map(Number).sort(function(a,c){return c-a;})
      .map(function(l){ return l.toLocaleString()+(pc[l]>1?'×'+pc[l]:''); }).join(' + ');

    var remInfo = b.loss >= 500 ? '　端材：'+b.loss.toLocaleString()+'mm'
                : b.loss > 0   ? '　ロス：'+b.loss.toLocaleString()+'mm'
                : '';

    html += '<div class="bar-block">';
    html += '<div class="bar-head">';
    html += '<span style="font-weight:700;font-size:10px">' + sl.toLocaleString() + 'mm</span>';
    html += '<span class="cnt-badge">×' + cnt + ' セット</span>';
    html += '</div>';
    html += '<div class="bar-pat">= ' + patStr + remInfo + '</div>';
    html += '<div class="bar-track">';

    // 端部ロス（左）+ 縦線
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    html += '<div class="b-blade"></div>';

    // 部材
    var sortedPat = b.pat.slice().sort(function(a,c){return c-a;});
    sortedPat.forEach(function(len, i) {
      if (i > 0) html += '<div class="b-blade"></div>';
      html += '<div class="b-piece" style="flex:' + len + '">' +
        (len >= 400 ? len.toLocaleString() : '') + '</div>';
    });

    // 端材 or ロス + 縦線
    if (b.loss >= 500) {
      html += '<div class="b-blade"></div>';
      html += '<div class="b-rem" style="flex:' + b.loss + '">端材 ' + b.loss.toLocaleString() + '</div>';
    } else if (b.loss > 0) {
      html += '<div class="b-blade"></div>';
      html += '<div class="b-loss" style="flex:' + b.loss + '">ロス</div>';
    }

    // 端部ロス（右）+ 縦線
    html += '<div class="b-blade"></div>';
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';

    html += '</div></div>';
  });

  return html;
}

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
  var sortedLens = Object.keys(secData.sumMap).map(Number).sort(function(a,b){return b-a;});
  if (sortedLens.length) {
    html += '<table class="cut-tbl"><thead><tr><th>長さ</th><th style="text-align:center">合計</th></tr></thead><tbody>';
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
    html += '<span>TORIAI β</span>';
    html += '</div>';

    if (!isLast) html += '<div style="page-break-after:always"></div>';
  }
  return html;
}

/** 印刷ウィンドウを開いて印刷 */
function openPrintWindow(html) {
  var win = window.open('', '_blank', 'width=1050,height=750');
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>作業指示書</title>' +
    '<style>' + PRINT_CSS + '</style></head>' +
    '<body>' + html + '</body></html>'
  );
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); win.close(); }, 700);
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
function stkValChange(i) {
  var inp = document.getElementById('sm' + i);
  var v = parseInt(inp.value);
  if (!v || v < 1) inp.value = '';
  saveSettings();
}

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

function legacyAddFromInventory_v2() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var parts = sel.value.split(':');
  var len = parseInt(parts[0], 10);
  var qty = parseInt(parts[1], 10);
  if (!len || !qty) return;
  addRemnant();
  var i = remnantCount - 1;
  var lenEl = document.getElementById('remLen' + i);
  var qtyEl = document.getElementById('remQty' + i);
  if (lenEl) lenEl.value = len;
  if (qtyEl) qtyEl.value = qty;
  saveRemnants();
  sel.value = '';
  updateInventoryUseButton(true);
}

function legacySyncInventoryToRemnants_v2() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  list.innerHTML = '';
  remnantCount = 0;
  if (!grouped.length) {
    addRemnant();
    return;
  }
  grouped.forEach(function(item) {
    var i = remnantCount++;
    var d = document.createElement('div');
    d.className = 'rem-row';
    d.id = 'remRow' + i;
    var options = '<option value="0">0本</option>';
    for (var q = 1; q <= item.qty; q++) options += '<option value="' + q + '"' + (q === item.qty ? ' selected' : '') + '>' + q + '本</option>';
    d.innerHTML =
      '<span class="rem-label">長さ</span>' +
      '<input type="number" id="remLen' + i + '" value="' + item.len + '" min="1" style="flex:1" readonly onchange="saveRemnants()">' +
      '<span class="rem-label">使用</span>' +
      '<select id="remQty' + i + '" style="width:62px;font-size:11px;padding:3px 4px;border:1px solid #d4d4dc;border-radius:6px;background:#fff;color:#1a1a2e" onchange="saveRemnants()">' + options + '</select>' +
      '<span style="font-size:10px;color:#8888a8;white-space:nowrap">/ ' + item.qty + '本</span>' +
      '<button class="rem-del" onclick="removeGroupedInventory(' + i + ')">×</button>';
    d.dataset.inventoryIds = JSON.stringify(item.ids);
    list.appendChild(d);
  });
}

function removeGroupedInventory(index) {
  var row = document.getElementById('remRow' + index);
  if (!row) return;
  var ids = [];
  try { ids = JSON.parse(row.dataset.inventoryIds || '[]'); } catch (e) {}
  if (!ids.length) return;
  saveInventory(getInventory().filter(function(item) { return ids.indexOf(item.id) === -1; }));
  syncInventoryToRemnants();
  updateInvDropdown();
  renderInventoryPage();
}

function legacyBuildInventoryDropdown_v2() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  cont.style.display = items.length ? 'block' : 'none';
  var badge = document.getElementById('invBadge');
  if (badge) badge.textContent = '在庫 ' + items.reduce(function(sum, item) { return sum + item.qty; }, 0) + '本';
  var sel = document.getElementById('invSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から残材を追加</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = item.len + ':' + item.qty + ':' + (item.label || '');
    option.textContent = item.len.toLocaleString() + 'mm × ' + item.qty + '本' + (item.company ? ' [' + item.company + ']' : '');
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function legacyRenderInventoryPage_v2() {
  var cont = document.getElementById('invListCont');
  var empty = document.getElementById('invEmptyMsg');
  if (!cont) return;
  var kindF = ((document.getElementById('invFilterKind') || {}).value || '');
  var specF = ((document.getElementById('invFilterSpec') || {}).value || '');
  var keyword = (((document.getElementById('invKeyword') || {}).value) || '').toLowerCase();
  var dateFrom = ((document.getElementById('invDateFrom') || {}).value || '');
  var sort = ((document.getElementById('invSort') || {}).value || 'date_desc');
  var inv = getInventory().slice();
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
  var groups = {};
  pageData.items.forEach(function(item) {
    var key = item.spec || item.kind || '未設定';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  cont.innerHTML = Object.keys(groups).sort().map(function(spec) {
    return '<div class="inv-card">' +
      '<div class="inv-card-header"><span class="inv-spec-label">' + spec + '</span><span class="inv-count-badge">' + groups[spec].length + '本</span></div>' +
      '<div class="inv-col-header"><span>寸法</span><span>長さ</span><span>会社名</span><span>メモ</span><span>登録日</span><span></span></div>' +
      groups[spec].map(function(item) {
        return '<div class="inv-row">' +
          '<span class="inv-spec">' + (item.spec || item.kind || '') + '</span>' +
          '<span class="inv-len">' + Number(item.len || 0).toLocaleString() + '<span class="inv-len-unit">mm</span></span>' +
          '<span class="inv-company">' + (item.company || '-') + '</span>' +
          '<span class="inv-note">' + (item.note || '-') + '</span>' +
          '<span class="inv-date">' + (item.addedDate || '') + '</span>' +
          '<button onclick="deleteInventoryItem(' + item.id + ')" class="inv-del-btn">削除</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');
  renderPager('invPagination', inventoryPage, pageData.totalPages, 'setInventoryPage');
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
  var fs = ((document.getElementById('hsSt') || {}).value || '');
  var fk = ((document.getElementById('hsKind') || {}).value || '');
  var keyword = (((document.getElementById('hsKeyword') || {}).value) || '').toLowerCase();
  var sort = ((document.getElementById('hsSort') || {}).value || 'date_desc');
  if (fc) hist = hist.filter(function(h) { return (h.client || '').toLowerCase().indexOf(fc) >= 0; });
  if (fn) hist = hist.filter(function(h) { return (h.name || '').toLowerCase().indexOf(fn) >= 0; });
  if (fdf) hist = hist.filter(function(h) { return parseDateValue(h.deadline) >= parseDateValue(fdf); });
  if (fdt) hist = hist.filter(function(h) { return parseDateValue(h.deadline) <= parseDateValue(fdt); });
  if (fs) hist = hist.filter(function(h) { return (h.spec || '') === fs; });
  if (fk) hist = hist.filter(function(h) { return (h.kind || '') === fk; });
  if (keyword) hist = hist.filter(function(h) { return [h.client, h.name, h.spec, h.kind, h.worker].join(' ').toLowerCase().indexOf(keyword) >= 0; });
  hist.sort(function(a, b) {
    if (sort === 'date_asc') return parseDateValue(a.date) - parseDateValue(b.date);
    if (sort === 'deadline_asc') return parseDateValue(a.deadline) - parseDateValue(b.deadline);
    if (sort === 'spec_asc') return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
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
  var groups = {};
  pageData.items.forEach(function(item) {
    var key = item.spec || '規格未設定';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  cont.innerHTML = Object.keys(groups).sort().map(function(spec) {
    return '<div class="hist-card">' +
      '<div class="hist-card-header"><span class="inv-spec-label">' + spec + '</span><span class="inv-count-badge">' + groups[spec].length + '件</span></div>' +
      groups[spec].map(function(h) {
        var remCount = h.result && h.result.remnants ? h.result.remnants.length : 0;
        return '<div class="hist-row" onclick="showHistPreview(' + h.id + ')">' +
          '<div class="hist-row-main">' +
            '<div><span class="hist-client">' + (h.client || '案件未設定') + '</span><span class="hist-name">' + (h.name || '') + '</span></div>' +
            '<div class="hist-meta">' +
              '<span class="hist-rem">登録: ' + (h.dateLabel || '') + '</span>' +
              '<span class="hist-rem">納期: ' + (h.deadline || '-') + '</span>' +
              '<span class="hist-rem">メモ: ' + (h.worker || '-') + '</span>' +
              '<span class="hist-rem">端材: ' + remCount + '本</span>' +
            '</div>' +
          '</div>' +
          '<button class="hist-del-btn" onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')">削除</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');
  renderPager('histPagination', historyPage, pageData.totalPages, 'setHistoryPage');
}

function clearHistSearch() {
  ['hsClient', 'hsName', 'hsDateFrom', 'hsDateTo', 'hsSt', 'hsKind', 'hsKeyword'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sortEl = document.getElementById('hsSort');
  if (sortEl) sortEl.value = 'date_desc';
  _hiChipActive = 0;
  [1,2,3,4].forEach(function(i) {
    var c = document.getElementById('hChip' + i);
    if (c) c.classList.remove('on');
  });
  historyPage = 1;
  renderHistory();
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
  return isStdStockLength(slLen) ? slLen.toLocaleString() + 'mm 定尺' : '残材（L=' + slLen.toLocaleString() + 'mm）より切断';
}

function buildCutDiagram(bars, slLen, label) {
  var grouped = groupBars(bars);
  if (!grouped.length) return '';
  var html = '<div class="cut-diagram">';
  html += '<div class="cut-diagram-title">✂ 切断図</div>';
  grouped.forEach(function(g) {
    var sourceLabel = buildCutSourceLabel(slLen);
    var isRemnant = !isStdStockLength(slLen);
    html += '<div class="bar-vis' + (isRemnant ? ' remnant-source' : '') + '">';
    html += '<div class="bar-vis-label"><strong>' + sourceLabel + '</strong><span class="bar-count">× ' + g.cnt + 'セット</span>' + (isRemnant ? '<span class="source-chip">◈ 残材使用</span>' : '') + '</div>';
    html += '<div class="bar-track">';
    var endHalf = (parseInt((document.getElementById('endloss') || {}).value, 10) || 150) / 2;
    if (endHalf > 0) html += '<div class="bar-loss" style="width:' + ((endHalf / slLen) * 100).toFixed(2) + '%"></div>';
    g.pat.forEach(function(len, idx) {
      if (idx > 0) html += '<div class="bar-cutline" aria-hidden="true"></div>';
      html += '<div class="bar-piece p' + (idx % 10) + '" style="width:' + ((len / slLen) * 100).toFixed(2) + '%;min-width:4px" title="' + len.toLocaleString() + 'mm">' +
        '<div class="bar-piece-inner">' + len.toLocaleString() + '</div></div>';
    });
    if (g.loss > 0) html += '<div class="' + (g.loss >= 500 ? 'bar-rem' : 'bar-loss') + '" style="width:' + ((g.loss / slLen) * 100).toFixed(2) + '%"><span class="bar-piece-lbl">' + g.loss.toLocaleString() + '</span></div>';
    if (endHalf > 0) html += '<div class="bar-loss" style="width:' + ((endHalf / slLen) * 100).toFixed(2) + '%"></div>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function buildPrintHeaderFull(job, pageInfo) {
  var h = '';
  h += '<div class="ph-full">';
  h += '<div>';
  h += '<div style="font-size:9px;color:#555;font-weight:700;letter-spacing:.06em;margin-bottom:4px">TORIAI 作業指示書</div>';
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
  h += '<div><span style="font-size:9px;font-weight:700;letter-spacing:.04em">TORIAI 作業指示書</span>';
  h += '<span style="font-size:9px;color:#555;margin-left:12px">顧客：' + (job.client || '—') + ' / 現場名：' + (job.name || '—') + '</span></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="font-size:9px"><span style="color:#666">納期：</span><strong>' + job.deadline + '</strong></div>';
  h += '</div></div>';
  return h;
}

function buildPrintBarHtml(bars, sl, endLoss) {
  if (!bars || !bars.length) return '';
  var grouped = {};
  bars.forEach(function(bar) {
    var key = bar.pat.slice().join(',') + '|' + (bar.loss || 0);
    if (!grouped[key]) grouped[key] = { bar: bar, cnt: 0 };
    grouped[key].cnt++;
  });
  var endHalf = (endLoss || 150) / 2;
  var sourceLabel = buildCutSourceLabel(sl);
  var isRemnant = !isStdStockLength(sl);
  var html = '';
  Object.keys(grouped).forEach(function(key) {
    var g = grouped[key];
    var bar = g.bar;
    html += '<div class="bar-block">';
    html += '<div class="bar-head"><span style="font-weight:700;font-size:10px">' + sourceLabel + '</span><span class="cnt-badge">× ' + g.cnt + 'セット</span></div>';
    html += '<div class="bar-pat">' + (isRemnant ? '◈ 残材より切断 / ' : '') + '= ' + bar.pat.join(' + ') + (bar.loss > 0 ? ' / 端材 ' + bar.loss.toLocaleString() + 'mm' : '') + '</div>';
    html += '<div class="bar-track">';
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    bar.pat.forEach(function(len, idx) {
      html += '<div class="b-piece" style="flex:' + len + '">' + len.toLocaleString() + '</div>';
      if (idx < bar.pat.length - 1) html += '<div class="b-blade"></div>';
    });
    if (bar.loss > 0) html += '<div class="' + (bar.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + bar.loss + '">' + bar.loss.toLocaleString() + '</div>';
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    html += '</div></div>';
  });
  return html;
}

function updatePrintHeader() {
  var job = getJobInfo();
  var hdr = document.getElementById('printJobHeader');
  if (!hdr) return;
  var spec = (document.getElementById('spec') || {}).value || '';
  hdr.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">' +
      '<div style="font-size:18px;font-weight:900;letter-spacing:.08em">TORIAI 作業指示書</div>' +
      '<div style="font-size:10px;color:#666">印刷日: ' + new Date().toLocaleDateString('ja-JP') + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:11px">' +
      '<div><span style="color:#666">顧客名</span><br><strong>' + (job.client || '—') + '</strong></div>' +
      '<div><span style="color:#666">工事名</span><br><strong>' + (job.name || '—') + '</strong></div>' +
      '<div><span style="color:#666">納期</span><br><strong>' + (job.deadline || '—') + '</strong></div>' +
      '<div><span style="color:#666">メモ</span><br><strong>' + (job.worker || '—') + '</strong></div>' +
    '</div>' +
    '<div style="margin-top:6px;font-size:11px"><span style="color:#666">鋼材規格</span>&nbsp;<strong>' + spec + '</strong></div>';
}

document.addEventListener('DOMContentLoaded', function() {
  init();

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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getManualRemnantDrafts() {
  try {
    var parsed = JSON.parse(localStorage.getItem(MANUAL_REMNANTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getInventoryRemnantUsage() {
  try {
    var parsed = JSON.parse(localStorage.getItem(INVENTORY_REMNANT_USAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function legacySaveRemnants_v1() {
  var manual = [];
  var usage = {};
  document.querySelectorAll('#remnantList .rem-row').forEach(function(row) {
    var lenEl = row.querySelector('.rem-len');
    var qtyEl = row.querySelector('.rem-qty');
    var memoEl = row.querySelector('.rem-memo');
    var len = parseInt(lenEl && lenEl.value, 10);
    var qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
    if (row.dataset.source === 'inventory') {
      if (row.dataset.inventoryKey) usage[row.dataset.inventoryKey] = qty;
      return;
    }
    if (!len || len < 1) return;
    manual.push({
      len: len,
      qty: Math.max(1, qty || 1),
      memo: memoEl ? memoEl.value || '' : ''
    });
  });
  localStorage.setItem(MANUAL_REMNANTS_KEY, JSON.stringify(manual));
  localStorage.setItem(INVENTORY_REMNANT_USAGE_KEY, JSON.stringify(usage));
}

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

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var row = document.createElement('div');
  var usage = Math.max(0, Math.min(item.qty || 0, selectedQty || 0));
  var options = '<option value="0">使わない</option>';
  for (var q = 1; q <= (item.qty || 0); q++) {
    options += '<option value="' + q + '"' + (q === usage ? ' selected' : '') + '>' + q + '本</option>';
  }
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = String(item.ids || []);
  row.dataset.inventoryIds = JSON.stringify(item.ids || []);
  row.innerHTML =
    '<div class="rem-label-group"><span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span><span class="rem-label-sub">在庫から選択</span></div>' +
    '<select class="rem-qty" id="remQty' + i + '" onchange="saveRemnants()">' + options + '</select>' +
    '<div class="rem-meta">' + escapeHtml((item.company || item.label || '在庫材') + (item.note ? ' / ' + item.note : '')) + '</div>' +
    '<button type="button" class="rem-del" onclick="removeGroupedInventory(' + i + ')">×</button>';
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

function legacyRemoveRemnant_v2(i) {
  var row = document.getElementById('remRow' + i);
  if (row) row.remove();
  if (!document.querySelector('#remnantList .rem-row[data-source="manual"]')) {
    createManualRemnantRow();
  }
  saveRemnants();
}

function getRemnants() {
  var result = [];
  document.querySelectorAll('#remnantList .rem-row').forEach(function(row) {
    var lenEl = row.querySelector('.rem-len') || row.querySelector('[id^="remLen"]');
    var qtyEl = row.querySelector('.rem-qty') || row.querySelector('[id^="remQty"]');
    var len = parseInt(lenEl && lenEl.value, 10);
    var qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
    if (!len || len < 1 || !qty) return;
    for (var k = 0; k < qty; k++) result.push(len);
  });
  return result;
}

function legacyAddFromInventory_v3() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var parts = sel.value.split(':');
  var len = parseInt(parts[0], 10);
  var qty = parseInt(parts[1], 10) || 1;
  var note = parts.slice(2).join(':');
  addRemnant({ len: len, qty: qty, memo: note });
  sel.value = '';
  updateInventoryUseButton(true);
}

function legacySyncInventoryToRemnants_v3() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var manual = getManualRemnantDrafts();
  var usage = getInventoryRemnantUsage();
  list.innerHTML = '';
  remnantCount = 0;

  grouped.forEach(function(item) {
    createInventoryRemnantRow(item, usage[String(item.ids || [])] || 0);
  });
  if (!manual.length) {
    createManualRemnantRow();
  } else {
    manual.forEach(function(item) { createManualRemnantRow(item); });
  }
  saveRemnants();
}

function legacyBuildInventoryDropdown_v3() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  cont.style.display = items.length ? 'block' : 'none';
  var badge = document.getElementById('invBadge');
  if (badge) badge.textContent = '在庫 ' + items.reduce(function(sum, item) { return sum + item.qty; }, 0) + '本';
  var sel = document.getElementById('invSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から追加する残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = String(item.ids || []);
    option.textContent = item.len.toLocaleString() + 'mm / 在庫' + item.qty + '本' + (item.company ? ' [' + item.company + ']' : '');
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function updateCartBadge() {
  var cart = getCart();
  var badge = document.getElementById('cartBadge');
  if (!badge) return;
  var n = cart.length;
  badge.textContent = n + '件';
  badge.classList.toggle('empty', !n);
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
  return segments.map(function(segment) {
    if (segment.count >= 5) {
      return {
        len: segment.len,
        count: segment.count,
        total: segment.total,
        label: '細材 ' + segment.len.toLocaleString() + 'mm x ' + segment.count + '本'
      };
    }
    return {
      len: segment.len,
      count: segment.count,
      total: segment.len,
      label: segment.len.toLocaleString() + 'mm'
    };
  }).reduce(function(list, segment) {
    if (segment.count >= 5) {
      list.push(segment);
      return list;
    }
    for (var i = 0; i < segment.count; i++) {
      list.push({
        len: segment.len,
        count: 1,
        total: segment.len,
        label: segment.len.toLocaleString() + 'mm'
      });
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
  var slKeys = Object.keys(groupsByStock).map(Number).sort(function(a, b) {
    var aRem = !isStdStockLength(a);
    var bRem = !isStdStockLength(b);
    if (aRem !== bRem) return aRem ? -1 : 1;
    return b - a;
  });
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

function normalizeInterfaceChrome() {
  document.title = 'TORIAI';
  var head = document.querySelector('.remnant-head');
  if (head && !head.querySelector('.rem-add-btn')) {
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'rem-add-btn';
    addBtn.textContent = '＋';
    addBtn.onclick = function() { addRemnant(); };
    head.appendChild(addBtn);
  }

  var labelMap = [
    ['#hiPanelH > div > div:first-child', '切断履歴'],
    ['#hiPanelI > div > div:first-child', '残材在庫'],
    ['#histModal div[style*="font-size:14px;font-weight:700"]', '入力履歴'],
    ['#cartModal .cart-modal-hd span[style*="font-size:15px"]', '印刷カート'],
    ['#histPreviewModal div[style*="font-size:14px;font-weight:700;color:#1a1a2e"]', '作業指示書プレビュー']
  ];
  labelMap.forEach(function(entry) {
    var el = document.querySelector(entry[0]);
    if (el) el.textContent = entry[1];
  });

  ['#cartModal button[onclick="cartDoPrint()"]', '#histPreviewModal button[onclick="printHistoryPreview()"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) {
      el.textContent = 'まとめて印刷';
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

// Final remnant UI behavior override. This block must stay at EOF so stale
// duplicated definitions earlier in the file cannot win.
function legacyGetSelectedInventoryRemnants_v1() {
  return loadSelectedInventoryRemnantsState();
}

function legacySaveSelectedInventoryRemnants_v1(data) {
  _selectedInventoryRemnantsState = data && typeof data === 'object' ? data : {};
  persistSelectedInventoryRemnantsState();
}

function updateInventoryUseButton() {
  var btn = document.getElementById('invUseBtn');
  var sel = document.getElementById('invSelect');
  if (!btn) return;
  btn.textContent = '追加';
  btn.disabled = !(sel && sel.value);
}

function legacyBuildInventoryDropdown_v4() {
  var cont = document.getElementById('invDropCont');
  var sel = document.getElementById('invSelect');
  var badge = document.getElementById('invBadge');
  var items = getInventoryForCurrentSpec();
  if (cont) cont.style.display = items.length ? 'block' : 'none';
  if (badge) {
    badge.textContent = '在庫 ' + items.reduce(function(sum, item) {
      return sum + (item.qty || 0);
    }, 0) + '本';
  }
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から追加する残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = getRemnantInventoryKey(item);
    option.textContent = Number(item.len || 0).toLocaleString() + 'mm / 在庫' + (item.qty || 0) + '本';
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function legacyAddFromInventory_v4() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) {
    return getRemnantInventoryKey(item) === sel.value;
  });
  if (!chosen) return;
  var state = getSelectedInventoryRemnants();
  var key = getRemnantInventoryKey(chosen);
  if (!state[key]) state[key] = { qty: 1 };
  saveSelectedInventoryRemnants(state);
  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function legacyRemoveRemnant_v3(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;
  var state = getSelectedInventoryRemnants();
  delete state[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(state);
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function legacySaveRemnants_v2() {
  var state = {};
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    state[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  saveSelectedInventoryRemnants(state);
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = getRemnantInventoryKey(item);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group">' +
      '<span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span>' +
      '<span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span>' +
    '</div>' +
    '<label class="rem-qty-group" for="remQty' + i + '">' +
      '<span class="rem-qty-label">今回使う本数</span>' +
      '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '</label>' +
    '<button type="button" class="rem-del" aria-label="削除" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function legacySyncInventoryToRemnants_v4() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var state = getSelectedInventoryRemnants();
  list.innerHTML = '';
  remnantCount = 0;
  Object.keys(state).forEach(function(key) {
    var item = grouped.find(function(group) {
      return getRemnantInventoryKey(group) === key;
    });
    if (item) createInventoryRemnantRow(item, state[key].qty || 1);
  });
  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から選択した残材がここに表示されます</div></div>';
  }
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

function legacyGetSelectedInventoryRemnants_v2() {
  return loadSelectedInventoryRemnantsState();
}

function legacySaveSelectedInventoryRemnants_v2(data) {
  _selectedInventoryRemnantsState = data && typeof data === 'object' ? data : {};
  persistSelectedInventoryRemnantsState();
}

function updateInventoryUseButton() {
  var btn = document.getElementById('invUseBtn');
  var sel = document.getElementById('invSelect');
  if (!btn) return;
  btn.textContent = '追加';
  btn.disabled = !(sel && sel.value);
}

function legacyBuildInventoryDropdown_v5() {
  var cont = document.getElementById('invDropCont');
  var sel = document.getElementById('invSelect');
  var badge = document.getElementById('invBadge');
  var items = getInventoryForCurrentSpec();
  if (cont) cont.style.display = items.length ? 'block' : 'none';
  if (badge) {
    badge.textContent = '在庫 ' + items.reduce(function(sum, item) {
      return sum + (item.qty || 0);
    }, 0) + '本';
  }
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から追加する残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = getRemnantInventoryKey(item);
    option.textContent = Number(item.len || 0).toLocaleString() + 'mm / 在庫' + (item.qty || 0) + '本';
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function legacyAddFromInventory_v5() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) {
    return getRemnantInventoryKey(item) === sel.value;
  });
  if (!chosen) return;
  var state = getSelectedInventoryRemnants();
  var key = getRemnantInventoryKey(chosen);
  if (!state[key]) state[key] = { qty: 1 };
  saveSelectedInventoryRemnants(state);
  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function legacyRemoveRemnant_v4(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;
  var state = getSelectedInventoryRemnants();
  delete state[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(state);
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function legacySaveRemnants_v3() {
  var state = {};
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    state[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  saveSelectedInventoryRemnants(state);
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = getRemnantInventoryKey(item);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group">' +
      '<span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span>' +
      '<span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span>' +
    '</div>' +
    '<label class="rem-qty-group" for="remQty' + i + '">' +
      '<span class="rem-qty-label">今回使う本数</span>' +
      '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '</label>' +
    '<button type="button" class="rem-del" aria-label="削除" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function legacySyncInventoryToRemnants_v5() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var state = getSelectedInventoryRemnants();
  list.innerHTML = '';
  remnantCount = 0;
  Object.keys(state).forEach(function(key) {
    var item = grouped.find(function(group) {
      return getRemnantInventoryKey(group) === key;
    });
    if (item) createInventoryRemnantRow(item, state[key].qty || 1);
  });
  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から選択した残材がここに表示されます</div></div>';
  }
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

function getRemnantInventoryKey(item) {
  return (item && item.ids ? item.ids.slice().sort(function(a, b) { return a - b; }).join('_') : '');
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

function legacyBuildInventoryDropdown_v6() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  cont.style.display = items.length ? 'block' : 'none';
  var badge = document.getElementById('invBadge');
  if (badge) badge.textContent = '在庫 ' + items.reduce(function(sum, item) { return sum + item.qty; }, 0) + '本';
  var sel = document.getElementById('invSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から使いたい残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = getRemnantInventoryKey(item);
    option.textContent = item.len.toLocaleString() + 'mm / 在庫' + item.qty + '本' + (item.company ? ' [' + item.company + ']' : '');
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function legacyAddFromInventory_v6() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) { return getRemnantInventoryKey(item) === sel.value; });
  if (!chosen) return;
  var selected = getSelectedInventoryRemnants();
  selected[getRemnantInventoryKey(chosen)] = { qty: 1 };
  saveSelectedInventoryRemnants(selected);
  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = getRemnantInventoryKey(item);
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

function legacySaveRemnants_v4() {
  var selected = {};
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    selected[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  saveSelectedInventoryRemnants(selected);
}

function legacyRemoveRemnant_v5(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;
  var selected = getSelectedInventoryRemnants();
  delete selected[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(selected);
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function legacySyncInventoryToRemnants_v6() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var selected = getSelectedInventoryRemnants();
  list.innerHTML = '';
  remnantCount = 0;
  Object.keys(selected).forEach(function(key) {
    var item = grouped.find(function(group) { return getRemnantInventoryKey(group) === key; });
    if (item) createInventoryRemnantRow(item, selected[key].qty || 1);
  });
  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から追加した残材がここに表示されます</div></div>';
  }
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

function legacyBuildInventoryDropdown_v7() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  cont.style.display = items.length ? 'block' : 'none';
  var badge = document.getElementById('invBadge');
  if (badge) badge.textContent = '在庫 ' + items.reduce(function(sum, item) { return sum + item.qty; }, 0) + '本';
  var sel = document.getElementById('invSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">在庫から使いたい残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = getRemnantInventoryKey(item);
    option.textContent = item.len.toLocaleString() + 'mm / 在庫' + item.qty + '本' + (item.company ? ' [' + item.company + ']' : '');
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function legacyAddFromInventory_v7() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) { return getRemnantInventoryKey(item) === sel.value; });
  if (!chosen) return;
  var key = getRemnantInventoryKey(chosen);
  var state = loadSelectedInventoryRemnantsState();
  state[key] = { qty: 1 };
  _selectedInventoryRemnantsState = state;
  persistSelectedInventoryRemnantsState();
  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var row = document.createElement('div');
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = getRemnantInventoryKey(item);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group"><span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span><span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span></div>' +
    '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '<div class="rem-meta">今回使う本数 / ' + escapeHtml(item.company || item.label || '在庫から選択') + '</div>' +
    '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function legacySyncInventoryToRemnants_v7() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var state = loadSelectedInventoryRemnantsState();
  list.innerHTML = '';
  remnantCount = 0;
  Object.keys(state).forEach(function(key) {
    var item = grouped.find(function(group) { return getRemnantInventoryKey(group) === key; });
    if (item) createInventoryRemnantRow(item, state[key].qty || 1);
  });
  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から追加した残材がここに表示されます</div></div>';
  }
}

function legacySaveRemnants_v5() {
  var next = {};
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    next[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  _selectedInventoryRemnantsState = next;
  persistSelectedInventoryRemnantsState();
}

function legacyRemoveRemnant_v6(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;
  var state = loadSelectedInventoryRemnantsState();
  delete state[row.dataset.inventoryKey];
  _selectedInventoryRemnantsState = state;
  persistSelectedInventoryRemnantsState();
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function getRemnants() {
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
    var cart = getCart();
    var body = document.getElementById('cartModalBody');
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">カートは空です。作業指示書に追加した項目がここに表示されます。</div>';
      return;
    }
    body.innerHTML = cart.map(function(item) {
      var d = item.data || {};
      var typeLabel = d.isWeight
        ? '重量計算リスト'
        : (d.isYield ? '歩留まり最大' : '取り合いパターン');
      var subLabel = d.isWeight
        ? (Math.round(d.sumKg || 0).toLocaleString() + ' kg　' +
           (d.anyPrice ? '概算 ' + Number(d.sumAmt || 0).toLocaleString() + ' 円' : ''))
        : ((d.spec || '') + '　' + (((d.job || {}).client) || '') + '　' + (((d.job || {}).name) || ''));
      return '<div class="cart-item">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:2px">' +
            typeLabel + ' - ' + (d.title || '') +
          '</div>' +
          '<div style="font-size:11px;color:#8888a8">' + subLabel + '</div>' +
        '</div>' +
        '<button class="cart-item-del" onclick="cartRemoveItem(\'' + item.id + '\')">削除</button>' +
      '</div>';
    }).join('');
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
    return b - a;
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
  var data = {
    cardId: cardId,
    title: title,
    isYield: !!card.closest('.yield-card, .yield-best'),
    isPat: !card.closest('.yield-card, .yield-best'),
    job: getJobInfo(),
    spec: (document.getElementById('spec') || {}).value || '',
    kind: typeof getCurrentKind === 'function' ? getCurrentKind() : '',
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

function cartDoPrint() {
  var cart = getCart();
  if (!cart.length) { alert('カートが空です。'); return; }
  var job = cart[0].data.job || {};
  var sections = [];
  cart.forEach(function(item, ci) {
    var d = item.data || {};
    if (d.isWeight) {
      var rowsHtml = (d.rows || []).map(function(r, idx) {
        return '<tr style="border-bottom:1px solid #eee">' +
          '<td style="padding:4px 8px">' + (idx + 1) + '</td>' +
          '<td style="padding:4px 8px">' + (r.memo || '—') + '</td>' +
          '<td style="padding:4px 8px">' + r.kind + '</td>' +
          '<td style="padding:4px 8px">' + r.spec + '</td>' +
          '<td style="padding:4px 8px;text-align:right">' + r.len.toLocaleString() + '</td>' +
          '<td style="padding:4px 8px;text-align:right">' + r.qty + '</td>' +
          '<td style="padding:4px 8px;text-align:right;font-weight:700">' + Math.round(r.kgTotal).toLocaleString() + ' kg</td>' +
          (d.anyPrice ? '<td style="padding:4px 8px;text-align:right">' +
            (r.amount !== null ? Number(r.amount).toLocaleString() + ' 円' : '—') + '</td>' : '') +
          '</tr>';
      }).join('');
      sections.push({
        idx: ci + 1,
        customHtml: '<div style="margin-bottom:16px;border:1px solid #ddd;border-radius:8px;overflow:hidden">' +
          '<div style="background:#f0fdf4;padding:8px 12px;font-weight:700;font-size:13px;border-bottom:1px solid #ddd">' +
            '重量計算リスト - ' + d.title +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
          '<thead><tr style="background:#f4f4fa">' +
            '<th style="padding:4px 8px;text-align:left">#</th>' +
            '<th style="padding:4px 8px;text-align:left">部材名</th>' +
            '<th style="padding:4px 8px;text-align:left">種類</th>' +
            '<th style="padding:4px 8px;text-align:left">規格</th>' +
            '<th style="padding:4px 8px;text-align:right">長さ(mm)</th>' +
            '<th style="padding:4px 8px;text-align:right">本数</th>' +
            '<th style="padding:4px 8px;text-align:right">合計重量(kg)</th>' +
            (d.anyPrice ? '<th style="padding:4px 8px;text-align:right">概算金額(円)</th>' : '') +
          '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
          '<tfoot><tr style="background:#f4f4fa;font-weight:700">' +
            '<td colspan="6" style="padding:6px 8px">合　計</td>' +
            '<td style="padding:6px 8px;text-align:right">' + Math.round(d.sumKg).toLocaleString() + ' kg</td>' +
            (d.anyPrice ? '<td style="padding:6px 8px;text-align:right">' + Number(d.sumAmt).toLocaleString() + ' 円</td>' : '') +
          '</tr></tfoot></table></div>'
      });
      return;
    }
    var patDiv = document.createElement('div');
    patDiv.innerHTML = d.patHtml || '';
    var sumMap = {};
    patDiv.querySelectorAll('.pc-row').forEach(function(row) {
      var mul = parseInt(((row.querySelector('.px') || {}).textContent || '').replace(/[^\d]/g, ''), 10) || 1;
      var text = ((row.querySelector('.pp') || {}).textContent || '');
      text.split('+').forEach(function(part) {
        var m = part.match(/([\d,]+)\s*x?\s*(\d+)?/i);
        if (!m) return;
        var len = parseInt(m[1].replace(/,/g, ''), 10);
        var qty = parseInt(m[2] || '1', 10);
        if (len) sumMap[len] = (sumMap[len] || 0) + qty * mul;
      });
    });
    var remTags = [];
    if (d.remHtml) {
      var rd = document.createElement('div');
      rd.innerHTML = d.remHtml;
      rd.querySelectorAll('span').forEach(function(s) {
        var t = (s.textContent || '').trim();
        if (t && t !== 'なし') remTags.push(t);
      });
    }
    var bars = Array.isArray(d.bars) && d.bars.length ? d.bars : parseBarsFromDiagHtml(d.diagHtml || '', 0, d.endLoss || 150);
    var barHtml = '';
    sortStockLengthsForDisplay(bars.map(function(bar) { return bar.sl || 0; }).filter(Boolean).filter(function(v, i, a) { return a.indexOf(v) === i; }))
      .forEach(function(slKey) {
        barHtml += buildPrintBarHtml(bars.filter(function(bar) { return (bar.sl || 0) === slKey; }), slKey, d.endLoss || 150);
      });
    sections.push({
      idx: ci + 1,
      spec: d.spec || '',
      motherSummary: d.motherSummary || '',
      sumMap: sumMap,
      remTags: remTags,
      barHtml: barHtml
    });
  });
  openPrintWindow(buildPrintPages(job, sections));
  clearCart();
  updateCartBadge();
  closeCartModal();
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    btn.textContent = '＋ 作業指示書に追加';
    btn.classList.remove('added');
    btn.disabled = false;
  });
}

function showHistPreview(id) {
  var hist = getCutHistory();
  var h = hist.find(function(x){ return x.id===id; });
  if (!h) return;
  var modal = document.getElementById('histPreviewModal');
  var body  = document.getElementById('histPreviewBody');
  if (!modal || !body) return;
  var r = h.result || {};
  var job = {client:h.client||'', name:h.name||'', deadline:h.deadline||'', worker:h.worker||''};
  var spec = h.spec || '';
  var endLoss = r.endLoss || 150;
  var printedId = h.printedCardId || '';
  var bars = [];
  if (printedId.indexOf('card_pat') === 0 && r.patA && r.patA.bars && r.patA.bars.length) {
    bars = r.patA.bars.slice();
  } else if (r.allDP && r.allDP[0]) {
    bars = (r.allDP[0].bA || []).concat(r.allDP[0].bB || []).map(function(b) {
      return { pat: (b.pat || []).slice(), loss: b.loss || 0, sl: b.sl || r.allDP[0].slA || 0 };
    });
  } else if (r.patA && r.patA.bars && r.patA.bars.length) {
    bars = r.patA.bars.slice();
  }
  if (!bars.length) {
    body.innerHTML = '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
    modal.style.display = 'flex';
    return;
  }
  var slGroups = {};
  bars.forEach(function(b) {
    var sl2 = b.sl || 0;
    if (!slGroups[sl2]) slGroups[sl2] = [];
    slGroups[sl2].push(b);
  });
  var orderedSls = sortStockLengthsForDisplay(Object.keys(slGroups).map(Number));
  var motherSummary = orderedSls.map(function(s){ return s.toLocaleString()+'mm x '+slGroups[s].length; }).join(' + ');
  var sumMap = {};
  bars.forEach(function(b) { (b.pat||[]).forEach(function(len){ sumMap[len]=(sumMap[len]||0)+1; }); });
  var remTags = (h.remnants||[]).filter(function(r2){ return r2.len>=500; }).map(function(r2){ return r2.len.toLocaleString()+'mm'+(r2.qty>1?' x '+r2.qty:''); });
  var barHtml = '';
  orderedSls.forEach(function(sl2) {
    barHtml += buildPrintBarHtml(slGroups[sl2], sl2, endLoss);
  });
  body.innerHTML = buildPrintPages(job, [{
    idx: 1,
    spec: spec,
    motherSummary: motherSummary,
    sumMap: sumMap,
    remTags: remTags,
    barHtml: barHtml
  }]);
  modal.style.display = 'flex';
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

function saveSelectedInventoryRemnants(data) {
  localStorage.setItem(INVENTORY_REMNANT_SELECTED_KEY, JSON.stringify(data || {}));
}

function addFromInventory() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) { return String(item.ids || []) === sel.value; });
  if (!chosen) return;
  var selected = getSelectedInventoryRemnants();
  var key = String(chosen.ids || []);
  selected[key] = { qty: 1 };
  saveSelectedInventoryRemnants(selected);
  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton(true);
}

function removeRemnant(i) {
  var row = document.getElementById('remRow' + i);
  if (!row || row.dataset.source !== 'inventory') {
    if (row) row.remove();
    return;
  }
  var selected = getSelectedInventoryRemnants();
  delete selected[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(selected);
  syncInventoryToRemnants();
}

function saveRemnants() {
  var selected = getSelectedInventoryRemnants();
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    selected[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  saveSelectedInventoryRemnants(selected);
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

function syncInventoryToRemnants() {
  var list = document.getElementById('remnantList');
  if (!list) return;
  var grouped = getInventoryForCurrentSpec();
  var selected = getSelectedInventoryRemnants();
  list.innerHTML = '';
  remnantCount = 0;
  Object.keys(selected).forEach(function(key) {
    var item = grouped.find(function(group) { return String(group.ids || []) === key; });
    if (item) {
      createInventoryRemnantRow(item, selected[key].qty || 1);
    }
  });
  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から選択した残材がここに表示されます</div></div>';
  }
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
  document.title = 'TORIAI';
  var head = document.querySelector('.remnant-head');
  if (head) {
    var addBtn = head.querySelector('.rem-add-btn');
    if (addBtn) addBtn.remove();
  }

  var labelMap = [
    ['#hiPanelH > div > div:first-child', '切断履歴'],
    ['#hiPanelI > div > div:first-child', '残材在庫'],
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

  ['#cartModal button[onclick="cartDoPrint()"]', '#histPreviewModal button[onclick="printHistoryPreview()"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) {
      el.textContent = 'まとめて印刷';
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
