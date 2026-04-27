
// ── 定尺チップ（鋼種ごと・ユーザー編集可能） ─────────────────
// ── 定尺管理: 規格（種類×サイズ）ごとに独立 ─────────────────────

function _stdKey(kind, spec) {
  return 'dp_std_' + kind + '_' + (spec || '');
}

function _stdKeyCandidates(kind, spec) {
  var dataKind = getDataKindByCalcName(kind);
  var keys = [_stdKey(kind, spec)];
  var canonicalKey = _stdKey(dataKind, spec);
  if (keys.indexOf(canonicalKey) === -1) keys.push(canonicalKey);
  var calcKind = getCalcKindName(dataKind);
  var calcKey = _stdKey(calcKind, spec);
  if (keys.indexOf(calcKey) === -1) keys.push(calcKey);
  return keys;
}

function _getKindExcludeList(kind) {
  var dataKind = getDataKindByCalcName(kind);
  var entry = STEEL_DB[dataKind] || {};
  if (entry.defaultStockPolicy && Array.isArray(entry.defaultStockPolicy.exclude)) {
    return entry.defaultStockPolicy.exclude.slice();
  }
  var policy = (DEFAULT_STOCK_DB.byKind || {})[dataKind];
  if (policy && Array.isArray(policy.exclude)) return policy.exclude.slice();
  return [];
}

function getKindSTD(kind, spec) {
  var dataKind = getDataKindByCalcName(kind);
  var excludes = _getKindExcludeList(kind);
  var keys = _stdKeyCandidates(kind, spec);
  var storageApi = window.Toriai && window.Toriai.storage && window.Toriai.storage.localStore;
  for (var i = 0; i < keys.length; i++) {
    try {
      var stored = storageApi && typeof storageApi.readText === 'function'
        ? storageApi.readText(keys[i], null)
        : localStorage.getItem(keys[i]);
      if (stored) {
        var arr = JSON.parse(stored);
        if (Array.isArray(arr) && excludes.length) {
          var filtered = arr.filter(function(l) { return excludes.indexOf(l) === -1; });
          if (filtered.length !== arr.length) {
            try {
              keys.forEach(function(k) {
                if (storageApi && typeof storageApi.writeJson === 'function') storageApi.writeJson(k, filtered);
                else localStorage.setItem(k, JSON.stringify(filtered));
              });
            } catch(e) {}
            return filtered;
          }
        }
        return arr;
      }
    } catch(e) {}
  }
  return getDefaultStockLengths(dataKind, spec);
}

function saveKindSTD(kind, lengths, spec) {
  var storageApi = window.Toriai && window.Toriai.storage && window.Toriai.storage.localStore;
  _stdKeyCandidates(kind, spec).forEach(function(key) {
    try {
      if (storageApi && typeof storageApi.writeJson === 'function') storageApi.writeJson(key, lengths);
      else localStorage.setItem(key, JSON.stringify(lengths));
    } catch(e) {}
  });
  if (typeof rebuildStkList === 'function') rebuildStkList();
  if (typeof onSpec === 'function') onSpec();
}

var _dtStdBulkMode = false;

function dpStdToggleBulk(on) {
  _dtStdBulkMode = !!on;
  var area = document.getElementById('dtStdArea');
  if (area) area.classList.toggle('is-bulk', _dtStdBulkMode);
  var meta = document.getElementById('dtStdMeta');
  if (meta) {
    meta.textContent = _dtStdBulkMode ? 'この鋼種の全規格に反映' : 'JIS標準 + 工場長尺';
  }
}

function _dtKindSpecNames(kind) {
  var dataKind = (typeof getDataKindByCalcName === 'function') ? getDataKindByCalcName(kind) : kind;
  var entry = SECTION_DATA[dataKind];
  if (!entry || !Array.isArray(entry.specs)) return [];
  return entry.specs.map(function(s) { return s.name; });
}

function renderDataStdChips(kind, spec) {
  var area  = document.getElementById('dtStdArea');
  var chips = document.getElementById('dtStdChips');
  if (!area || !chips) return;
  if (!spec) { area.style.display = 'none'; return; }
  var lengths = getKindSTD(kind, spec);
  area.style.display = 'block';
  area.classList.toggle('is-bulk', !!_dtStdBulkMode);
  var bulkCb = document.getElementById('dtStdBulkCb');
  if (bulkCb) bulkCb.checked = !!_dtStdBulkMode;
  var ke = kind.replace(/'/g, "\\'");
  var se = spec.replace(/'/g, "\\'");
  var chipsHtml = lengths.map(function(len) {
    var val, unit;
    if (len >= 1000) { val = (len / 1000); unit = 'm'; }
    else             { val = len;            unit = 'mm'; }
    return '<span class="stock-chip">' +
      val + '<span class="unit">' + unit + '</span>' +
      '<button class="stock-x" title="削除" onclick="dpStdRemove(\'' + ke + '\',\'' + se + '\',' + len + ')">×</button>' +
      '</span>';
  }).join('');
  chips.innerHTML = chipsHtml +
    '<span class="stock-add">' +
      '<input id="dpStdInput" type="number" placeholder="mm" min="500" step="500">' +
      '<button onclick="dpStdAdd(\'' + ke + '\',\'' + se + '\')">+ 追加</button>' +
    '</span>';
}

function dpStdRemove(kind, spec, len) {
  if (_dtStdBulkMode) {
    var names = _dtKindSpecNames(kind);
    if (!names.length) names = [spec];
    var ok = confirm('この鋼種のすべての規格（' + names.length + '件）から ' +
                     (len >= 1000 ? (len / 1000) + 'm' : len + 'mm') +
                     ' を削除しますか？');
    if (!ok) return;
    var excludes = _getKindExcludeList(kind);
    names.forEach(function(s) {
      var cur = getKindSTD(kind, s).filter(function(l) { return l !== len; });
      if (excludes.length) cur = cur.filter(function(l) { return excludes.indexOf(l) === -1; });
      saveKindSTD(kind, cur, s);
    });
    renderDataStdChips(kind, spec);
    return;
  }
  var lengths = getKindSTD(kind, spec).filter(function(l) { return l !== len; });
  saveKindSTD(kind, lengths, spec);
  renderDataStdChips(kind, spec);
}

function dpStdAdd(kind, spec) {
  var input = document.getElementById('dpStdInput');
  if (!input) return;
  var len = parseInt(input.value);
  if (!len || len < 500) { alert('500mm以上の数値を入力してください'); return; }
  if (_dtStdBulkMode) {
    var names = _dtKindSpecNames(kind);
    if (!names.length) names = [spec];
    var ok = confirm('この鋼種のすべての規格（' + names.length + '件）に ' +
                     (len >= 1000 ? (len / 1000) + 'm' : len + 'mm') +
                     ' を追加しますか？');
    if (!ok) { input.value = ''; return; }
    names.forEach(function(s) {
      var cur = getKindSTD(kind, s);
      if (cur.indexOf(len) === -1) {
        cur.push(len);
        cur.sort(function(a, b) { return a - b; });
        saveKindSTD(kind, cur, s);
      }
    });
    input.value = '';
    renderDataStdChips(kind, spec);
    return;
  }
  var lengths = getKindSTD(kind, spec);
  if (lengths.indexOf(len) === -1) {
    lengths.push(len);
    lengths.sort(function(a, b) { return a - b; });
    saveKindSTD(kind, lengths, spec);
    renderDataStdChips(kind, spec);
  }
  input.value = '';
}
