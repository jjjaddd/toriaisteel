function getSelectedInventoryRemnants() {
  return loadSelectedInventoryRemnantsState();
}

function saveSelectedInventoryRemnants(data) {
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

function buildInventoryDropdown() {
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

function addFromInventory() {
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

function removeRemnant(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;

  var state = getSelectedInventoryRemnants();
  delete state[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(state);
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function saveRemnants() {
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

function syncInventoryToRemnants() {
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

function cleanCartChrome() {
  var cartTitle = document.querySelector('#cartModal .cart-modal-hd span[style*="font-size:15px"]');
  if (cartTitle) cartTitle.textContent = '印刷カート';

  var printBtn = document.querySelector('#cartModal button[onclick="cartDoPrint()"]');
  if (printBtn) printBtn.textContent = 'まとめて印刷';

  var closeBtn = document.querySelector('#cartModal button[onclick="closeCartModal()"]');
  if (closeBtn) closeBtn.textContent = '閉じる';

  var clearBtn = document.querySelector('#cartModal button[onclick="cartClearAll()"]');
  if (clearBtn) clearBtn.textContent = '全クリア';
}

(function initializeFinalOverrides() {
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
    cleanCartChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
