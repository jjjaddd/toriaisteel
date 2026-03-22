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
  if (showH) { buildHistSpecDropdown(); renderHistory(); }
  else { buildInvFilterKind(); buildInvAddKind(); renderInventoryPage(); }
}

function goPage(p) {
  document.querySelectorAll('.pg').forEach(function(el){ el.classList.remove('show'); });
  if (p === 'c') {
    document.getElementById('cp').classList.add('show');
    document.getElementById('na').classList.add('active');
    document.getElementById('nhi').classList.remove('active');
  } else {
    document.getElementById('hip').classList.add('show');
    document.getElementById('nhi').classList.add('active');
    document.getElementById('na').classList.remove('active');
    // タブ切り替え
    var showH = (p === 'h' || p === 'hi');
    document.getElementById('hiPanelH').style.display = showH ? 'block' : 'none';
    document.getElementById('hiPanelI').style.display = showH ? 'none' : 'block';
    document.getElementById('hiTabH').classList.toggle('hi-tab-active', showH);
    document.getElementById('hiTabI').classList.toggle('hi-tab-active', !showH);
    if (showH) { buildHistSpecDropdown(); renderHistory(); }
    else { buildInvFilterKind(); renderInventoryPage(); }
  }
}

// ============================================================
// 初期化
// ============================================================
function init() {
  // 種類ボタン
  var KIND_ICONS = {'H形鋼':'🏗','等辺山形鋼':'📐','不等辺山形鋼':'📏','溝形鋼':'⊏','I形鋼':'I','平鋼':'▬','丸鋼':'●'};
  var tg = document.getElementById('tgrid');
  if(tg) tg.innerHTML='';
  var kinds = Object.keys(STEEL);
  kinds.forEach(function(k) {
    var b = document.createElement('button');
    b.className = 'tbtn' + (k === curKind ? ' on' : '');
    b.innerHTML = '<span>' + k + '</span>';
    b.onclick = function() { selectKind(b, k); };
    tg.appendChild(b);
  });

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

  // 規格リスト
  buildSpec();
  // 初期状態でspecPanelを表示
  var panel = document.getElementById('specPanel');
  if (panel) panel.style.display = 'block';

  updKg();

  // localStorage読み込み（設定・残材）
  loadSettings();
  syncInventoryToRemnants();  // 在庫から自動同期
  updKg();
  buildJobDatalist();
  updateCartBadge();
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

function selectKind(btn, k) {
  curKind = k;
  document.querySelectorAll('.tbtn').forEach(function(b) { b.classList.remove('on'); });
  btn.classList.add('on');
  buildSpec();
}

function buildSpec() {
  var sel = document.getElementById('spec');
  var specListEl = document.getElementById('specList');
  if (!sel || !specListEl) return;

  var list = STEEL[curKind] || [];

  // hidden select を更新（計算用）
  sel.innerHTML = '';
  list.forEach(function(row) {
    var o = document.createElement('option');
    o.value = o.textContent = row[0];
    sel.appendChild(o);
  });

  // 規格パネルに一覧表示
  specListEl.innerHTML = '';
  list.forEach(function(row) {
    var btn = document.createElement('button');
    btn.className = 'spec-item';
    btn.textContent = row[0];
    btn.setAttribute('data-spec', row[0]);
    btn.onkeydown = function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        btn.click(); // クリックと同じ動作（選択＋pl0フォーカス）
      }
    };
    btn.onclick = function() {
      sel.value = row[0];
      // 一覧を閉じて選択規格だけ表示
      var sl2 = document.getElementById('specList');
      if (sl2) sl2.style.display = 'none';
      var sd = document.getElementById('specSelected');
      if (sd) {
        var sn = document.getElementById('specName');
        var sk = document.getElementById('specKgm');
        if (sn) sn.textContent = row[0];
        if (sk) sk.textContent = row[1] + ' kg/m';
        sd.style.borderTop = 'none';
        sd.style.cursor = 'pointer';
        sd.title = 'クリックして規格を変更';
        sd.onclick = function() {
          if (sl2) sl2.style.display = 'block';
        };
      }
      onSpec();
      // 規格選択後 → 部材リスト1行目へ自動フォーカス
      setTimeout(function() {
        var pl0 = document.getElementById('pl0');
        if (pl0) { pl0.focus(); pl0.select(); }
      }, 50);
    };
    specListEl.appendChild(btn);
  });

  // 最初の規格を選択状態に・一覧は開いた状態
  var sl2 = document.getElementById('specList');
  if (sl2) sl2.style.display = 'block';
  if (list.length) {
    sel.value = list[0][0];
    var firstBtn = specListEl.querySelector('.spec-item');
    if (firstBtn) firstBtn.classList.add('on');
    var sd = document.getElementById('specSelected');
    if (sd) {
      var sn = document.getElementById('specName');
      var sk = document.getElementById('specKgm');
      if (sn) sn.textContent = list[0][0];
      if (sk) sk.textContent = list[0][1] + ' kg/m';
      sd.style.cursor = 'pointer';
      sd.title = 'クリックして規格を変更';
      sd.onclick = function() {
        if (sl2) sl2.style.display = 'block';
      };
    }
  }
  onSpec();
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

