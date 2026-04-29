// 残材入力欄（取り合いタブの残材リスト）の保存・読込

function getRemnantsOrgStorageApi() {
  var ns = window.Toriai || {};
  if (!ns.orgStorage || !ns.org || typeof ns.org.getActiveOrgId !== 'function') return null;
  return ns.org.getActiveOrgId() ? ns.orgStorage : null;
}

function toOrgRemnantRows(list) {
  var specEl = document.getElementById('spec');
  var spec = specEl ? specEl.value : '';
  var kind = typeof curKind !== 'undefined' ? curKind : '';
  return (list || []).map(function(item) {
    return {
      spec: spec || null,
      kind: kind || null,
      length_mm: Number(item && (item.length_mm || item.l)) || 0,
      qty: Number(item && (item.qty || item.q)) || 1,
      source_project_id: item && item.source_project_id ? item.source_project_id : null,
      note: item && item.note ? item.note : ''
    };
  }).filter(function(item) {
    return item.length_mm > 0 && item.qty > 0;
  });
}

function saveRemnants() {
  try {
    var list = [];
    for (var i = 0; i < remnantCount; i++) {
      var lEl = document.getElementById('remLen'+i);
      var qEl = document.getElementById('remQty'+i);
      if (!lEl) continue;
      var l = parseInt(lEl.value), q = parseInt(qEl.value)||1;
      if (l > 0) list.push({l:l, q:q});
    }
    if (_localStore && typeof _localStore.writeJson === 'function') _localStore.writeJson(LS_REMNANTS, list);
    else localStorage.setItem(LS_REMNANTS, JSON.stringify(list));
    var orgStorage = getRemnantsOrgStorageApi();
    if (orgStorage && typeof orgStorage.saveRemnants === 'function') {
      orgStorage.saveRemnants(toOrgRemnantRows(list));
    }
  } catch(e) {}
}

function loadRemnants() {
  try {
    var list = _localStore && typeof _localStore.readJson === 'function'
      ? _localStore.readJson(LS_REMNANTS, [])
      : (function() {
          var raw = localStorage.getItem(LS_REMNANTS);
          return raw ? JSON.parse(raw) : [];
        })();
    if (!list.length) return;
    document.getElementById('remnantList').innerHTML = '';
    remnantCount = 0;
    list.forEach(function(item) {
      addRemnant();
      var i = remnantCount - 1;
      document.getElementById('remLen'+i).value = item.l;
      document.getElementById('remQty'+i).value = item.q;
    });
  } catch(e) {}
}
