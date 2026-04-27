// コマンドパレット：全候補リストを生成
function cmdBuildAll() {
  var items = [];
  ensureSteelCatalogReady().forEach(function(kind) {
    getAppSteelRows(kind).forEach(function(row) {
      items.push({ kind: kind, spec: row[0], kgm: row[1] });
    });
  });
  return items;
}

// コマンドパレット：検索ボタンで種類一覧を開く
function cmdOpenBrowse() {
  var dd = document.getElementById('cmdDropdown');
  if (!dd) return;
  var kinds = ensureSteelCatalogReady();

  dd.innerHTML = '';
  if (!kinds.length) {
    var loading = document.createElement('div');
    loading.style.padding = '12px';
    loading.style.fontSize = '12px';
    loading.style.color = '#aaa';
    loading.style.textAlign = 'center';
    loading.textContent = '鋼材データを読み込み中です';
    dd.appendChild(loading);
    dd.style.display = 'block';
    document.addEventListener('mousedown', cmdOutside);
    return;
  }

  kinds.forEach(function(kind) {
    var row = document.createElement('div');
    row.className = 'cmd-item cmd-cat-link';
    var label = document.createElement('span');
    label.textContent = kind;
    var arrow = document.createElement('span');
    arrow.className = 'cmd-sub';
    arrow.textContent = '▶';
    row.appendChild(label);
    row.appendChild(arrow);
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
  var list = getAppSteelRows(kind);
  if (!dd) return;

  dd.innerHTML = '';
  var back = document.createElement('div');
  back.className = 'cmd-cat';
  back.style.cursor = 'pointer';
  back.style.color = '#aaa';
  back.style.display = 'flex';
  back.style.alignItems = 'center';
  back.style.gap = '4px';
  back.textContent = '◀ 戻る　';
  var currentKind = document.createElement('strong');
  currentKind.style.color = '#5a5a78';
  currentKind.textContent = kind;
  back.appendChild(currentKind);
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
    var spec = document.createElement('span');
    spec.textContent = it.spec;
    var kgm = document.createElement('span');
    kgm.className = 'cmd-sub';
    kgm.textContent = it.kgm + ' kg/m';
    row.appendChild(spec);
    row.appendChild(kgm);
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
  { prefix: 'l',  kinds: ['山形鋼', '不等辺山形鋼', '不等辺不等厚山形鋼'] },
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
    var kgmDisp = document.getElementById('cmdKgm');
    if (kgmDisp) kgmDisp.textContent = '';
    dd.style.display = 'none';
    return;
  }

  var all = cmdBuildAll();
  if (!all.length) {
    ensureSteelCatalogReady();
    all = cmdBuildAll();
  }
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
    var empty = document.createElement('div');
    empty.style.padding = '12px';
    empty.style.fontSize = '12px';
    empty.style.color = '#aaa';
    empty.style.textAlign = 'center';
    empty.textContent = '見つかりません';
    dd.appendChild(empty);
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
    var spec = document.createElement('span');
    spec.textContent = it.spec;
    var kgm = document.createElement('span');
    kgm.className = 'cmd-sub';
    kgm.textContent = it.kgm + ' kg/m';
    row.appendChild(spec);
    row.appendChild(kgm);
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
  getAppSteelRows(curKind).forEach(function(row) {
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
