


// Final remnant UI behavior override. This block must stay at EOF so stale
// duplicated definitions earlier in the file cannot win.


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

function getSelectedInventoryLocalStore() {
  return window.Toriai && window.Toriai.storage ? window.Toriai.storage.localStore : null;
}

function loadSelectedInventoryRemnantsState() {
  if (_selectedInventoryRemnantsState) return _selectedInventoryRemnantsState;
  try {
    var store = getSelectedInventoryLocalStore();
    var parsed = store ? store.readJson(INVENTORY_REMNANT_SELECTED_KEY, {}) : JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
    _selectedInventoryRemnantsState = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    _selectedInventoryRemnantsState = {};
  }
  return _selectedInventoryRemnantsState;
}

function persistSelectedInventoryRemnantsState() {
  try {
    var store = getSelectedInventoryLocalStore();
    if (store) store.writeJson(INVENTORY_REMNANT_SELECTED_KEY, _selectedInventoryRemnantsState || {});
    else localStorage.setItem(INVENTORY_REMNANT_SELECTED_KEY, JSON.stringify(_selectedInventoryRemnantsState || {}));
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


(function applyFinalRemnantUiOverrides() {
  var remnantState = null;

  function stateLoad() {
    if (remnantState) return remnantState;
    try {
      var store = getSelectedInventoryLocalStore();
      var parsed = store ? store.readJson(INVENTORY_REMNANT_SELECTED_KEY, {}) : JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
      remnantState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      remnantState = {};
    }
    return remnantState;
  }

  function stateSave() {
    try {
      var store = getSelectedInventoryLocalStore();
      if (store) store.writeJson(INVENTORY_REMNANT_SELECTED_KEY, remnantState || {});
      else localStorage.setItem(INVENTORY_REMNANT_SELECTED_KEY, JSON.stringify(remnantState || {}));
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
    var cutItems = getCutCartItems();

    var cutList = document.getElementById('cartCutList');
    var cutPrintBtn = document.getElementById('cartCutPrintBtn');
    var cutWeightBtn = document.getElementById('cartCutWeightBtn');
    var cutPdfBtn = document.getElementById('cartCutPdfBtn');
    var cutCopyBtn = document.getElementById('cartCutCopyBtn');
    var countEl = document.getElementById('cartModalCount');
    if (cutList) {
      if (cutItems.length === 0) {
        cutList.innerHTML = '<div class="cart-empty-msg">追加された取り合いはありません</div>';
      } else {
        cutList.innerHTML = cutItems.map(function(item) {
          var d = item.data;
          return '<div class="cart-item" onclick="showCartCutPreview(buildCartCutPrintHtml([getCutCartItems().filter(function(x){ return x.id === \'' + item.id + '\'; })[0]]))">' +
            '<div style="flex:1;min-width:0">' +
              '<div class="cart-item-title">' +
                [d.kind || '', d.spec || ''].filter(Boolean).join('　') +
              '</div>' +
              '<div class="cart-item-sub">' +
                '使う母材: ' + (d.motherSummary || '記載なし') +
              '</div>' +
            '</div>' +
            '<button class="cart-item-del" onclick="event.stopPropagation();cartRemoveItem(\'' + item.id + '\')">✕</button>' +
          '</div>';
        }).join('');
      }
      if (cutPrintBtn) cutPrintBtn.disabled = cutItems.length === 0;
      if (cutWeightBtn) cutWeightBtn.disabled = cutItems.length === 0;
      if (cutPdfBtn) cutPdfBtn.disabled = cutItems.length === 0;
      if (cutCopyBtn) cutCopyBtn.disabled = cutItems.length === 0;
    }
    if (countEl) countEl.textContent = cutItems.length ? ('取り合い ' + cutItems.length + '件') : '';

    updateCartBadge();
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
