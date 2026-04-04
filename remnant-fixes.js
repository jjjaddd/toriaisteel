(function() {
  function remnantKey(item) {
    var ids = item && item.ids ? item.ids.slice() : [];
    ids.sort(function(a, b) { return a - b; });
    return String(ids);
  }

  function getAllGroupedInventory() {
    var grouped = {};
    if (typeof getInventory !== 'function') return [];
    getInventory().forEach(function(item) {
      var groupKey = [
        item && item.kind ? item.kind : '',
        item && item.spec ? item.spec : '',
        item && item.len != null ? item.len : '',
        item && item.company ? item.company : '',
        item && item.note ? item.note : '',
        item && item.addedDate ? item.addedDate : ''
      ].join('|');
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          len: item && item.len != null ? item.len : 0,
          spec: item && item.spec ? item.spec : '',
          kind: item && item.kind ? item.kind : '',
          qty: 0,
          date: item && item.addedDate ? item.addedDate : '',
          label: item && item.note ? item.note : '',
          company: item && item.company ? item.company : '',
          ids: []
        };
      }
      grouped[groupKey].qty += 1;
      if (item && item.id != null) grouped[groupKey].ids.push(Number(item.id));
    });
    return Object.values(grouped).map(function(group) {
      group.ids.sort(function(a, b) { return a - b; });
      return group;
    });
  }

  function resetInvButton() {
    var btn = document.getElementById('invUseBtn');
    var sel = document.getElementById('invSelect');
    if (!btn) return;
    btn.classList.remove('added');
    btn.textContent = '\uFF0B \u8FFD\u52A0';
    btn.style.background = '#fff';
    btn.style.color = '#16a34a';
    btn.disabled = !(sel && sel.value);
  }

  updateInventoryUseButton = function(forceReady) {
    var btn = document.getElementById('invUseBtn');
    if (!btn) return;
    if (forceReady) {
      btn.classList.add('added');
      btn.textContent = '\u2713 \u8FFD\u52A0\u6E08\u307F';
      btn.disabled = true;
      return;
    }
    resetInvButton();
  };

  addFromInventory = function() {
    var sel = document.getElementById('invSelect');
    if (!sel || !sel.value || typeof getInventoryForCurrentSpec !== 'function') return;
    var chosen = getInventoryForCurrentSpec().find(function(item) {
      return remnantKey(item) === sel.value || String(item.ids || []) === sel.value;
    });
    if (!chosen) {
      resetInvButton();
      return;
    }
    var selected = typeof getSelectedInventoryRemnants === 'function' ? getSelectedInventoryRemnants() : {};
    selected[remnantKey(chosen)] = { qty: 1 };
    if (typeof saveSelectedInventoryRemnants === 'function') {
      saveSelectedInventoryRemnants(selected);
    }
    sel.value = '';
    syncInventoryToRemnants();
    updateInventoryUseButton(true);
  };

  removeRemnant = function(i) {
    var row = document.getElementById('remRow' + i);
    if (!row || row.dataset.source !== 'inventory') {
      if (row) row.remove();
      if (!document.querySelector('#remnantList .rem-row[data-source="inventory"]')) resetInvButton();
      return;
    }
    var selected = typeof getSelectedInventoryRemnants === 'function' ? getSelectedInventoryRemnants() : {};
    delete selected[row.dataset.inventoryKey];
    if (typeof saveSelectedInventoryRemnants === 'function') {
      saveSelectedInventoryRemnants(selected);
    }
    syncInventoryToRemnants();
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
    if (typeof saveSelectedInventoryRemnants === 'function') {
      saveSelectedInventoryRemnants(next);
    }
  };

  syncInventoryToRemnants = function() {
    var list = document.getElementById('remnantList');
    if (!list) return;
    var groupedMap = {};
    getAllGroupedInventory().forEach(function(group) {
      groupedMap[remnantKey(group)] = group;
    });
    var selected = typeof getSelectedInventoryRemnants === 'function' ? getSelectedInventoryRemnants() : {};
    list.innerHTML = '';
    remnantCount = 0;
    Object.keys(selected).forEach(function(key) {
      var item = groupedMap[key];
      if (item && typeof createInventoryRemnantRow === 'function') {
        createInventoryRemnantRow(item, selected[key].qty || 1);
      }
    });
    if (!list.children.length) {
      list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">\u5728\u5EAB\u304B\u3089\u8FFD\u52A0\u3057\u305F\u6B8B\u6750\u304C\u3053\u3053\u306B\u8868\u793A\u3055\u308C\u307E\u3059</div></div>';
      updateInventoryUseButton();
      return;
    }
    var sel = document.getElementById('invSelect');
    if (sel && !sel.value) updateInventoryUseButton(true);
    else updateInventoryUseButton();
  };

  var origOnSpec = typeof onSpec === 'function' ? onSpec : null;
  if (origOnSpec && !onSpec._remnantFixWrapped) {
    onSpec = function() {
      origOnSpec();
      bindRemnantFixes();
      updateInventoryUseButton();
      syncInventoryToRemnants();
    };
    onSpec._remnantFixWrapped = true;
  }

  function bindRemnantFixes() {
    var btn = document.getElementById('invUseBtn');
    var sel = document.getElementById('invSelect');
    if (btn) btn.onclick = addFromInventory;
    if (sel) sel.onchange = function() { updateInventoryUseButton(); };
  }

  function initRemnantFixes() {
    bindRemnantFixes();
    updateInventoryUseButton();
    syncInventoryToRemnants();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initRemnantFixes, 30);
    }, { once: true });
  } else {
    setTimeout(initRemnantFixes, 30);
  }
})();
