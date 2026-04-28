function getSelectedInventoryRemnants() {
  try {
    var parsed = JSON.parse(localStorage.getItem(INVENTORY_REMNANT_SELECTED_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var i = remnantCount++;
  var row = document.createElement('div');
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var options = '';
  for (var q = 1; q <= (item.qty || 1); q++) {
    options += '<option value="' + q + '"' + (q === usage ? ' selected' : '') + '>' + q + '本</option>';
  }
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = String(item.ids || []);
  row.dataset.inventoryIds = JSON.stringify(item.ids || []);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group"><span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span><span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span></div>' +
    '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '<div class="rem-meta">今回使う本数 / ' + escapeHtml(item.company || item.label || '在庫から選択') + '</div>' +
    '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
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

