(function(global) {
  'use strict';

  var ns = global.Toriai.ui.inventory = global.Toriai.ui.inventory || {};

  ns.getSelectedInventoryRemnants = function getSelectedInventoryRemnants() {
    return global.loadSelectedInventoryRemnantsState();
  };

  ns.saveSelectedInventoryRemnants = function saveSelectedInventoryRemnants(data) {
    global._selectedInventoryRemnantsState = data && typeof data === 'object' ? data : {};
    global.persistSelectedInventoryRemnantsState();
  };

  ns.getSelectedInventoryRemnantDetails = function getSelectedInventoryRemnantDetails() {
    var grouped = typeof global.getInventoryForCurrentSpec === 'function' ? global.getInventoryForCurrentSpec() : [];
    var state = ns.getSelectedInventoryRemnants();
    return Object.keys(state).map(function(key) {
      var item = grouped.find(function(group) {
        return global.getRemnantInventoryKey(group) === key;
      });
      if (!item) return null;
      var qty = Math.max(1, Math.min(item.qty || 1, parseInt((state[key] || {}).qty, 10) || 1));
      return {
        key: key,
        len: parseInt(item.len, 10) || 0,
        qty: qty,
        ids: (item.ids || []).slice(0, qty).map(function(id) { return String(id); }),
        spec: item.spec || '',
        kind: item.kind || '',
        company: item.company || '',
        note: item.note || ''
      };
    }).filter(Boolean);
  };

  ns.updateInventoryUseButton = function updateInventoryUseButton() {
    var btn = document.getElementById('invUseBtn');
    var sel = document.getElementById('invSelect');
    if (!btn) return;
    btn.textContent = '追加';
    btn.disabled = !(sel && sel.value);
  };

  ns.buildInventoryDropdown = function buildInventoryDropdown() {
    var cont = document.getElementById('invDropCont');
    var sel = document.getElementById('invSelect');
    var badge = document.getElementById('invBadge');
    var items = global.getInventoryForCurrentSpec();

    if (cont) cont.style.display = items.length ? 'block' : 'none';
    if (badge) {
      badge.textContent = '在庫 ' + items.reduce(function(sum, item) {
        return sum + (item.qty || 0);
      }, 0) + '本';
    }
    if (!sel) return;

    sel.replaceChildren();
    var first = document.createElement('option');
    first.value = '';
    first.textContent = '在庫から追加する残材を選択';
    sel.appendChild(first);

    items.forEach(function(item) {
      var option = document.createElement('option');
      option.value = global.getRemnantInventoryKey(item);
      option.textContent = Number(item.len || 0).toLocaleString() + 'mm / 在庫' + (item.qty || 0) + '本';
      sel.appendChild(option);
    });
    ns.updateInventoryUseButton();
  };

  ns.addFromInventory = function addFromInventory() {
    var sel = document.getElementById('invSelect');
    if (!sel || !sel.value) return;

    var items = global.getInventoryForCurrentSpec();
    var chosen = items.find(function(item) {
      return global.getRemnantInventoryKey(item) === sel.value;
    });
    if (!chosen) return;

    var state = ns.getSelectedInventoryRemnants();
    var key = global.getRemnantInventoryKey(chosen);
    if (!state[key]) state[key] = { qty: 1 };
    ns.saveSelectedInventoryRemnants(state);

    sel.value = '';
    ns.syncInventoryToRemnants();
    ns.updateInventoryUseButton();
  };

  ns.removeRemnant = function removeRemnant(i) {
    var row = document.getElementById('remRow' + i);
    if (!row) return;

    var state = ns.getSelectedInventoryRemnants();
    delete state[row.dataset.inventoryKey];
    ns.saveSelectedInventoryRemnants(state);
    ns.syncInventoryToRemnants();
    ns.updateInventoryUseButton();
  };

  ns.saveRemnants = function saveRemnants() {
    var state = {};
    document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
      var qtyEl = row.querySelector('.rem-qty');
      var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
      state[row.dataset.inventoryKey] = {
        qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
      };
    });
    ns.saveSelectedInventoryRemnants(state);
  };

  ns.createInventoryRemnantRow = function createInventoryRemnantRow(item, selectedQty) {
    var list = document.getElementById('remnantList');
    if (!list) return null;

    var i = global.remnantCount++;
    var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
    var row = document.createElement('div');
    row.className = 'rem-row';
    row.id = 'remRow' + i;
    row.dataset.source = 'inventory';
    row.dataset.inventoryKey = global.getRemnantInventoryKey(item);
    row.dataset.maxQty = String(item.qty || 1);

    var labelGroup = document.createElement('div');
    labelGroup.className = 'rem-label-group';

    var title = document.createElement('span');
    title.className = 'rem-label-title';
    title.textContent = Number(item.len || 0).toLocaleString() + 'mm';

    var sub = document.createElement('span');
    sub.className = 'rem-label-sub';
    sub.textContent = '在庫 ' + (item.qty || 1) + '本';

    labelGroup.appendChild(title);
    labelGroup.appendChild(sub);

    var qtyGroup = document.createElement('label');
    qtyGroup.className = 'rem-qty-group';
    qtyGroup.setAttribute('for', 'remQty' + i);

    var qtyLabel = document.createElement('span');
    qtyLabel.className = 'rem-qty-label';
    qtyLabel.textContent = '今回使う本数';

    var qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'rem-qty';
    qtyInput.id = 'remQty' + i;
    qtyInput.min = '1';
    qtyInput.max = String(item.qty || 1);
    qtyInput.value = String(usage);
    qtyInput.addEventListener('input', ns.saveRemnants);

    qtyGroup.appendChild(qtyLabel);
    qtyGroup.appendChild(qtyInput);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'rem-del';
    del.setAttribute('aria-label', '削除');
    del.textContent = '×';
    del.addEventListener('click', function() {
      ns.removeRemnant(i);
    });

    row.appendChild(labelGroup);
    row.appendChild(qtyGroup);
    row.appendChild(del);
    list.appendChild(row);
    return row;
  };

  ns.syncInventoryToRemnants = function syncInventoryToRemnants() {
    var list = document.getElementById('remnantList');
    if (!list) return;

    var grouped = global.getInventoryForCurrentSpec();
    var state = ns.getSelectedInventoryRemnants();
    list.replaceChildren();
    global.remnantCount = 0;

    Object.keys(state).forEach(function(key) {
      var item = grouped.find(function(group) {
        return global.getRemnantInventoryKey(group) === key;
      });
      if (item) ns.createInventoryRemnantRow(item, state[key].qty || 1);
    });

    if (!list.children.length) {
      var emptyRow = document.createElement('div');
      emptyRow.className = 'rem-row rem-row-empty';
      var meta = document.createElement('div');
      meta.className = 'rem-meta';
      meta.textContent = '在庫から選択した残材がここに表示されます';
      emptyRow.appendChild(meta);
      list.appendChild(emptyRow);
    }
  };

  ns.getRemnants = function getRemnants() {
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
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
