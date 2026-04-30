function wCmdBuildAll() {
  _wCmdAll = [];
  _wEnsureCatalogReady().forEach(function(kind) {
    _wRowsByKind(kind).forEach(function(row) {
      var entry = window.Toriai && window.Toriai.data && window.Toriai.data.steel && window.Toriai.data.steel.getSectionData
        ? window.Toriai.data.steel.getSectionData(kind)
        : null;
      _wCmdAll.push({ kind: kind, spec: row[0], kgm: row[1], label: (entry && entry.label ? entry.label : kind) + ' ' + row[0] });
    });
  });
}

function wCmdHover(el) {
  var dd = document.getElementById('wCmdDropdown');
  if (dd) dd.querySelectorAll('.cmd-item').forEach(function(e) { e.classList.remove('cmd-focus'); });
  if (el) el.classList.add('cmd-focus');
}

function wCmdActivate(el) {
  if (!el) return;
  el.focus();
  if (typeof el.select === 'function') el.select();
  if (el.value && el.value.trim()) {
    wCmdFilter();
  } else {
    wCmdOpenBrowse();
  }
}

function wCmdOpenBrowse() {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd) return;
  var kinds = _wEnsureCatalogReady();
  dd.replaceChildren();
  if (!kinds.length) {
    var loading = document.createElement('div');
    loading.style.padding = '12px';
    loading.style.fontSize = '12px';
    loading.style.color = '#aaa';
    loading.style.textAlign = 'center';
    loading.textContent = '鋼材データを読み込み中です';
    dd.appendChild(loading);
    dd.style.display = 'block';
    _wCmdIdx = -1;
    document.addEventListener('click', wCmdOutside);
    return;
  }
  kinds.forEach(function(kind) {
    var row = document.createElement('div');
    row.className = 'cmd-item cmd-cat-link';
    row.onmouseover = function(){ wCmdHover(row); };
    row.onmousedown = function(event){
      event.preventDefault();
      wCmdShowKind(kind);
    };
    var label = document.createElement('span');
    label.textContent = kind;
    var arrow = document.createElement('span');
    arrow.className = 'cmd-sub';
    arrow.textContent = '▶';
    row.appendChild(label);
    row.appendChild(arrow);
    dd.appendChild(row);
  });
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

function wCmdShowKind(kind) {
  var dd   = document.getElementById('wCmdDropdown');
  var list = _wRowsByKind(kind);
  if (!dd) return;
  dd.replaceChildren();
  var back = document.createElement('div');
  back.className = 'cmd-cat';
  back.style.cursor = 'pointer';
  back.style.color = '#aaa';
  back.style.display = 'flex';
  back.style.alignItems = 'center';
  back.style.gap = '4px';
  back.onmousedown = function(event){
    event.preventDefault();
    wCmdOpenBrowse();
  };
  back.appendChild(document.createTextNode('◀ 戻る '));
  var strong = document.createElement('strong');
  strong.style.color = '#5a5a78';
  strong.textContent = kind;
  back.appendChild(strong);
  dd.appendChild(back);
  list.forEach(function(row) {
    var it = { kind: kind, spec: row[0], kgm: row[1] };
    var item = document.createElement('div');
    item.className = 'cmd-item';
    item.onmouseover = function(){ wCmdHover(item); };
    item.onmousedown = function(event){
      event.preventDefault();
      wCmdSelect(it);
    };
    var spec = document.createElement('span');
    spec.textContent = row[0];
    var kgm = document.createElement('span');
    kgm.style.color = '#aaa';
    kgm.style.fontSize = '10px';
    kgm.textContent = row[1] + ' kg/m';
    item.appendChild(spec);
    item.appendChild(kgm);
    dd.appendChild(item);
  });
  dd.style.display = 'block';
  _wCmdIdx = -1;
}

var W_PREFIX_MAP = [
  { prefix: 'sgp', kinds: ['SGP配管'] },
  { prefix: 'pipe', kinds: ['SGP配管'] },
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'sb', kinds: ['角鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['山形鋼', '不等辺山形鋼', '不等辺不等厚山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] },
  { prefix: 'p',  kinds: ['角パイプ', 'スモール角パイプ'] },
  { prefix: '[',  kinds: ['軽量溝形鋼'] },
  { prefix: 'c',  kinds: ['C形鋼'] }
];

