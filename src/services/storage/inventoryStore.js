// 残材在庫 DB と関連 CRUD / 消費ロジック

// 旧キー（kind+spec ごと）— LS_INV_PREFIX 経由でアクセス
function setInventory(kind, spec, items) {
  try { localStorage.setItem(invKey(kind, spec), JSON.stringify(items)); } catch(e) {}
}

function addToInventory(kind, spec, len, qty, label) {
  var items = getInventory(kind, spec);
  var date  = new Date().toLocaleDateString('ja-JP');
  var found = items.find(function(it){ return it.len===len && it.date===date && it.label===(label||''); });
  if (found) { found.qty += qty; }
  else { items.push({len:len, qty:qty, date:date, label:label||'', id: Date.now()+Math.random()}); }
  items.sort(function(a,b){ return b.len-a.len; });
  setInventory(kind, spec, items);
}

function consumeInventory(kind, spec, lenArr) {
  var items = getInventory(kind, spec);
  lenArr.forEach(function(len) {
    for (var i=0; i<items.length; i++) {
      if (items[i].len===len && items[i].qty>0) {
        items[i].qty--;
        if (items[i].qty<=0) items.splice(i,1);
        return;
      }
    }
  });
  setInventory(kind, spec, items);
}

function getAllInventory() {
  var result = [];
  try {
    for (var i=0; i<localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(LS_INV_PREFIX)!==0) continue;
      var items = JSON.parse(localStorage.getItem(k)||'[]');
      items.forEach(function(it){ result.push(Object.assign({},it,{_key:k})); });
    }
  } catch(e) {}
  return result;
}

function getInventoryForCurrentSpec() {
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var kind = curKind;
  var inv = getInventory();
  var filtered = inv.filter(function(x){ return x.spec===spec || x.kind===kind; });
  var grouped = {};
  filtered.forEach(function(x){
    var key = x.len + ':' + x.spec;
    if (!grouped[key]) grouped[key] = {len:x.len, spec:x.spec, kind:x.kind, qty:0, date:x.addedDate||'', label:x.note||''};
    grouped[key].qty++;
  });
  return Object.values(grouped).sort(function(a,b){return b.len-a.len;});
}

// 新形式（フラット配列、`so_inventory_v2`）
function getInventoryDomainService() {
  return window.Toriai && window.Toriai.inventory ? window.Toriai.inventory.service : null;
}

function getOrgStorageApi() {
  var ns = window.Toriai || {};
  if (!ns.orgStorage || !ns.org || typeof ns.org.getActiveOrgId !== 'function') return null;
  return ns.org.getActiveOrgId() ? ns.orgStorage : null;
}

function toOrgInventoryRows(items) {
  return (items || []).map(function(item) {
    var length = item && item.length_mm != null ? item.length_mm : item && item.len;
    return {
      spec: item && item.spec ? item.spec : null,
      kind: item && item.kind ? item.kind : null,
      length_mm: Number(length) || 0,
      qty: item && item.qty != null ? Number(item.qty) || 0 : 1,
      note: item && (item.note || item.label || item.company) ? (item.note || item.label || item.company) : '',
      project_id: item && item.project_id ? item.project_id : null
    };
  }).filter(function(item) {
    return item.length_mm > 0 && item.qty > 0;
  });
}

function getInventory() {
  try {
    var r = localStorage.getItem(LS_INVENTORY);
    var list = r ? JSON.parse(r) : [];
    var service = getInventoryDomainService();
    return service && service.filterRecordsForCurrentScope ? service.filterRecordsForCurrentScope(list) : list;
  } catch(e){return [];}
}

function saveInventory(inv) {
  try {
    var service = getInventoryDomainService();
    var scoped = service && service.normalizeInventoryRecord
      ? (inv || []).map(function(item) { return service.normalizeInventoryRecord(item); })
      : inv;
    var persistList = scoped;
    if (service && service.belongsToScope) {
      var raw = localStorage.getItem(LS_INVENTORY);
      var existing = raw ? JSON.parse(raw) : [];
      var outOfScope = existing.filter(function(item) { return !service.belongsToScope(item); });
      persistList = outOfScope.concat(scoped);
    }
    localStorage.setItem(LS_INVENTORY, JSON.stringify(persistList));
    var orgStorage = getOrgStorageApi();
    if (orgStorage && typeof orgStorage.saveInventory === 'function') {
      orgStorage.saveInventory(toOrgInventoryRows(scoped));
    }
  } catch(e) {}
}

// 残材を在庫に登録（計算後ボタン）
function registerRemnants(rems) {
  var inv = getInventory();
  var fallbackJob = typeof getJobInfo === 'function' ? getJobInfo() : {};
  rems.forEach(function(r) {
    var qty = Math.max(1, parseInt(r && r.qty, 10) || 1);
    var job = r && r.job ? r.job : fallbackJob;
    for (var i = 0; i < qty; i++) {
      inv.push({
        id: Date.now() + Math.random(),
        len: r.len,
        spec: r.spec,
        kind: r.kind,
        company: job.client,
        note: job.memo || '',
        addedDate: new Date().toLocaleDateString('ja-JP')
      });
    }
  });
  saveInventory(inv);
  syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
}

