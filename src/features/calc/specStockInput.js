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