function buildInventoryDropdown() {
  var cont = document.getElementById('invDropCont');
  if (!cont) return;
  var items = getInventoryForCurrentSpec();
  if (!items.length) { cont.style.display = 'none'; return; }
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
}

function addFromInventory() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;
  var parts = sel.value.split(':');
  var len = parseInt(parts[0]);
  var qty = parseInt(parts[1]);
  if (!len || !qty) return;
  // 残材入力欄に追加
  addRemnant();
  var i = remnantCount - 1;
  document.getElementById('remLen'+i).value = len;
  document.getElementById('remQty'+i).value = qty;
  saveRemnants();
  // セレクトをリセット
  sel.value = '';
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
      el.textContent = kg.toFixed(2) + 'kg';
      tot += kg;
    } else {
      el.textContent = '—';
    }
  }
  document.getElementById('totkg').textContent = tot > 0 ? tot.toFixed(2) + ' kg' : '—';
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

function removeRemnant(i) {
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
function syncInventoryToRemnants() {
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
function renderInventoryPage() {
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
          '<div class="cc-desc" style="color:var(--cy)">残材一覧</div>' +
          '<div class="cc-stats">' +
            '<div class="cs"><div class="cl">残材本数</div><div class="cv">' + remnantBars.length + ' 本</div></div>' +
          '</div>' +
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
      if (remnantBars && remnantBars.length) {
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
            '<div class="cs"><div class="cl">母材重量</div><div class="cv">' + yb.barKg.toFixed(2) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">ロス重量</div><div class="cv">' + yb.lossKg.toFixed(2) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">使用本数</div><div class="cv">' + barCount + ' 本</div></div>' +
          '</div>' +
          '<div class="cc-btns">' + '<button class="cc-btn-add" id="add_' + yCardId2 + '" onclick="cartAdd(\'' + yCardId2 + '\',this)">＋ 作業指示書に追加</button>' + '</div>' +
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
        Object.keys(slGroups).sort(function(a,b){return b-a;}).forEach(function(sl) {
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
      var patDetailHtml = Object.keys(slGroupsCard).sort(function(a,b){return b-a;}).map(function(sl) {
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
      var slSummary = Object.keys(slGroupsCard).sort(function(a,b){return b-a;}).map(function(sl){
        return parseInt(sl).toLocaleString() + 'mm × ' + slGroupsCard[sl].length + '本';
      }).join('　＋　');
      // 定尺別本数サマリー
      var slSummary = Object.keys(slGroupsCard).sort(function(a,b){return b-a;}).map(function(sl){
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
            '<div class="cs"><div class="cl">母材重量</div><div class="cv">' + (m.barKg||0).toFixed(2) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">ロス重量</div><div class="cv">' + (m.lossKg||0).toFixed(2) + ' kg</div></div>' +
            '<div class="cs"><div class="cl">使用本数</div><div class="cv">' + m.barCount + ' 本</div></div>' +
          '</div>' +
          '<div class="cc-btns">' + '<button class="cc-btn-add" id="add_' + cardId2 + '" onclick="cartAdd(\'' + cardId2 + '\',this)">＋ 作業指示書に追加</button>' + '</div>' +
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
      '<div style="font-size:18px;font-weight:900;letter-spacing:.08em">STEEL.OPTIMIZER 作業指示書</div>' +
      '<div style="font-size:10px;color:#666">印刷日: ' + new Date().toLocaleDateString("ja-JP") + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:11px">' +
      '<div><span style="color:#666">顧客名</span><br><strong>' + (job.client||'—') + '</strong></div>' +
      '<div><span style="color:#666">工事名</span><br><strong>' + (job.name||'—') + '</strong></div>' +
      '<div><span style="color:#666">納期</span><br><strong>' + (job.deadline||'—') + '</strong></div>' +
      '<div><span style="color:#666">担当者</span><br><strong>' + (job.worker||'—') + '</strong></div>' +
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
function cartAdd(cardId, btn) {
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
      'カートは空です。各カードの「＋ 作業指示書に追加」を押してください。</div>';
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
      btn.textContent = '＋ 作業指示書に追加';
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
    btn.textContent = '＋ 作業指示書に追加';
    btn.classList.remove('added');
    btn.disabled = false;
  });
}

/** カート内容をまとめて印刷 */
function cartPrint() {
  var cart = getCart();
  if (!cart.length) {
    alert('先に「＋ 作業指示書に追加」でカートに追加してください。');
    return;
  }
  openCartModal();
}

/** カートの内容で作業指示書を印刷 */
function cartDoPrint() {
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
    btn.textContent = '＋ 作業指示書に追加';
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
  '.b-piece{display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#000;overflow:hidden;background:#d8d8d8}',
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
  if (job.worker) h += '<div><span style="font-size:9px;color:#666">担当者：</span><span style="font-size:11px;font-weight:700">' + job.worker + '</span></div>';
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
      html += buildPrintSection(sec.idx, sec);
    });

    // フッター
    html += '<div class="print-footer">';
    html += '<span>全 ' + sections.length + ' 鋼材　' + (isLast ? '以上' : '/ ' + pageNum + '枚目') + '</span>';
    html += '<span>STEEL.OPTIMIZER β</span>';
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