function consumeInventoryBars(bars, meta) {
  var context = buildResultMeta({ meta: meta || {} });
  var inv = getInventory().slice();
  var lengths = [];
  var selected = Array.isArray(context.selectedInventoryRemnants) ? context.selectedInventoryRemnants : [];
  var selectedByLen = {};

  (bars || []).forEach(function(bar) {
    var sl = parseInt(bar && bar.sl, 10) || 0;
    if (!sl) return;
    lengths.push(sl);
  });

  selected.forEach(function(sel) {
    var len = parseInt(sel && sel.len, 10) || 0;
    var qty = Math.max(0, parseInt(sel && sel.qty, 10) || 0);
    if (!len || !qty) return;
    selectedByLen[len] = (selectedByLen[len] || 0) + qty;
  });

  var filteredLengths = lengths.filter(function(len) {
    if (selectedByLen[len] > 0) {
      selectedByLen[len]--;
      return true;
    }
    if (typeof isStdStockLength === 'function' && isStdStockLength(len)) return false;
    return true;
  });

  if (!filteredLengths.length) return [];

  var consumed = [];
  var remainingByLen = {};
  filteredLengths.forEach(function(len) {
    remainingByLen[len] = (remainingByLen[len] || 0) + 1;
  });
  selected.forEach(function(sel) {
    var len = parseInt(sel && sel.len, 10) || 0;
    var need = Math.min(remainingByLen[len] || 0, Math.max(0, parseInt(sel && sel.qty, 10) || 0));
    if (!len || !need) return;
    var ids = (sel.ids || []).map(function(id) { return String(id); });
    for (var i = 0; i < ids.length && need > 0; i++) {
      var idx = inv.findIndex(function(item) {
        return String(item && item.id) === ids[i];
      });
      if (idx < 0) continue;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      need--;
      remainingByLen[len] = Math.max(0, (remainingByLen[len] || 0) - 1);
    }
  });

  lengths.forEach(function(len) {
    if (!(remainingByLen[len] > 0)) return;
    var idx = inv.findIndex(function(item) {
      return Number(item && item.len) === len &&
        (!context.spec || item.spec === context.spec) &&
        (!context.kind || item.kind === context.kind);
    });
    if (idx < 0 && context.spec) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len && item.spec === context.spec;
      });
    }
    if (idx < 0 && context.kind) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len && item.kind === context.kind;
      });
    }
    if (idx < 0) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len;
      });
    }
    if (idx < 0) return;
    consumed.push(inv[idx]);
    inv.splice(idx, 1);
    remainingByLen[len] = Math.max(0, (remainingByLen[len] || 0) - 1);
  });

  if (!consumed.length) return [];

  saveInventory(inv);
  if (typeof syncInventoryToRemnants === 'function') syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
  return consumed;
}

function consumeSelectedInventoryRemnants(selectedItems) {
  var items = Array.isArray(selectedItems) ? selectedItems : [];
  if (!items.length) return [];

  var inv = getInventory().slice();
  var consumed = [];

  items.forEach(function(sel) {
    var qty = Math.max(0, parseInt(sel && sel.qty, 10) || 0);
    if (!qty) return;

    var ids = Array.isArray(sel && sel.ids)
      ? sel.ids.map(function(id) { return String(id); })
      : [];
    var remaining = qty;

    ids.forEach(function(id) {
      if (remaining <= 0) return;
      var idx = inv.findIndex(function(item) {
        return String(item && item.id) === id;
      });
      if (idx < 0) return;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      remaining--;
    });

    if (remaining <= 0) return;

    var len = parseInt(sel && sel.len, 10) || 0;
    var spec = sel && sel.spec ? sel.spec : '';
    var kind = sel && sel.kind ? sel.kind : '';

    while (remaining > 0) {
      var idx = inv.findIndex(function(item) {
        return (!len || Number(item && item.len) === len) &&
          (!spec || item.spec === spec) &&
          (!kind || item.kind === kind);
      });
      if (idx < 0 && len) {
        idx = inv.findIndex(function(item) {
          return Number(item && item.len) === len;
        });
      }
      if (idx < 0) break;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      remaining--;
    }
  });

  if (!consumed.length) return [];

  saveInventory(inv);
  if (typeof syncInventoryToRemnants === 'function') syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
  return consumed;
}

function addInventoryItem() {
  var spec = prompt('規格（例：H-200×100）');
  if (!spec) return;
  var len = parseInt(prompt('長さ (mm)'));
  if (!len || len <= 0) return;
  var inv = getInventory();
  inv.push({ id: Date.now(), len: len, spec: spec, kind: '', addedDate: new Date().toLocaleDateString('ja-JP'), note: '' });
  saveInventory(inv);
  renderInventory();
}

function deleteInventoryItem(id) {
  if (!confirm('この在庫を削除しますか？')) return;
  var inv = getInventory().filter(function(x){ return x.id !== id; });
  saveInventory(inv);
  renderInventoryPage();
  syncInventoryToRemnants();
  updateInvDropdown();
}

function clearInventory() {
  if (!confirm('在庫を全削除しますか？')) return;
  saveInventory([]);
  renderInventory();
  syncInventoryToRemnants();
}