function wCmdFilter() {
  var input = document.getElementById('wCmdInput');
  var dd    = document.getElementById('wCmdDropdown');
  if (!input || !dd) return;
  var q = input.value.trim().toLowerCase();
  if (!q) {
    var kgmDisp = document.getElementById('wCmdKgm');
    if (kgmDisp) kgmDisp.textContent = '';
    dd.style.display = 'none';
    return;
  }
  var kindFilter = null;
  for (var pi = 0; pi < W_PREFIX_MAP.length; pi++) {
    var pm = W_PREFIX_MAP[pi];
    if (q.indexOf(pm.prefix) === 0) { kindFilter = pm.kinds; break; }
  }
  var filtered;
  if (!_wCmdAll.length) wCmdBuildAll();
  if (kindFilter) {
    filtered = _wCmdAll.filter(function(it) {
      if (kindFilter.indexOf(it.kind) < 0) return false;
      return typeof steelSpecMatchesQuery === 'function'
        ? steelSpecMatchesQuery(q, it)
        : (it.spec.toLowerCase().indexOf(q) >= 0 ||
           it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0);
    });
  } else {
    filtered = _wCmdAll.filter(function(it) {
      return typeof steelSpecMatchesQuery === 'function'
        ? steelSpecMatchesQuery(q, it)
        : (it.label.toLowerCase().indexOf(q) >= 0 ||
           it.spec.toLowerCase().indexOf(q)  >= 0 ||
           it.spec.replace(/[^0-9]/g,'').indexOf(q.replace(/[^0-9]/g,'')) >= 0);
    });
  }
  if (typeof compareSteelSearchResults === 'function') {
    filtered.sort(function(a, b) { return compareSteelSearchResults(q, a, b); });
  }
  dd.replaceChildren();
  if (filtered.length === 0) {
    var empty = document.createElement('div');
    empty.style.padding = '12px';
    empty.style.fontSize = '12px';
    empty.style.color = '#aaa';
    empty.style.textAlign = 'center';
    empty.textContent = '見つかりません';
    dd.appendChild(empty);
    dd.style.display = 'block';
    _wCmdIdx = -1;
    document.addEventListener('click', wCmdOutside);
    return;
  }
  var grouped = {};
  filtered.forEach(function(it) {
    if (!grouped[it.kind]) grouped[it.kind] = [];
    grouped[it.kind].push(it);
  });
  Object.keys(grouped).forEach(function(kind) {
    var header = document.createElement('div');
    header.className = 'cmd-cat';
    header.textContent = kind;
    dd.appendChild(header);
    grouped[kind].forEach(function(it) {
      var item = document.createElement('div');
      item.className = 'cmd-item';
      item.onmouseover = function(){ wCmdHover(item); };
      item.onmousedown = function(event){
        event.preventDefault();
        wCmdSelect(it);
      };
      var spec = document.createElement('span');
      spec.textContent = it.spec;
      var kgm = document.createElement('span');
      kgm.style.color = '#aaa';
      kgm.style.fontSize = '10px';
      kgm.textContent = it.kgm + ' kg/m';
      item.appendChild(spec);
      item.appendChild(kgm);
      dd.appendChild(item);
    });
  });
  dd.style.display = 'block';
  _wCmdIdx = -1;
  document.addEventListener('click', wCmdOutside);
}

function wCmdSelect(it) {
  var kindEl   = document.getElementById('wKind');
  var specEl   = document.getElementById('wSpec');
  var kgmEl    = document.getElementById('wKgm');
  var kgmDisp  = document.getElementById('wCmdKgm');
  var kgmValEl = document.getElementById('wKgmVal');
  var input    = document.getElementById('wCmdInput');
  var dd       = document.getElementById('wCmdDropdown');
  if (kindEl) kindEl.value = it.kind;
  wOnKind();
  if (specEl)   specEl.value        = it.spec;
  if (kgmEl)    kgmEl.value         = String(it.kgm);
  if (kgmValEl) kgmValEl.textContent = it.kgm + ' kg/m';
  if (input)    input.value         = it.kind + '　' + it.spec;
  if (kgmDisp)  kgmDisp.textContent = (input && (input.value || '').trim()) ? (it.kgm + ' kg/m') : '';
  if (dd)       dd.style.display    = 'none';
  _wCmdIdx = -1;
  document.removeEventListener('click', wCmdOutside);
  if (typeof showRemnantAlert === 'function') showRemnantAlert(it.kind, it.spec);
  setTimeout(function() {
    var lenEl = document.getElementById('wLen');
    if (lenEl) { lenEl.focus(); lenEl.select(); }
  }, 0);
  wPreview();
}

function wCmdOutside(e) {
  var wrap = document.getElementById('wCmdWrap');
  if (wrap && !wrap.contains(e.target)) {
    var dd = document.getElementById('wCmdDropdown');
    if (dd) dd.style.display = 'none';
    document.removeEventListener('click', wCmdOutside);
  }
}

function wCmdKey(e) {
  var dd = document.getElementById('wCmdDropdown');
  if (!dd || dd.style.display === 'none') return;
  var items = dd.querySelectorAll('.cmd-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _wCmdIdx = Math.min(_wCmdIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _wCmdIdx = Math.max(_wCmdIdx - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    var target = _wCmdIdx >= 0 ? items[_wCmdIdx] : (items.length === 1 ? items[0] : null);
    if (target) { target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }
    return;
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
    _wCmdIdx = -1;
    return;
  } else { return; }
  items.forEach(function(el) { el.classList.remove('cmd-focus'); });
  if (_wCmdIdx >= 0) {
    items[_wCmdIdx].classList.add('cmd-focus');
    items[_wCmdIdx].scrollIntoView({ block: 'nearest' });
  }
}

// 最新版の印刷処理
